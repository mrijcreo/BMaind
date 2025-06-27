import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Geen bestand gevonden' }, { status: 400 })
    }

    // Check file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Alleen PDF bestanden zijn toegestaan' }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bestand is te groot (max 10MB)' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let textContent = ''

    try {
      // Extract text from PDF using pdf-parse with enhanced error handling
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
        // Add options to handle problematic PDFs
        max: 0 // Parse all pages
      });
      
      textContent = pdfData.text;
    } catch (pdfError: unknown) {
      console.error('PDF parsing error:', pdfError);
      
      // More specific error messages based on error type
      if (pdfError instanceof Error && pdfError.message && pdfError.message.includes('ENOENT')) {
        return NextResponse.json({ 
          error: 'PDF verwerking configuratiefout. Neem contact op met de beheerder.' 
        }, { status: 500 });
      } else if (pdfError instanceof Error && pdfError.message && pdfError.message.includes('Invalid PDF')) {
        return NextResponse.json({ 
          error: 'Het PDF bestand is beschadigd of heeft een ongeldig formaat.' 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: 'Fout bij het lezen van het PDF bestand. Controleer of het bestand niet beschermd is.' 
        }, { status: 400 });
      }
    }

    // Validate extracted content
    if (!textContent || textContent.trim().length < 10) {
      return NextResponse.json({ 
        error: 'Geen tekst gevonden in PDF. Controleer of het bestand tekst bevat en niet alleen afbeeldingen.' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
      content: textContent,
      wordCount: textContent.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: textContent.length,
      message: 'PDF succesvol verwerkt en tekst geëxtraheerd'
    })

  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verwerken van het PDF bestand' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not allowed. Use POST to upload PDF files.' },
    { status: 405 }
  )
}