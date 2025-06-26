import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const { accessToken, filePath } = await request.json()

    if (!accessToken || !filePath) {
      return NextResponse.json(
        { error: 'Access token and file path are required' },
        { status: 400 }
      )
    }

    console.log(`📥 Downloading file from Dropbox: ${filePath}`)

    // Download file from Dropbox
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath
        }),
      },
    })

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text()
      console.error('Dropbox download error:', errorText)
      throw new Error(`Dropbox download failed: ${downloadResponse.status}`)
    }

    // Get file buffer
    const fileBuffer = await downloadResponse.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)
    
    console.log(`📄 File downloaded: ${buffer.length} bytes`)

    // Extract text based on file type
    let textContent = ''
    const fileName = filePath.toLowerCase()

    if (fileName.endsWith('.pdf')) {
      // Extract text from PDF using pdf-parse
      try {
        let pdfParse;
        try {
          pdfParse = (await import('pdf-parse')).default;
        } catch (importError) {
          console.error('Failed to import pdf-parse:', importError);
          return NextResponse.json({ 
            error: 'PDF verwerking tijdelijk niet beschikbaar. Probeer het later opnieuw.' 
          }, { status: 503 });
        }

        const pdfData = await pdfParse(buffer, {
          max: 0, // Parse all pages
        });
        
        textContent = pdfData.text;
      } catch (pdfError: unknown) {
        console.error('PDF parsing error:', pdfError);
        throw new Error('Fout bij het lezen van het PDF bestand uit Dropbox');
      }
    } else if (fileName.endsWith('.docx')) {
      // Extract text from DOCX using mammoth
      try {
        const result = await mammoth.extractRawText({ buffer })
        textContent = result.value
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError)
        throw new Error('Fout bij het lezen van het DOCX bestand uit Dropbox')
      }
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Plain text files
      textContent = buffer.toString('utf-8')
    } else {
      throw new Error(`Bestandstype niet ondersteund: ${fileName}`)
    }

    // Validate extracted content
    if (!textContent || textContent.trim().length < 10) {
      throw new Error('Geen tekst gevonden in bestand of bestand is te kort')
    }

    console.log(`✅ Text extracted: ${textContent.length} characters`)

    return NextResponse.json({
      success: true,
      content: textContent,
      fileName: filePath.split('/').pop() || 'unknown',
      size: buffer.length,
      wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: textContent.length
    })

  } catch (error) {
    console.error('Dropbox get file content error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to get file content from Dropbox',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}