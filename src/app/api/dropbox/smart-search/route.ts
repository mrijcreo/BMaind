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
  reasoning: string
  confidence: number
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

    console.log(`🧠 Gemini 2.5 Pro Smart Search gestart voor: "${query}" in ${files.length} bestanden`)

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

    // Stap 2: Gebruik Gemini 2.5 Pro voor geavanceerde smart search
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

    const searchResults: SearchResult[] = []

    // Verwerk bestanden individueel voor maximale kwaliteit met Gemini Pro
    for (const file of filesWithContent) {
      try {
        console.log(`🏆 Gemini 2.5 Pro analyseert: ${file.name}`)
        
        const advancedSearchPrompt = `
Je bent een expert Canvas LMS consultant met diepgaande kennis van onderwijstechnologie. Voer een geavanceerde analyse uit van het volgende document om de gebruikersvraag te beantwoorden.

GEBRUIKERSVRAAG: "${query}"

DOCUMENT INFORMATIE:
- Bestandsnaam: ${file.name}
- Grootte: ${file.content?.length || 0} karakters
- Type: Canvas LMS documentatie

DOCUMENT INHOUD:
${file.content}

GEAVANCEERDE ANALYSE INSTRUCTIES:
1. DIEPGAANDE RELEVANTIE ANALYSE:
   - Analyseer niet alleen directe matches, maar ook conceptuele verbanden
   - Zoek naar impliciete informatie die relevant kan zijn
   - Overweeg context en gerelateerde Canvas functionaliteiten
   - Geef een relevantiescore van 0-100 met gedetailleerde redenering

2. INTELLIGENTE SECTIE EXTRACTIE:
   - Identificeer de 3 meest waardevolle secties (max 300 woorden elk)
   - Prioriteer stap-voor-stap instructies, configuratie-instellingen, en praktische tips
   - Behoud belangrijke details zoals menu-paden, button namen, en specifieke waarden

3. EXPERTANALYSE:
   - Maak een professionele samenvatting van hoe dit document de vraag beantwoordt
   - Identificeer de belangrijkste actionable insights
   - Geef een confidence score (0-100) voor de betrouwbaarheid van de informatie

4. CANVAS LMS EXPERTISE:
   - Herken Canvas-specifieke terminologie en functionaliteiten
   - Verstaan de context van onderwijsprocessen en workflows
   - Identificeer best practices en potentiële valkuilen

Antwoord in dit EXACTE JSON formaat (geen markdown, alleen pure JSON):
{
  "relevanceScore": [getal 0-100],
  "confidence": [getal 0-100],
  "reasoning": "Gedetailleerde uitleg waarom dit document wel/niet relevant is, inclusief specifieke Canvas concepten die worden behandeld",
  "relevantSections": [
    "Meest relevante sectie 1 met volledige context en details...",
    "Meest relevante sectie 2 met stap-voor-stap instructies...",
    "Meest relevante sectie 3 met configuratie-informatie..."
  ],
  "summary": "Professionele samenvatting van hoe dit document bijdraagt aan het beantwoorden van de vraag, inclusief specifieke Canvas functionaliteiten",
  "keyPoints": [
    "Specifiek actionable punt 1 met Canvas context",
    "Specifiek actionable punt 2 met menu-paden of instellingen", 
    "Specifiek actionable punt 3 met best practices",
    "Specifiek actionable punt 4 met waarschuwingen of tips",
    "Specifiek actionable punt 5 met gerelateerde functionaliteiten"
  ]
}

BELANGRIJKE OPMERKINGEN:
- Als het document NIET relevant is, geef dan relevanceScore: 0, confidence: 100, en leg uit waarom
- Voor relevante documenten, wees specifiek over Canvas menu's, buttons, en workflows
- Gebruik professionele onderwijstechnologie terminologie
- Focus op praktische, implementeerbare informatie
`

        const result = await model.generateContent(advancedSearchPrompt)
        const response = await result.response
        const text = response.text()

        // Parse JSON response met betere error handling
        try {
          // Clean up response text en extract JSON
          let cleanText = text.trim()
          
          // Remove markdown code blocks if present
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '')
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '')
          }
          
          // Find JSON object
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const analysisResult = JSON.parse(jsonMatch[0])
            
            // Validate required fields
            if (typeof analysisResult.relevanceScore === 'number' && 
                analysisResult.relevanceScore >= 0 && 
                analysisResult.relevanceScore <= 100) {
              
              if (analysisResult.relevanceScore > 0) {
                searchResults.push({
                  file: file,
                  relevanceScore: analysisResult.relevanceScore,
                  relevantSections: analysisResult.relevantSections || [],
                  summary: analysisResult.summary || '',
                  keyPoints: analysisResult.keyPoints || [],
                  reasoning: analysisResult.reasoning || '',
                  confidence: analysisResult.confidence || 0
                })
                
                console.log(`✅ ${file.name}: Score ${analysisResult.relevanceScore}, Confidence ${analysisResult.confidence}`)
              } else {
                console.log(`⚪ ${file.name}: Niet relevant (score 0) - ${analysisResult.reasoning}`)
              }
            } else {
              console.error(`❌ Ongeldige relevanceScore voor ${file.name}:`, analysisResult.relevanceScore)
            }
          } else {
            console.error(`❌ Geen JSON gevonden in response voor ${file.name}`)
            console.log('Raw response:', text.substring(0, 500))
          }
        } catch (parseError) {
          console.error(`❌ JSON parse fout voor ${file.name}:`, parseError)
          console.log('Raw response:', text.substring(0, 500))
          
          // Fallback: probeer een eenvoudigere analyse
          try {
            const fallbackPrompt = `Analyseer dit Canvas document voor de vraag "${query}". Geef alleen een relevantiescore 0-100: ${file.content?.substring(0, 1000)}`
            const fallbackResult = await model.generateContent(fallbackPrompt)
            const fallbackText = await fallbackResult.response.text()
            const scoreMatch = fallbackText.match(/(\d+)/);
            
            if (scoreMatch) {
              const score = parseInt(scoreMatch[1])
              if (score > 0 && score <= 100) {
                searchResults.push({
                  file: file,
                  relevanceScore: score,
                  relevantSections: [file.content?.substring(0, 500) || ''],
                  summary: `Fallback analyse: mogelijk relevant voor "${query}"`,
                  keyPoints: ['Automatische analyse - handmatige verificatie aanbevolen'],
                  reasoning: 'Fallback analyse gebruikt vanwege parsing error',
                  confidence: 50
                })
                console.log(`🔄 ${file.name}: Fallback score ${score}`)
              }
            }
          } catch (fallbackError) {
            console.error(`❌ Fallback analyse ook mislukt voor ${file.name}:`, fallbackError)
          }
        }

      } catch (error) {
        console.error(`❌ Gemini 2.5 Pro analyse fout voor ${file.name}:`, error)
      }
    }

    // Stap 3: Geavanceerde resultaat ranking
    // Sorteer op gewogen score (relevance * confidence)
    searchResults.forEach(result => {
      result.relevanceScore = Math.round(result.relevanceScore * (result.confidence / 100))
    })
    
    searchResults.sort((a, b) => {
      // Primair: relevantie score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      // Secundair: confidence
      return b.confidence - a.confidence
    })

    // Filter resultaten met minimale relevantie (score > 10)
    const filteredResults = searchResults.filter(result => result.relevanceScore > 10)

    console.log(`🎯 Gemini 2.5 Pro Smart Search voltooid:`)
    console.log(`   📊 ${filteredResults.length} van ${filesWithContent.length} bestanden relevant`)
    console.log(`   🏆 Hoogste score: ${filteredResults[0]?.relevanceScore || 0}`)
    console.log(`   💡 Gemiddelde confidence: ${filteredResults.length > 0 ? Math.round(filteredResults.reduce((sum, r) => sum + r.confidence, 0) / filteredResults.length) : 0}%`)

    return NextResponse.json({
      success: true,
      query: query,
      totalFiles: filesWithContent.length,
      relevantFiles: filteredResults.length,
      results: filteredResults,
      searchMethod: 'Gemini 2.5 Pro Advanced Smart Search',
      metadata: {
        averageConfidence: filteredResults.length > 0 ? Math.round(filteredResults.reduce((sum, r) => sum + r.confidence, 0) / filteredResults.length) : 0,
        highestScore: filteredResults[0]?.relevanceScore || 0,
        processingTime: Date.now()
      }
    })

  } catch (error) {
    console.error('Gemini 2.5 Pro Smart Search error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Gemini 2.5 Pro Smart Search mislukt',
        details: errorMessage,
        timestamp: new Date().toISOString(),
        suggestion: 'Probeer een kortere vraag of minder complexe documenten'
      },
      { status: 500 }
    )
  }
}