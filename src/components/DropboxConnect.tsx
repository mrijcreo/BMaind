'use client'

import { useState, useEffect } from 'react'

interface DropboxFile {
  id: string
  name: string
  path_lower: string
  size: number
  content_hash?: string
  is_downloadable: boolean
}

interface DropboxConnectProps {
  onFilesLoaded: (files: DropboxFile[]) => void
  onConnectionChange: (connected: boolean) => void
}

export default function DropboxConnect({ onFilesLoaded, onConnectionChange }: DropboxConnectProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [availableFiles, setAvailableFiles] = useState<DropboxFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [error, setError] = useState<string>('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [configurationError, setConfigurationError] = useState<any>(null)

  // Check for existing connection on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('dropbox_access_token')
    if (savedToken) {
      setAccessToken(savedToken)
      setIsConnected(true)
      onConnectionChange(true)
      loadDropboxFiles(savedToken)
    }
  }, [])

  // Dropbox OAuth flow
  const connectToDropbox = () => {
    setIsConnecting(true)
    setError('')
    setConfigurationError(null)

    // Dropbox OAuth URL
    const clientId = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
    if (!clientId) {
      setError('Dropbox App Key niet geconfigureerd. Voeg NEXT_PUBLIC_DROPBOX_APP_KEY toe aan environment variables.')
      setIsConnecting(false)
      return
    }

    const redirectUri = `${window.location.origin}/dropbox-callback`
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=files.metadata.read files.content.read`

    // Open popup for OAuth
    const popup = window.open(
      authUrl,
      'dropbox-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )

    // Listen for popup messages
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'DROPBOX_AUTH_SUCCESS') {
        const { accessToken } = event.data
        handleAuthSuccess(accessToken)
        popup?.close()
        window.removeEventListener('message', messageListener)
      } else if (event.data.type === 'DROPBOX_AUTH_ERROR') {
        setError('Dropbox autorisatie mislukt: ' + event.data.error)
        setIsConnecting(false)
        popup?.close()
        window.removeEventListener('message', messageListener)
      }
    }

    window.addEventListener('message', messageListener)

    // Handle popup closed manually
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed)
        setIsConnecting(false)
        window.removeEventListener('message', messageListener)
      }
    }, 1000)
  }

  const handleAuthSuccess = async (token: string) => {
    try {
      setAccessToken(token)
      localStorage.setItem('dropbox_access_token', token)
      setIsConnected(true)
      setIsConnecting(false)
      onConnectionChange(true)
      
      // Load files from Dropbox
      await loadDropboxFiles(token)
    } catch (error) {
      console.error('Error handling auth success:', error)
      setError('Fout bij het opslaan van Dropbox verbinding')
      setIsConnecting(false)
    }
  }

  const loadDropboxFiles = async (token: string, showRefreshMessage: boolean = false) => {
    setIsLoadingFiles(true)
    setError('')
    setConfigurationError(null)

    if (showRefreshMessage) {
      console.log('🔄 Refreshing Dropbox files...')
    }

    try {
      // Search for PDF files in Dropbox with expanded search
      const response = await fetch('/api/dropbox/search-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accessToken: token,
          query: '', // Empty query to get all files
          fileExtensions: ['.pdf', '.docx', '.txt', '.md'],
          forceRefresh: showRefreshMessage // Add flag to indicate this is a refresh
        }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        const previousCount = availableFiles.length
        const newCount = data.files.length
        
        setAvailableFiles(data.files)
        onFilesLoaded(data.files)
        setLastRefresh(new Date())
        
        if (showRefreshMessage) {
          if (newCount > previousCount) {
            console.log(`✅ Refresh completed: ${newCount - previousCount} nieuwe bestanden gevonden!`)
            setError(`✅ Refresh succesvol! ${newCount - previousCount} nieuwe bestanden gevonden.`)
            setTimeout(() => setError(''), 5000)
          } else if (newCount < previousCount) {
            console.log(`✅ Refresh completed: ${previousCount - newCount} bestanden verwijderd.`)
            setError(`✅ Refresh succesvol! ${previousCount - newCount} bestanden verwijderd.`)
            setTimeout(() => setError(''), 5000)
          } else {
            console.log(`✅ Refresh completed: Geen wijzigingen gevonden.`)
            setError(`✅ Refresh succesvol! Geen wijzigingen gevonden.`)
            setTimeout(() => setError(''), 3000)
          }
        }
        
        console.log(`📁 Loaded ${data.files.length} files from Dropbox`)
      } else {
        // Handle specific error cases
        if (data.needsReauth) {
          // Token is invalid, need to reconnect
          disconnectDropbox()
          setError('Dropbox verbinding verlopen. Klik op "Verbind met Dropbox" om opnieuw te verbinden.')
          return
        }
        
        if (data.configurationHelp) {
          // Configuration error - show detailed help
          setConfigurationError(data.configurationHelp)
          setError('Dropbox app configuratie probleem gedetecteerd. Zie onderstaande instructies.')
          return
        }
        
        throw new Error(data.error || data.details || 'Failed to load files')
      }
    } catch (error) {
      console.error('Error loading Dropbox files:', error)
      const errorMessage = 'Fout bij het laden van Dropbox bestanden: ' + (error instanceof Error ? error.message : 'Onbekende fout')
      setError(errorMessage)
      
      if (showRefreshMessage) {
        setTimeout(() => setError(''), 8000) // Longer timeout for error messages during refresh
      }
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const disconnectDropbox = () => {
    localStorage.removeItem('dropbox_access_token')
    setAccessToken(null)
    setIsConnected(false)
    setAvailableFiles([])
    setLastRefresh(null)
    setConfigurationError(null)
    onConnectionChange(false)
    onFilesLoaded([])
  }

  const refreshFiles = () => {
    if (accessToken) {
      loadDropboxFiles(accessToken, true) // Pass true to indicate this is a manual refresh
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center" style={{color: '#233975'}}>
          <svg className="w-5 h-5 mr-2" style={{color: '#0061FF'}} fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.71 6.71C7.31 6.31 6.69 6.31 6.29 6.71L1.71 11.29C1.31 11.69 1.31 12.31 1.71 12.71L6.29 17.29C6.69 17.69 7.31 17.69 7.71 17.29C8.11 16.89 8.11 16.27 7.71 15.87L4.83 13H11C15.97 13 20 9.97 20 5C20 4.45 19.55 4 19 4S18 4.45 18 5C18 8.86 14.86 12 11 12H4.83L7.71 9.13C8.11 8.73 8.11 8.11 7.71 7.71Z"/>
          </svg>
          Dropbox Verbinding
        </h3>
        
        {isConnected && (
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshFiles}
              disabled={isLoadingFiles}
              className={`px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
                isLoadingFiles 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'hover:opacity-90'
              }`}
              style={isLoadingFiles ? {} : {backgroundColor: '#eec434', color: '#233975'}}
              title="Ververs bestandslijst uit Dropbox"
            >
              {isLoadingFiles ? (
                <span className="flex items-center space-x-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Ververs...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Ververs</span>
                </span>
              )}
            </button>
            <button
              onClick={disconnectDropbox}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Verbreek verbinding
            </button>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#f0f8ff'}}>
            <svg className="w-8 h-8" style={{color: '#0061FF'}} fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.71 6.71C7.31 6.31 6.69 6.31 6.29 6.71L1.71 11.29C1.31 11.69 1.31 12.31 1.71 12.71L6.29 17.29C6.69 17.69 7.31 17.69 7.71 17.29C8.11 16.89 8.11 16.27 7.71 15.87L4.83 13H11C15.97 13 20 9.97 20 5C20 4.45 19.55 4 19 4S18 4.45 18 5C18 8.86 14.86 12 11 12H4.83L7.71 9.13C8.11 8.73 8.11 8.11 7.71 7.71Z"/>
            </svg>
          </div>
          
          <h4 className="text-xl font-bold mb-2" style={{color: '#233975'}}>
            Verbind met Dropbox
          </h4>
          <p className="text-gray-600 mb-6">
            Geef Canvas Coach toegang tot je Canvas handleidingen in Dropbox voor geavanceerde zoekfunctionaliteit.
          </p>
          
          <button
            onClick={connectToDropbox}
            disabled={isConnecting}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50"
            style={{backgroundColor: '#0061FF'}}
          >
            {isConnecting ? '🔄 Verbinden...' : '🔗 Verbind met Dropbox'}
          </button>
          
          {error && (
            <div className={`mt-4 p-3 rounded-lg ${
              error.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Configuration Error Help */}
          {configurationError && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
              <h5 className="font-semibold text-yellow-800 mb-2">🔧 Dropbox App Configuratie Vereist</h5>
              <p className="text-sm text-yellow-700 mb-3">
                Je Dropbox app moet correct geconfigureerd worden voor volledige toegang:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Ga naar <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">Dropbox App Console</a></li>
                <li>Selecteer je app</li>
                <li>Zorg dat <strong>"Full Dropbox"</strong> toegang is geselecteerd (niet "App folder")</li>
                <li>Controleer dat deze permissions zijn ingeschakeld:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• files.metadata.read</li>
                    <li>• files.content.read</li>
                  </ul>
                </li>
                <li>Herverbind je Dropbox account in deze applicatie</li>
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">Verbonden met Dropbox</span>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500 block">
                {availableFiles.length} bestanden gevonden
              </span>
              {lastRefresh && (
                <span className="text-xs text-gray-400">
                  Laatste update: {lastRefresh.toLocaleTimeString('nl-NL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Status/Error Messages */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg ${
              error.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Configuration Error Help (when connected but having issues) */}
          {configurationError && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2">🔧 Configuratie Probleem</h5>
              <p className="text-sm text-yellow-700 mb-3">
                Er is een probleem met je Dropbox app configuratie:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Ga naar <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">Dropbox App Console</a></li>
                <li>Selecteer je app</li>
                <li>Zorg dat <strong>"Full Dropbox"</strong> toegang is geselecteerd</li>
                <li>Controleer permissions: files.metadata.read, files.content.read</li>
                <li>Klik op "Verbreek verbinding" en verbind opnieuw</li>
              </ol>
            </div>
          )}

          {isLoadingFiles ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{borderColor: '#233975'}}></div>
              <p className="text-gray-600">
                {lastRefresh ? 'Dropbox wordt ververst...' : 'Bestanden laden uit Dropbox...'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Zoekt naar nieuwe PDF's, DOCX, TXT en MD bestanden
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-gray-800">Beschikbare Canvas Handleidingen:</h5>
                <button
                  onClick={refreshFiles}
                  disabled={isLoadingFiles}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                  title="Ververs lijst"
                >
                  🔄 Ververs lijst
                </button>
              </div>
              
              {availableFiles.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {file.name.toLowerCase().endsWith('.pdf') ? '📄' : 
                           file.name.toLowerCase().endsWith('.docx') ? '📝' : '📋'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Beschikbaar voor zoeken"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>Geen Canvas handleidingen gevonden in je Dropbox.</p>
                  <p className="text-sm mt-1">Upload PDF's of DOCX bestanden naar je Dropbox en klik op "Ververs".</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}