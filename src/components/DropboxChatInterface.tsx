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
    relevanceScore?: number
    confidence?: number
  }>
}

interface SmartSearchResult {
  file: DropboxFile
  relevanceScore: number
  relevantSections: string[]
  summary: string
  keyPoints: string[]
  reasoning: string
  confidence: number
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
  const [isSmartSearching, setIsSmartSearching] = useState(false)
  const [searchMetadata, setSearchMetadata] = useState<any>(null)
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

  // Smart Search met Gemini 2.5 Pro
  const performSmartSearch = async (userQuestion: string): Promise<SmartSearchResult[]> => {
    if (dropboxFiles.length === 0 || !accessToken) return []

    console.log('🏆 SMART SEARCH: Starting Gemini 2.5 Pro search...')
    setIsSmartSearching(true)

    try {
      const response = await fetch('/api/dropbox/smart-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: accessToken,
          query: userQuestion,
          files: dropboxFiles
        }),
      })

      if (!response.ok) {
        throw new Error(`Smart search failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        console.log(`🎯 Gemini 2.5 Pro Search resultaten:`, {
          relevantFiles: data.relevantFiles,
          totalFiles: data.totalFiles,
          averageConfidence: data.metadata?.averageConfidence,
          highestScore: data.metadata?.highestScore
        })
        
        setSearchMetadata(data.metadata)
        return data.results || []
      } else {
        throw new Error(data.error || 'Smart search failed')
      }

    } catch (error) {
      console.error('Gemini 2.5 Pro Smart search error:', error)
      return []
    } finally {
      setIsSmartSearching(false)
    }
  }

  // Prepare context from smart search results
  const prepareSmartSearchContext = (searchResults: SmartSearchResult[], userQuestion: string): string => {
    if (searchResults.length === 0) return ''

    let context = `
🏆 GEMINI 2.5 PRO SMART SEARCH RESULTATEN
VRAAG: ${userQuestion}
GEVONDEN: ${searchResults.length} relevante documenten uit ${dropboxFiles.length} bestanden
GEMIDDELDE CONFIDENCE: ${searchMetadata?.averageConfidence || 0}%
HOOGSTE RELEVANTIE SCORE: ${searchMetadata?.highestScore || 0}

INSTRUCTIE: Gebruik de onderstaande Gemini 2.5 Pro smart search resultaten om een uitgebreid, accuraat en professioneel antwoord te geven. Elke sectie is geanalyseerd door Gemini 2.5 Pro met geavanceerde reasoning en documentanalyse expertise.

=== GEMINI 2.5 PRO SMART SEARCH RESULTATEN ===
`

    searchResults.forEach((result, index) => {
      context += `

📄 DOCUMENT ${index + 1}: ${result.file.name}
🎯 RELEVANTIE SCORE: ${result.relevanceScore}/100
🔍 CONFIDENCE: ${result.confidence}%
🧠 GEMINI 2.5 PRO REASONING: ${result.reasoning}

📝 EXPERT SAMENVATTING: ${result.summary}

🔍 BELANGRIJKSTE PUNTEN:
${result.keyPoints.map(point => `• ${point}`).join('\n')}

📋 MEEST RELEVANTE SECTIES (door Gemini 2.5 Pro geselecteerd):
${result.relevantSections.map((section, i) => `
--- Expert Sectie ${i + 1} ---
${section}
`).join('\n')}
`
    })

    context += `

=== EINDE GEMINI 2.5 PRO SMART SEARCH RESULTATEN ===

Geef nu een uitgebreid, professioneel antwoord op de vraag: "${userQuestion}"

ANTWOORD VEREISTEN:
- Gebruik de Gemini 2.5 Pro geanalyseerde informatie uit de smart search resultaten
- Verwijs naar specifieke documenten met hun confidence scores waar relevant
- Geef stap-voor-stap instructies waar mogelijk
- Gebruik professionele terminologie
- Vermeld specifieke details, procedures, en instellingen waar beschikbaar
- Geef praktische tips en best practices
- Waarschuw voor potentiële valkuilen of belangrijke overwegingen
`

    return context
  }

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `Hallo! Ik ben BMaind 👋

**Welke vraag heb je over je documenten?**

Ik ben een intelligente AI-assistent gespecialiseerd in het analyseren van documentinhoud. Ik kan je helpen met:

• 📚 **Documentanalyse** - Begrijpen van complexe inhoud
• 🔍 **Informatie zoeken** - Vinden van specifieke details  
• 📝 **Samenvattingen** - Kernpunten uit lange documenten
• 📊 **Data-extractie** - Belangrijke gegevens identificeren
• 🎯 **Vraagbeantwoording** - Specifieke antwoorden uit je content
• 🔧 **Procedures** - Stap-voor-stap instructies
• ⚙️ **Best practices** - Aanbevelingen en tips

🏆 **Gemini 2.5 Pro Smart Search**: Ik doorzoek ${getFileCountText()} **met de meest geavanceerde AI** uit je Dropbox met superieure reasoning, documentanalyse expertise en diepgaande content analyse!

**Waarom Gemini 2.5 Pro?**
• 🧠 **Superieure reasoning** - Begrijpt complexe documentstructuren
• 🎯 **Documentanalyse expertise** - Herkent context en belangrijke informatie  
• 🔍 **Diepgaande analyse** - Vindt ook impliciete en gerelateerde informatie
• 💡 **Confidence scoring** - Betrouwbaarheidsscores voor elk resultaat
• ⚡ **Geavanceerde ranking** - Intelligente prioritering van resultaten

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
        aiModel: 'pro', // Gebruik Gemini 2.5 Pro voor de response
        useGrounding: false
      }

      // SMART SEARCH met Gemini 2.5 Pro
      if (dropboxFiles.length > 0 && accessToken) {
        console.log('🏆 Starting Gemini 2.5 Pro Smart Search...')
        
        // Perform smart search
        const smartSearchResults = await performSmartSearch(inputMessage.trim())
        
        if (smartSearchResults.length > 0) {
          const smartContext = prepareSmartSearchContext(smartSearchResults, inputMessage.trim())
          
          payload.message = `Je bent BMaind, een intelligente AI-assistent gespecialiseerd in documentanalyse. Beantwoord de volgende vraag op basis van de Gemini 2.5 Pro Smart Search resultaten uit Dropbox.

🏆 GEMINI 2.5 PRO SMART SEARCH INSTRUCTIES:
- De onderstaande informatie is geanalyseerd door Gemini 2.5 Pro met geavanceerde reasoning
- Elke sectie heeft een relevantiescore en confidence score van Gemini 2.5 Pro
- Gebruik de expert reasoning en documentanalyse context die Gemini 2.5 Pro heeft geïdentificeerd
- Geef een uitgebreid, professioneel antwoord met specifieke instructies
- Verwijs naar documenten met hun confidence scores waar relevant

${smartContext}`

          console.log('🎯 Gemini 2.5 Pro Smart Search completed:', {
            relevantFiles: smartSearchResults.length,
            totalFiles: dropboxFiles.length,
            averageConfidence: searchMetadata?.averageConfidence,
            averageRelevance: smartSearchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / smartSearchResults.length
          })
        } else {
          // Fallback to regular response if no relevant files found
          payload.message = `Je bent BMaind, een intelligente AI-assistent gespecialiseerd in documentanalyse. 

De Gemini 2.5 Pro Smart Search heeft geen relevante informatie gevonden in de ${dropboxFiles.length} Dropbox documenten voor deze vraag: "${inputMessage.trim()}"

Beantwoord de vraag op basis van je algemene kennis en documentanalyse expertise.

VRAAG: ${inputMessage.trim()}`
        }
      } else {
        payload.message = `Je bent BMaind, een intelligente AI-assistent gespecialiseerd in documentanalyse. Beantwoord de volgende vraag op basis van je expertise.

VRAAG: ${inputMessage.trim()}`
      }

      // Check message length
      if (payload.message.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Het bericht is te lang (${payload.message.length.toLocaleString()} tekens). Het maximum is ${MAX_MESSAGE_LENGTH.toLocaleString()} tekens.`)
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
              errorMessage = 'Bericht te groot. Probeer een kortere vraag.'
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
        userFriendlyMessage = 'Verzoek geannuleerd door timeout. De Gemini 2.5 Pro smart search duurde te lang.'
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
        content: `❌ **Fout bij Gemini 2.5 Pro Smart Search**

${userFriendlyMessage}

💡 **Tips:**
• Probeer het opnieuw
• Herlaad de pagina als het probleem aanhoudt
• Controleer je internetverbinding
• Controleer je Dropbox verbinding
• Voor complexe vragen: probeer de vraag op te splitsen`,
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
    setSearchMetadata(null)
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        id: 'welcome_new',
        type: 'assistant',
        content: `Hallo! Ik ben BMaind 👋

**Welke vraag heb je over je documenten?**

🏆 **Gemini 2.5 Pro Smart Search**: Ik doorzoek ${getFileCountText()} **met de meest geavanceerde AI** uit je Dropbox!

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
          <p className="text-sm">Om te kunnen chatten met je documenten</p>
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
              <h3 className="text-lg font-semibold" style={{color: '#233975'}}>BMaind Chat</h3>
              <p className="text-sm text-gray-600">
                🏆 Gemini 2.5 Pro Smart Search in ${getFileCountText()} uit Dropbox
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
              
              {/* Show Dropbox sources with enhanced metadata */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">🏆 Gemini 2.5 Pro Smart Search bronnen uit Dropbox:</p>
                  {searchMetadata && (
                    <div className="mb-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      📊 Avg. Confidence: {searchMetadata.averageConfidence}% | 🎯 Hoogste Score: {searchMetadata.highestScore}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {message.sources.slice(0, 3).map((source, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        {source.name}
                        {source.confidence && ` (${source.confidence}%)`}
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
                <span className="ml-2">🏆📁</span>
              </p>
            </div>
          </div>
        ))}

        {/* Smart Search Status */}
        {isSmartSearching && (
          <div className="flex justify-start">
            <div className="bg-purple-100 text-purple-900 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#7c3aed'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#7c3aed', animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#7c3aed', animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm font-medium">🏆 Gemini 2.5 Pro analyseert alle Dropbox bestanden...</span>
              </div>
              <p className="text-xs mt-1 ml-8">Geavanceerde AI reasoning door {dropboxFiles.length} documenten met documentanalyse expertise</p>
            </div>
          </div>
        )}

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
                <span className="text-xs text-gray-500 ml-2">🏆 Gemini 2.5 Pro response...</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !isStreaming && !isSmartSearching && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{backgroundColor: '#233975', animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">🏆 BMaind denkt na met Gemini 2.5 Pro...</span>
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
              placeholder="Stel je vraag over de documenten... (bijv. 'Wat zijn de belangrijkste punten in document X?')"
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:border-transparent"
              style={{'--tw-ring-color': '#233975'} as any}
              rows={2}
              disabled={isLoading || isSmartSearching}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isLoading || isSmartSearching || !inputMessage.trim()}
            className="px-6 py-3 text-white rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            style={{backgroundColor: '#233975', '--tw-ring-color': '#233975'} as any}
          >
            {isSmartSearching ? '🏆' : isLoading ? '🔍' : '🚀'}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            🏆 **GEMINI 2.5 PRO SMART SEARCH** door ${getFileCountText()} met superieure AI reasoning & documentanalyse expertise
          </span>
          <span>Enter = verzenden • Shift+Enter = nieuwe regel</span>
        </div>
      </div>
    </div>
  )
}