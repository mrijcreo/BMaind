'use client'

import { useState, useRef } from 'react'

interface UploadedPDF {
  id: string
  name: string
  content: string
  size: number
  uploadedAt: Date
}

interface PDFUploaderProps {
  onPDFUpload: (pdf: UploadedPDF) => void
  compact?: boolean
}

export default function PDFUploader({ onPDFUpload, compact = false }: PDFUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Enhanced file size limits for Netlify Functions
  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB - safe limit for Netlify Functions
  const RECOMMENDED_SIZE = 2 * 1024 * 1024 // 2MB - recommended limit

  const validateFileSize = (file: File): { valid: boolean, message?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `Te groot (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 4MB voor Netlify deployment.`
      }
    }
    
    if (file.size > RECOMMENDED_SIZE) {
      return {
        valid: true,
        message: `Groot bestand (${(file.size / 1024 / 1024).toFixed(1)}MB). Upload kan langzaam zijn.`
      }
    }
    
    return { valid: true }
  }

  const handleMultipleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const pdfFiles = fileArray.filter(file => file.name.toLowerCase().endsWith('.pdf'))
    
    if (pdfFiles.length === 0) {
      setUploadStatus('❌ Geen PDF bestanden gevonden')
      setTimeout(() => setUploadStatus(''), 3000)
      return
    }

    if (pdfFiles.length !== fileArray.length) {
      setUploadStatus(`⚠️ ${fileArray.length - pdfFiles.length} niet-PDF bestand(en) genegeerd`)
    }

    // Enhanced file validation
    const oversizedFiles = []
    const warningFiles = []
    
    for (const file of pdfFiles) {
      const validation = validateFileSize(file)
      if (!validation.valid) {
        oversizedFiles.push({ file, message: validation.message })
      } else if (validation.message) {
        warningFiles.push({ file, message: validation.message })
      }
    }

    if (oversizedFiles.length > 0) {
      const errorMessages = oversizedFiles.map(item => `${item.file.name}: ${item.message}`).join('\n')
      setUploadStatus(`❌ ${oversizedFiles.length} bestand(en) te groot:\n${errorMessages}`)
      setTimeout(() => setUploadStatus(''), 10000)
      return
    }

    if (warningFiles.length > 0) {
      const warningMessages = warningFiles.map(item => `${item.file.name}: ${item.message}`).join('\n')
      setUploadStatus(`⚠️ Waarschuwing:\n${warningMessages}`)
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: pdfFiles.length })
    setUploadStatus(`📄 ${pdfFiles.length} PDF bestanden worden verwerkt...`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i]
      setUploadProgress({ current: i + 1, total: pdfFiles.length })
      setUploadStatus(`📄 Verwerkt ${file.name} (${i + 1}/${pdfFiles.length})...`)

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Enhanced error handling with timeout and better error detection
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout for large files

        console.log(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`)

        const response = await fetch('/api/upload-docx', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        let data
        const contentType = response.headers.get('content-type')
        
        if (!response.ok) {
          // Enhanced error handling for different HTTP status codes
          if (response.status === 413) {
            throw new Error(`Bestand te groot voor server (${(file.size / 1024 / 1024).toFixed(1)}MB). Probeer een kleiner bestand.`)
          } else if (response.status === 504) {
            throw new Error('Server timeout - bestand te complex om te verwerken')
          } else if (response.status === 500) {
            throw new Error('Server error - mogelijk corrupt PDF of onleesbaar formaat')
          }
          
          // Handle non-JSON error responses
          if (contentType && contentType.includes('application/json')) {
            try {
              data = await response.json()
              throw new Error(data.error || `HTTP ${response.status}`)
            } catch (jsonError) {
              const textResponse = await response.text()
              if (textResponse.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
                throw new Error(`Bestand te groot voor Netlify Functions (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 4MB.`)
              }
              throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 100)}`)
            }
          } else {
            const textResponse = await response.text()
            if (textResponse.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
              throw new Error(`Bestand te groot voor Netlify Functions (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 4MB.`)
            }
            throw new Error(`Server error (${response.status}): ${textResponse.substring(0, 100)}`)
          }
        }

        // Parse successful response
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          throw new Error('Server returned non-JSON response')
        }

        // Validate response data
        if (!data.content || typeof data.content !== 'string') {
          throw new Error('Invalid response: missing or invalid content')
        }

        if (data.content.trim().length < 10) {
          throw new Error('PDF lijkt leeg te zijn of bevat geen leesbare tekst')
        }
        
        const uploadedPDF: UploadedPDF = {
          id: generateId(),
          name: file.name,
          content: data.content,
          size: file.size,
          uploadedAt: new Date()
        }

        onPDFUpload(uploadedPDF)
        successCount++
        console.log(`✅ Successfully uploaded ${file.name}`)

      } catch (error: any) {
        console.error(`PDF upload error for ${file.name}:`, error)
        errorCount++
        
        // Enhanced error messages with specific solutions
        let errorMessage = 'Onbekende fout'
        
        if (error.name === 'AbortError') {
          errorMessage = 'Upload timeout (>45s) - probeer een kleiner bestand'
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Netwerkfout - controleer internetverbinding'
        } else if (error.message.includes('FUNCTION_PAYLOAD_TOO_LARGE') || error.message.includes('te groot voor Netlify')) {
          errorMessage = `Te groot voor Netlify (${(file.size / 1024 / 1024).toFixed(1)}MB) - splits PDF of comprimeer`
        } else if (error.message.includes('413')) {
          errorMessage = `Te groot (${(file.size / 1024 / 1024).toFixed(1)}MB) - maximum 4MB`
        } else if (error.message.includes('504')) {
          errorMessage = 'Timeout - PDF te complex, probeer een eenvoudiger bestand'
        } else if (error.message.includes('500')) {
          errorMessage = 'PDF corrupt of beveiligd - probeer een ander bestand'
        } else if (error.message.includes('PDF verwerking')) {
          errorMessage = 'PDF kan niet worden gelezen (mogelijk beveiligd/beschadigd)'
        } else if (error.message.includes('Server error')) {
          errorMessage = error.message
        } else if (error.message.includes('Invalid response')) {
          errorMessage = 'Server response ongeldig'
        } else {
          errorMessage = error.message || 'Onbekende fout'
        }
        
        errors.push(`${file.name}: ${errorMessage}`)
      }
    }

    // Final status with detailed feedback and solutions
    if (errorCount === 0) {
      setUploadStatus(`✅ Alle ${successCount} PDF bestanden succesvol geüpload!`)
    } else if (successCount > 0) {
      setUploadStatus(`⚠️ ${successCount} succesvol, ${errorCount} gefaald. Voor grote bestanden: splits PDF of gebruik kleinere bestanden.`)
    } else {
      setUploadStatus(`❌ Alle uploads gefaald. ${errors[0] || 'Onbekende fout'}\n\n💡 Tips: Gebruik PDF's < 4MB, splits grote bestanden, of comprimeer PDF's.`)
    }

    setTimeout(() => {
      setUploadStatus('')
      setUploadProgress(null)
    }, 12000) // Longer display time for error messages with solutions
    setIsUploading(false)
  }

  const handleFileUpload = async (file: File) => {
    await handleMultipleFileUpload([file])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleMultipleFileUpload(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleMultipleFileUpload(files)
    }
    // Reset input
    e.target.value = ''
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full px-3 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          style={{backgroundColor: '#233975'}}
        >
          {isUploading ? '⏳ Uploaden...' : '📄 + PDF(s) toevoegen'}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        
        {uploadStatus && (
          <div className="text-xs text-center text-gray-600 whitespace-pre-line">
            {uploadStatus}
          </div>
        )}

        {uploadProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                backgroundColor: '#233975'
              }}
            ></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'bg-blue-50'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
        style={isDragOver ? {borderColor: '#233975', backgroundColor: '#f8f9ff'} : {}}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#f8f9ff'}}>
            <svg className="w-8 h-8" style={{color: '#233975'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Canvas PDF Handleidingen Uploaden
            </p>
            <p className="text-gray-500 mb-4">
              Sleep je Canvas documentatie hier naartoe of klik om bestanden te selecteren
            </p>
            <p className="text-sm font-medium mb-2" style={{color: '#233975'}}>
              💡 Je kunt meerdere PDF's tegelijk uploaden
            </p>
            <p className="text-xs px-3 py-2 rounded-lg inline-block" style={{backgroundColor: '#eec434', color: '#233975'}}>
              ⚠️ Voor Netlify deployment: Maximum 4MB per PDF • Aanbevolen: &lt; 2MB voor snelle verwerking
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            style={{backgroundColor: '#233975', '--tw-ring-color': '#233975'} as any}
          >
            {isUploading ? '⏳ Uploaden...' : '📄 Meerdere PDF Bestanden Selecteren'}
          </button>
          
          <div className="text-sm text-gray-400 space-y-1">
            <p>Ondersteunde formaten: PDF (max 4MB per bestand voor Netlify)</p>
            <p className="text-xs">💡 Tips: Comprimeer grote PDF's • Split lange documenten • Gebruik tekst-gebaseerde PDF's</p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="rounded-lg p-4" style={{backgroundColor: '#f8f9ff', borderColor: '#233975', borderWidth: '1px'}}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium" style={{color: '#233975'}}>Upload voortgang</span>
            <span className="text-sm" style={{color: '#233975'}}>
              {uploadProgress.current} van {uploadProgress.total} bestanden
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="h-3 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                backgroundColor: '#233975'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg text-center whitespace-pre-line ${
          uploadStatus.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
          uploadStatus.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
          uploadStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          'text-gray-700 border'
        }`}
        style={!uploadStatus.includes('✅') && !uploadStatus.includes('❌') && !uploadStatus.includes('⚠️') ? 
          {backgroundColor: '#f8f9ff', borderColor: '#233975', color: '#233975'} : {}}
        >
          {uploadStatus}
        </div>
      )}
    </div>
  )
}