'use client'

import { useState, useRef, useEffect } from 'react'
import PDFUploader from './PDFUploader'
import ChatInterface from './ChatInterface'

interface UploadedPDF {
  id: string
  name: string
  content: string
  size: number
  uploadedAt: Date
}

// Library management functions
const LIBRARY_STORAGE_KEY = 'canvas-coach-pdf-library'

const saveLibraryToStorage = (pdfs: UploadedPDF[]) => {
  try {
    const serializedPDFs = pdfs.map(pdf => ({
      ...pdf,
      uploadedAt: pdf.uploadedAt.toISOString()
    }))
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(serializedPDFs))
    console.log(`📚 Library saved: ${pdfs.length} PDFs`)
  } catch (error) {
    console.error('Failed to save library to localStorage:', error)
  }
}

const loadLibraryFromStorage = (): UploadedPDF[] => {
  try {
    const stored = localStorage.getItem(LIBRARY_STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    const pdfs = parsed.map((pdf: any) => ({
      ...pdf,
      uploadedAt: new Date(pdf.uploadedAt)
    }))
    
    console.log(`📚 Library loaded: ${pdfs.length} PDFs`)
    return pdfs
  } catch (error) {
    console.error('Failed to load library from localStorage:', error)
    return []
  }
}

const clearLibraryFromStorage = () => {
  try {
    localStorage.removeItem(LIBRARY_STORAGE_KEY)
    console.log('📚 Library cleared from storage')
  } catch (error) {
    console.error('Failed to clear library from localStorage:', error)
  }
}

export default function CanvasCoach() {
  const [uploadedPDFs, setUploadedPDFs] = useState<UploadedPDF[]>([])
  const [libraryPDFs, setLibraryPDFs] = useState<UploadedPDF[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [showLibraryManager, setShowLibraryManager] = useState(false)

  // Load library from localStorage on component mount
  useEffect(() => {
    const savedLibrary = loadLibraryFromStorage()
    setLibraryPDFs(savedLibrary)
    
    // If there are saved PDFs, initialize the app
    if (savedLibrary.length > 0) {
      setUploadedPDFs(savedLibrary)
      setIsInitialized(true)
    }
  }, [])

  // Save library to localStorage whenever it changes
  useEffect(() => {
    if (libraryPDFs.length > 0) {
      saveLibraryToStorage(libraryPDFs)
    }
  }, [libraryPDFs])

  const handlePDFUpload = (pdf: UploadedPDF) => {
    setUploadedPDFs(prev => [...prev, pdf])
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }

  const addToLibrary = (pdf: UploadedPDF) => {
    // Check if PDF already exists in library
    const exists = libraryPDFs.some(libPdf => 
      libPdf.name === pdf.name && libPdf.size === pdf.size
    )
    
    if (exists) {
      alert(`"${pdf.name}" staat al in de bibliotheek!`)
      return
    }
    
    setLibraryPDFs(prev => [...prev, pdf])
    alert(`✅ "${pdf.name}" toegevoegd aan bibliotheek!`)
  }

  const removeFromLibrary = (id: string) => {
    const pdfToRemove = libraryPDFs.find(pdf => pdf.id === id)
    if (pdfToRemove && confirm(`Weet je zeker dat je "${pdfToRemove.name}" uit de bibliotheek wilt verwijderen?`)) {
      setLibraryPDFs(prev => prev.filter(pdf => pdf.id !== id))
      
      // Also remove from current session if it's there
      setUploadedPDFs(prev => prev.filter(pdf => pdf.id !== id))
    }
  }

  const loadFromLibrary = (pdf: UploadedPDF) => {
    // Check if already loaded
    const alreadyLoaded = uploadedPDFs.some(loaded => loaded.id === pdf.id)
    if (alreadyLoaded) {
      alert(`"${pdf.name}" is al geladen!`)
      return
    }
    
    setUploadedPDFs(prev => [...prev, pdf])
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }

  const loadAllFromLibrary = () => {
    const newPDFs = libraryPDFs.filter(libPdf => 
      !uploadedPDFs.some(loaded => loaded.id === libPdf.id)
    )
    
    if (newPDFs.length === 0) {
      alert('Alle bibliotheek PDF\'s zijn al geladen!')
      return
    }
    
    setUploadedPDFs(prev => [...prev, ...newPDFs])
    if (!isInitialized) {
      setIsInitialized(true)
    }
    
    alert(`✅ ${newPDFs.length} PDF's geladen uit bibliotheek!`)
  }

  const clearLibrary = () => {
    if (confirm(`Weet je zeker dat je alle ${libraryPDFs.length} PDF's uit de bibliotheek wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      setLibraryPDFs([])
      clearLibraryFromStorage()
      alert('🗑️ Bibliotheek gewist!')
    }
  }

  const removePDF = (id: string) => {
    setUploadedPDFs(prev => prev.filter(pdf => pdf.id !== id))
    if (uploadedPDFs.length === 1) {
      setIsInitialized(false)
    }
  }

  const clearAllPDFs = () => {
    setUploadedPDFs([])
    setIsInitialized(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      {!isInitialized && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'linear-gradient(135deg, #233975 0%, #2d4a8a 100%)'}}>
              <svg className="w-8 h-8" style={{color: '#eec434'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{color: '#233975'}}>
              Welkom bij Canvas Coach Maike! 👋
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ik ben jouw professionele onderwijstechnologie-expert en coach, gespecialiseerd in Canvas LMS. 
              Upload je Canvas handleidingen en ik help je met al je Canvas-gerelateerde vragen!
            </p>
          </div>

          {/* Library Section */}
          {libraryPDFs.length > 0 && (
            <div className="rounded-xl p-6 mb-8" style={{backgroundColor: '#f8f9ff', borderColor: '#233975', borderWidth: '1px'}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center" style={{color: '#233975'}}>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  Jouw PDF Bibliotheek ({libraryPDFs.length} PDF's)
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={loadAllFromLibrary}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                    style={{backgroundColor: '#233975'}}
                  >
                    📚 Laad alle PDF's
                  </button>
                  <button
                    onClick={() => setShowLibraryManager(!showLibraryManager)}
                    className="px-3 py-2 rounded-lg transition-colors text-sm"
                    style={{backgroundColor: '#eec434', color: '#233975'}}
                  >
                    ⚙️ Beheer
                  </button>
                </div>
              </div>
              
              <p className="text-sm mb-4" style={{color: '#233975'}}>
                Je hebt {libraryPDFs.length} PDF's opgeslagen in je bibliotheek. Deze blijven bewaard tussen sessies.
              </p>
              
              {showLibraryManager && (
                <div className="bg-white rounded-lg p-4 border" style={{borderColor: '#233975'}}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium" style={{color: '#233975'}}>Bibliotheek Beheer</h4>
                    <button
                      onClick={clearLibrary}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      🗑️ Wis bibliotheek
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {libraryPDFs.map((pdf) => (
                      <div key={pdf.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={pdf.name}>
                              {pdf.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(pdf.size / 1024).toFixed(1)} KB • {pdf.uploadedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => loadFromLibrary(pdf)}
                              className="text-xs px-2 py-1 rounded transition-colors"
                              style={{backgroundColor: '#233975', color: 'white'}}
                              title="Laad PDF"
                            >
                              📂
                            </button>
                            <button
                              onClick={() => removeFromLibrary(pdf.id)}
                              className="text-red-500 hover:text-red-700 text-xs px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                              title="Verwijder uit bibliotheek"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl p-6 mb-8" style={{backgroundColor: '#f8f9ff', borderColor: '#233975', borderWidth: '1px'}}>
            <h3 className="text-lg font-semibold mb-3 flex items-center" style={{color: '#233975'}}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hoe werkt het?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#233975'}}>1</div>
                <p className="font-medium" style={{color: '#233975'}}>Upload PDF's</p>
                <p className="text-gray-600 text-sm">Canvas handleidingen en documentatie</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#233975'}}>2</div>
                <p className="font-medium" style={{color: '#233975'}}>Voeg toe aan bibliotheek</p>
                <p className="text-gray-600 text-sm">Bewaar PDF's voor hergebruik</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#233975'}}>3</div>
                <p className="font-medium" style={{color: '#233975'}}>Stel vragen</p>
                <p className="text-gray-600 text-sm">Krijg expert Canvas ondersteuning</p>
              </div>
            </div>
          </div>

          <PDFUploader onPDFUpload={handlePDFUpload} />
        </div>
      )}

      {/* Main Interface */}
      {isInitialized && (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - PDF Management */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 sticky top-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center" style={{color: '#233975'}}>
                <svg className="w-5 h-5 mr-2" style={{color: '#eec434'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Canvas Bronnen ({uploadedPDFs.length})
              </h3>

              {/* PDF List */}
              <div className="space-y-3 mb-6">
                {uploadedPDFs.map((pdf) => (
                  <div key={pdf.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={pdf.name}>
                          {pdf.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(pdf.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {/* Add to Library Button */}
                        <button
                          onClick={() => addToLibrary(pdf)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{backgroundColor: '#eec434', color: '#233975'}}
                          title="Voeg toe aan bibliotheek"
                        >
                          📚+
                        </button>
                        <button
                          onClick={() => removePDF(pdf.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="Verwijder PDF"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Library Quick Access */}
              {libraryPDFs.length > 0 && (
                <div className="mb-6 p-3 rounded-lg" style={{backgroundColor: '#f8f9ff', borderColor: '#233975', borderWidth: '1px'}}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold flex items-center" style={{color: '#233975'}}>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      Bibliotheek ({libraryPDFs.length})
                    </h4>
                    <button
                      onClick={() => setShowLibraryManager(!showLibraryManager)}
                      className="text-xs" style={{color: '#233975'}}
                    >
                      {showLibraryManager ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {showLibraryManager && (
                    <div className="space-y-2">
                      <button
                        onClick={loadAllFromLibrary}
                        className="w-full px-3 py-2 text-sm rounded-lg transition-colors"
                        style={{backgroundColor: '#233975', color: 'white'}}
                      >
                        📚 Laad alle PDF's
                      </button>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {libraryPDFs.map((pdf) => (
                          <div key={pdf.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                            <span className="truncate flex-1" title={pdf.name}>
                              {pdf.name}
                            </span>
                            <button
                              onClick={() => loadFromLibrary(pdf)}
                              className="ml-1" style={{color: '#233975'}}
                              title="Laad PDF"
                            >
                              📂
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <PDFUploader onPDFUpload={handlePDFUpload} compact />
                <button
                  onClick={clearAllPDFs}
                  className="w-full px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  🗑️ Wis sessie PDF's
                </button>
              </div>
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3">
            <ChatInterface 
              uploadedPDFs={uploadedPDFs}
            />
          </div>
        </div>
      )}
    </div>
  )
}