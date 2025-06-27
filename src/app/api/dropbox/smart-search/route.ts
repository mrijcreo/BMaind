import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface DropboxFile {
  id: string
  name: string
  path_lower: string
  size: number
  content?: string
}

interface SearchResult {
  file: DropboxFile
  relevanceScore: number
  relevantSections: string[]
  summary: string
  keyPoints: string[]
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key niet geconfigureerd' },
        { status: 500 }
      )
    }

    const { accessToken, query, files } = await request.json()

    if (!accessToken || !query || !files) {
      return NextResponse.json(
        { error: 'Access token, query en files zijn vereist' },
        { status: 400 }
      )
    }

    console.log(`🔍 Smart Search gestart voor: "${query}" in ${files.length} bestanden`)

    // Stap 1: Download alle bestandsinhoud
    const filesWithContent: DropboxFile[] = []
    
    for (const file of files) {
      try {
        const response = await fetch('/api/dropbox/get-file-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: accessToken,
            filePath: file.path_lower
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.content) {
            filesWithContent.push({
              ...file,
              content: data.content
            })
            console.log(`📄 ${file.name}: ${data.content.length} karakters geladen`)
          }
        }
      } catch (error) {
        console.error(`❌ Fout bij laden ${file.name}:`, error)
      }
    }

    if (filesWithContent.length === 0) {
      return NextResponse.json(
        { error: 'Geen bestanden konden worden geladen' },
        { status: 400 }
      )
    }

    // Stap 2: Gebruik Gemini 2.5 Flash voor smart search
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const searchResults: SearchResult[] = []

    // Verwerk bestanden in batches voor betere performance
    const batchSize = 3
    for (let i = 0; i < filesWithContent.length; i += batchSize) {
      const batch = filesWithContent.slice(i, i + batchSize)
      
      for (const file of batch) {
        try {
          console.log(`🧠 Gemini analyseert: ${file.name}`)
          
          const searchPrompt = `
Je bent een expert Canvas LMS assistent. Analyseer het volgende document grondig en beantwoord de gebruikersvraag.

GEBRUIKERSVRAAG: "${query}"

DOCUMENT: ${file.name}
INHOUD:
${file.content}

INSTRUCTIES:
1. Zoek naar ALLE relevante informatie die gerelateerd is aan de gebruikersvraag
2. Geef een relevantiescore van 0-100 (0 = niet relevant, 100 = perfect relevant)
3. Extraheer de meest relevante secties (max 3 secties van elk max 200 woorden)
4. Maak een korte samenvatting van wat dit document bijdraagt aan het beantwoorden van de vraag
5. Lijst de belangrijkste punten op die relevant zijn voor de vraag

Antwoord in dit EXACTE JSON formaat:
{
  "relevanceScore": [getal 0-100],
  "relevantSections": [
    "Relevante sectie 1 tekst hier...",
    "Relevante sectie 2 tekst hier...",
    "Relevante sectie 3 tekst hier..."
  ],
  "summary": "Korte samenvatting van wat dit document bijdraagt...",
  "keyPoints": [
    "Belangrijk punt 1",
    "Belangrijk punt 2", 
    "Belangrijk punt 3"
  ]
}

Als het document NIET relevant is voor de vraag, geef dan relevanceScore: 0 en lege arrays.
`

          const result = await model.generateContent(searchPrompt)
          const response = await result.response
          const text = response.text()

          // Parse JSON response
          try {
            // Extract JSON from response (handle potential markdown formatting)
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const analysisResult = JSON.parse(jsonMatch[0])
              
              if (analysisResult.relevanceScore > 0) {
                searchResults.push({
                  file: file,
                  relevanceScore: analysisResult.relevanceScore,
                  relevantSections: analysisResult.relevantSections || [],
                  summary: analysisResult.summary || '',
                  keyPoints: analysisResult.keyPoints || []
                })
                
                console.log(`✅ ${file.name}: Score ${analysisResult.relevanceScore}`)
              } else {
                console.log(`⚪ ${file.name}: Niet relevant (score 0)`)
              }
            }
          } catch (parseError) {
            console.error(`❌ JSON parse fout voor ${file.name}:`, parseError)
            console.log('Raw response:', text)
          }

        } catch (error) {
          console.error(`❌ Gemini analyse fout voor ${file.name}:`, error)
        }
      }
    }

    // Stap 3: Sorteer resultaten op relevantie
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

    console.log(`🎯 Smart Search voltooid: ${searchResults.length} relevante bestanden gevonden`)

    return NextResponse.json({
      success: true,
      query: query,
      totalFiles: filesWithContent.length,
      relevantFiles: searchResults.length,
      results: searchResults,
      searchMethod: 'Gemini 2.5 Flash Smart Search'
    })

  } catch (error) {
    console.error('Smart search error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Smart search mislukt',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}