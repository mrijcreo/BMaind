'use client'

import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

interface DropboxFile {
  id: string
  name: string
  path_lower: string
  size: number
  content_hash?: string
  is_downloadable: boolean
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    name: string
    type: 'dropbox'
    path?: string
    snippet?: string
  }>
}

interface DropboxChatInterfaceProps {
  dropboxFiles: DropboxFile[]
  accessToken: string | null
}

export default function DropboxChatInterface({ dropboxFiles, accessToken }: DropboxChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentResponseRef = useRef<HTMLDivElement>(null)

  // Updated character limit to match backend capabilities
  const MAX_MESSAGE_LENGTH = 200000

  // Helper function to get file count text
  const getFileCountText = () => {
    const count = dropboxFiles.length
    if (count === 0) return 'geen bestanden'
    if (count === 1) return '1 bestand'
    return `alle ${count} bestanden`
  }

  // Enhanced keyword extraction for comprehensive search
  const extractSearchTerms = (question: string): string[] => {
    const terms = []
    const lowerQuestion = question.toLowerCase()
    
    // Canvas-specific terms with variations
    const canvasTerms = [
      'canvas', 'opdracht', 'opdrachten', 'assignment', 'assignments',
      'cursist', 'student', 'cursisten', 'studenten', 'leerling', 'leerlingen',
      'punt', 'punten', 'score', 'scores', 'cijfer', 'cijfers', 'beoordeling', 'beoordelen',
      'automatisch', 'standaard', 'default', 'instellingen', 'configuratie', 'instellen',
      'rubric', 'feedback', 'evalueren', 'evaluatie', 'toets', 'toetsen', 'quiz',
      'groep', 'groepen', 'module', 'modules', 'cursus', 'course', 'vak',
      'inleveren', 'indiening', 'deadline', 'datum', 'tijd',
      'nul', 'zero', '0', 'leeg', 'niet ingeleverd', 'gemist',
      'automatisch toekennen', 'auto-assign', 'bulk', 'massa',
      'gradebook', 'cijferboek', 'rapportage', 'overzicht'
    ]
    
    // Extract Canvas terms
    canvasTerms.forEach(term => {
      if (lowerQuestion.includes(term)) {
        terms.push(term)
      }
    })
    
    // Extract numbers and special characters
    const numbers = question.match(/\b\d+\b/g)
    if (numbers) {
      terms.push(...numbers)
    }
    
    // Extract quoted phrases
    const quotes = question.match(/"([^"]+)"/g)
    if (quotes) {
      terms.push(...quotes.map(q => q.replace(/"/g, '')))
    }
    
    // Extract key action words
    const actionWords = ['maak', 'maken', 'stel', 'stellen', 'wijzig', 'wijzigen', 'verander', 'veranderen', 'zet', 'zetten']
    actionWords.forEach(word => {
      if (lowerQuestion.includes(word)) {
        terms.push(word)
      }
    })
    
    const uniqueTerms = new Set(terms)
    return Array.from(uniqueTerms)
  }

  // Smart content prioritization based on relevance
  const prioritizeContent = (content: string, searchTerms: string[]): { score: number, content: string } => {
    let score = 0
    const lowerContent = content.toLowerCase()
    
    // Score based on search term frequency and proximity
    searchTerms.forEach(term => {
      const termCount = (lowerContent.match(new RegExp(term.toLowerCase(), 'g')) || []).length
      score += termCount * 10
      
      // Bonus for terms appearing in headers or important sections
      if (lowerContent.includes(`${term.toLowerCase()}:`)) score += 5
      if (lowerContent.includes(`**${term.toLowerCase()}**`)) score += 5
    })
    
    // Bonus for sections that seem instructional
    const instructionalKeywords = ['stap', 'procedure', 'instructie', 'hoe', 'methode', 'manier']
    instructionalKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) score += 3
    })
    
    return { score, content }
  }

  // Comprehensive Dropbox context preparation with ALL content
  const prepareComprehensiveDropboxContext = async (userQuestion: string) => {
    if (dropboxFiles.length === 0 || !accessToken) return ''

    console.log('🔍 COMPREHENSIVE DROPBOX SEARCH: Preparing context for question:', userQuestion)
    
    const searchTerms = extractSearchTerms(userQuestion)
    console.log('📝 Search terms extracted:', searchTerms)
    
    // Download and process ALL Dropbox files
    const processedFiles = []
    
    for (const file of dropboxFiles) {
      try {
        console.log(`📥 Downloading ${file.name} from Dropbox...`)
        
        const response = await fetch('/api/dropbox/get-file-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: accessToken,
            filePath: file.path_lower
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const prioritized = prioritizeContent(data.content, searchTerms)
            processedFiles.push({
              ...file,
              content: data.content,
              relevanceScore: prioritized.score,
              processedContent: prioritized.content
            })
            console.log(`📄 File: ${file.name} - Relevance score: ${prioritized.score}`)
          }
        } else {
          console.warn(`⚠️ Failed to download ${file.name}:`, response.status)
        }
      } catch (error) {
        console.error(`❌ Error downloading ${file.name}:`, error)
      }
    }
    
    // Sort by relevance but include ALL files
    processedFiles.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    let totalContext = `
🔍 COMPREHENSIVE DROPBOX CANVAS SEARCH CONTEXT
TOTAL DOCUMENTS: ${processedFiles.length}
SEARCH TERMS: ${searchTerms.join(', ')}
QUESTION: ${userQuestion}

SEARCH INSTRUCTION: You MUST search through ALL the following Dropbox documents thoroughly. Look for EXACT matches, SYNONYMS, and RELATED concepts. Pay special attention to:
- Settings and configurations
- Automatic functions and default values  
- Step-by-step procedures
- Points, scores, and grading
- Student/cursist management
- Assignment workflows

=== ALL DROPBOX CANVAS DOCUMENTS (SEARCH EVERY SINGLE ONE) ===
`

    let includedFiles = 0
    
    // Include ALL files, starting with most relevant
    for (const file of processedFiles) {
      const fileHeader = `

📚 DROPBOX DOCUMENT ${includedFiles + 1}/${processedFiles.length}: ${file.name}
DROPBOX PATH: ${file.path_lower}
RELEVANCE SCORE: ${file.relevanceScore}
DOCUMENT TYPE: ${file.name.toLowerCase().includes('evalueren') ? 'Evaluatie & Beoordeling' : 
                file.name.toLowerCase().includes('webinar') ? 'Webinar & Extra Tips' : 
                file.name.toLowerCase().includes('basis') ? 'Basis Functionaliteiten' : 
                file.name.toLowerCase().includes('extra') ? 'Extra Functionaliteiten' :
                'Canvas Handleiding'}
SIZE: ${(file.content.length / 1000).toFixed(1)}k characters
SEARCH PRIORITY: ${file.relevanceScore > 50 ? 'HIGH' : file.relevanceScore > 20 ? 'MEDIUM' : 'LOW'}

--- START OF ${file.name} (FROM DROPBOX) ---
${file.processedContent}
--- END OF ${file.name} (FROM DROPBOX) ---
`

      // Check if we can fit this file
      if ((totalContext + fileHeader).length > MAX_MESSAGE_LENGTH) {
        console.log(`⚠️ Context limit reached at file ${includedFiles + 1}/${processedFiles.length}`)
        
        // Try to include at least a summary of remaining files
        const remainingFiles = processedFiles.slice(includedFiles)
        if (remainingFiles.length > 0) {
          const summaryHeader = `

📋 ADDITIONAL DROPBOX DOCUMENTS (${remainingFiles.length} more):
${remainingFiles.map(file => `- ${file.name} (${(file.content.length / 1000).toFixed(1)}k chars, score: ${file.relevanceScore})`).join('\n')}

⚠️ SEARCH NOTE: Due to size limits, search primarily in the above detailed documents, but be aware these additional Dropbox documents exist and may contain relevant information.
`
          if ((totalContext + summaryHeader).length <= MAX_MESSAGE_LENGTH) {
            totalContext += summaryHeader
          }
        }
        break
      }
      
      totalContext += fileHeader
      includedFiles++
    }
    
    console.log(`✅ COMPREHENSIVE DROPBOX CONTEXT: ${includedFiles}/${processedFiles.length} files included, ${(totalContext.length / 1000).toFixed(1)}k chars`)
    
    return totalContext
  }

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `Hallo! Ik ben Canvas Coach Maike 👋

**Welke Canvas-vraag heb je en waar kan ik je bij helpen?**

Ik ben een professionele onderwijstechnologie-expert gespecialiseerd in Canvas LMS. Ik kan je helpen met:

• 📚 **Canvas functionaliteiten** - Hoe gebruik je specifieke tools?
• 👥 **Cursistenbeheer** - Inschrijvingen, groepen, communicatie  
• 📝 **Opdrachten & Toetsen** - Aanmaken, beoordelen, feedback geven
• 📊 **Cijferboek** - Beoordelingen, rubrics, rapportages
• 🎯 **Cursusontwerp** - Modules, content organisatie
• 🔧 **Instellingen** - Configuratie en personalisatie
• ⚙️ **Automatisering** - Standaardwaarden, bulk acties, workflows

🔍 **Geavanceerde Dropbox zoekfunctie**: Ik doorzoek ${getFileCountText()} **grondig en systematisch** uit je Dropbox met slimme algoritmes die ALLE content analyseren!

Stel gerust je vraag! 🚀`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [dropboxFiles.length])

  // Auto-scroll to response start when streaming begins
  useEffect(() => {
    if (isStreaming && streamingMessage && currentResponseRef.current) {
      console.log('🎯 Auto-scrolling to response start...')
      currentResponseRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }, [isStreaming, streamingMessage])

  // Auto-scroll to bottom for final messages
  useEffect(() => {
    if (!isStreaming) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !accessToken) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      let payload: any = {
        message: inputMessage.trim(),
        aiModel: 'smart',
        useGrounding: false
      }

      // COMPREHENSIVE Dropbox search with enhanced instructions
      if (dropboxFiles.length > 0 && accessToken) {
        const comprehensiveContext = await prepareComprehensiveDropboxContext(inputMessage.trim())
        
        payload.message = `Je bent Canvas Coach Maike, een professionele Canvas LMS expert en coach. Je MOET de volgende vraag beantwoorden door ALLE aangeleverde Canvas handleidingen uit Dropbox GRONDIG en SYSTEMATISCH te doorzoeken.

🎯 KRITIEKE DROPBOX ZOEK-MISSIE:
- LEES ELKE REGEL van ELKE DROPBOX DOCUMENT volledig door
- Zoek naar EXACTE woorden, SYNONIEMEN, GERELATEERDE termen en CONTEXT
- Let SPECIFIEK op: instellingen, configuraties, automatische functies, standaardwaarden, punten, scores, workflows
- COMBINEER informatie uit MEERDERE Dropbox documenten als relevant
- Zoek naar stap-voor-stap instructies, procedures en concrete handelingen
- Let op menu-opties, interface-elementen, screenshots en voorbeelden
- Als je iets vindt dat LIJKT op het antwoord: onderzoek het DIEPER in de volledige context
- Zoek ook naar ALTERNATIEVE methoden en WORKAROUNDS

🔍 GEAVANCEERDE DROPBOX ZOEKSTRATEGIE:
1. Scan ALLE Dropbox documenten op hoofdtermen
2. Zoek naar GERELATEERDE concepten en procedures  
3. Identificeer RELEVANTE secties in elk Dropbox document
4. COMBINEER informatie uit verschillende Dropbox bronnen
5. Geef COMPLETE en ACTIONABLE antwoorden

📋 ANTWOORD VEREISTEN:
- Geef CONCRETE, stap-voor-stap instructies
- Citeer de EXACTE bron (Dropbox documentnaam) waar je informatie vond
- Als informatie uit MEERDERE Dropbox bronnen komt: vermeld ze ALLEMAAL
- Spreek over "cursisten" in plaats van "studenten"  
- Als je GEEN specifiek antwoord vindt: zeg dat expliciet en geef GERELATEERDE informatie
- Geef ALTERNATIEVE oplossingen als de directe methode niet beschikbaar is

❓ GEBRUIKERSVRAAG: ${inputMessage.trim()}

${comprehensiveContext}`

        console.log('🔍 COMPREHENSIVE DROPBOX SEARCH prepared:', {
          fileCount: dropboxFiles.length,
          totalLength: comprehensiveContext.length,
          question: inputMessage.trim(),
          searchTerms: extractSearchTerms(inputMessage.trim())
        })
      } else {
        payload.message = `Je bent Canvas Coach Maike, een professionele Canvas LMS expert en coach. Beantwoord de volgende Canvas-vraag op basis van je kennis. Spreek over "cursisten" in plaats van "studenten".

VRAAG: ${inputMessage.trim()}`
      }

      // Check message length
      if (payload.message.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Het bericht is te lang (${payload.message.length.toLocaleString()} tekens). Het maximum is ${MAX_MESSAGE_LENGTH.toLocaleString()} tekens. Probeer je vraag korter te maken of gebruik minder Dropbox documenten.`)
      }

      // Use streaming API
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorMessage = 'Er is een fout opgetreden'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          switch (response.status) {
            case 413:
              errorMessage = 'Bericht te groot. Probeer een kortere vraag of minder Dropbox bestanden.'
              break
            case 429:
              errorMessage = 'Te veel verzoeken. Wacht even en probeer opnieuw.'
              break
            case 500:
              errorMessage = 'Server fout. Probeer het later opnieuw.'
              break
            default:
              errorMessage = `HTTP fout ${response.status}. Probeer het opnieuw.`
          }
        }
        
        throw new Error(errorMessage)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''

      if (!reader) {
        throw new Error('Streaming niet ondersteund door de browser')
      }

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.message || 'Streaming error')
              }
              
              if (data.done) {
                setIsStreaming(false)
                const assistantMessage: ChatMessage = {
                  id: `assistant_${Date.now()}`,
                  type: 'assistant',
                  content: fullResponse,
                  timestamp: new Date(),
                  sources: dropboxFiles.map(file => ({
                    name: file.name,
                    type: 'dropbox' as const,
                    path: file.path_lower
                  }))
                }
                setMessages(prev => [...prev, assistantMessage])
                setStreamingMessage('')
                return
              }
              
              if (data.token) {
                fullResponse += data.token
                setStreamingMessage(fullResponse)
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError)
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error)
      
      let userFriendlyMessage = 'Er is een onbekende fout opgetreden'
      
      if (error.name === 'AbortError') {
        userFriendlyMessage = 'Verzoek geannuleerd door timeout. De comprehensive Dropbox search duurde te lang.'
      } else if (error.message.includes('Failed to fetch')) {
        userFriendlyMessage = 'Netwerkfout. Controleer je internetverbinding en probeer opnieuw.'
      } else if (error.message.includes('te lang')) {
        userFriendlyMessage = error.message
      } else {
        userFriendlyMessage = error.message || 'Er is een fout opgetreden'
      }
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: `❌ **Fout bij comprehensive Dropbox search**

${userFriendlyMessage}

${error.message && error.message.includes('te lang') 
  ? '\n💡 **Tip:** De comprehensive Dropbox search gebruikt veel context. Probeer een kortere vraag of gebruik minder Dropbox documenten.'
  : '\n💡 **Tips:**\n• Probeer het opnieuw\n• Herlaad de pagina als het probleem aanhoudt\n• Controleer je internetverbinding\n• Controleer je Dropbox verbinding'
}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        id: 'welcome_new',
        type: 'assistant',
        content: `Hallo! Ik ben Canvas Coach Maike 👋

**Welke Canvas-vraag heb je en waar kan ik je bij helpen?**

🔍 **Geavanceerde Dropbox zoekfunctie**: Ik doorzoek ${getFileCountText()} **grondig en systematisch** uit je Dropbox met slimme algoritmes!

Stel gerust je vraag! 🚀`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }, 100)
  }

  if (!accessToken) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-[600px] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium">Verbind eerst met Dropbox</p>
          <p className="text-sm">Om te kunnen chatten met je Canvas handleidingen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 h-[900px] flex flex-col">
      {/* Chat Header */}
      <div className="p-6 border-b border-gray-200 rounded-t-2xl" style={{background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #233975 0%, #2d4a8a 100%)'}}>
              <svg className="w-5 h-5" style={{color: '#eec434'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{color: '#233975'}}>Canvas Coach Maike Chat</h3>
              <p className="text-sm text-gray-600">
                🔍 Comprehensive search in ${getFileCountText()} uit Dropbox
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Nieuwe chat starten"
          >
            🗑️ Wissen
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.type === 'user'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
              style={message.type === 'user' ? {backgroundColor: '#233975'} : {}}
            >
              {message.type === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
              
              {/* Show Dropbox sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">📁 Bronnen uit Dropbox:</p>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.slice(0, 3).map((source, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {source.name}
                      </span>
                    ))}
                    {message.sources.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{message.sources.length - 3} meer
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <p className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('nl-NL', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                <span className="ml-2">🔍📁</span>
              </p>
            </div>
          </div>
        ))}

        {/* Streaming Message */}
        {isStreaming && streamingMessage && (
          <div className="flex justify-start" ref={currentResponseRef}>
            <div className="max-w-[85%] bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
              <MarkdownRenderer content={streamingMessage} />
              <div className="flex items-center mt-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">🔍 Comprehensive search door alle Dropbox bestanden...</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">🧠 Canvas Coach Maike analyseert systematisch alle Dropbox bronnen...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Stel je Canvas-vraag... (bijv. 'Hoe maak ik alle punten automatisch op 0 als cursisten niet indienden?')"
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:border-transparent"
              style={{'--tw-ring-color': '#233975'} as any}
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-6 py-3 text-white rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            style={{backgroundColor: '#233975', '--tw-ring-color': '#233975'} as any}
          >
            {isLoading ? '🔍' : '🚀'}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            🔍 **COMPREHENSIVE DROPBOX SEARCH** door ${getFileCountText()} met geavanceerde algoritmes
          </span>
          <span>Enter = verzenden • Shift+Enter = nieuwe regel</span>
        </div>
      </div>
    </div>
  )
}