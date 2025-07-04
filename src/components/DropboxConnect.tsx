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

interface DiagnosticStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'warning'
  message: string
  details?: string
  solution?: string
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
  const [retryCount, setRetryCount] = useState(0)
  const [isAutoRetrying, setIsAutoRetrying] = useState(false)
  
  // Diagnostic states
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([])
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)

  // Initialize diagnostic steps
  const initializeDiagnosticSteps = (): DiagnosticStep[] => [
    {
      id: 'env-check',
      name: '1. Environment Variables Check',
      status: 'pending',
      message: 'Controleren van Dropbox API configuratie...',
      details: 'Verificatie van NEXT_PUBLIC_DROPBOX_APP_KEY en DROPBOX_APP_SECRET',
      solution: 'Voeg de juiste environment variables toe aan .env.local'
    },
    {
      id: 'app-key-validation',
      name: '2. Dropbox App Key Validatie',
      status: 'pending',
      message: 'Valideren van Dropbox App Key format...',
      details: 'Controleren of de App Key het juiste format heeft',
      solution: 'Controleer je App Key in de Dropbox App Console'
    },
    {
      id: 'redirect-uri-check',
      name: '3. Redirect URI Configuratie',
      status: 'pending',
      message: 'Controleren van redirect URI configuratie...',
      details: 'Verificatie dat redirect URI correct is ingesteld',
      solution: 'Update redirect URI in Dropbox App Console'
    },
    {
      id: 'oauth-url-generation',
      name: '4. OAuth URL Generatie',
      status: 'pending',
      message: 'Genereren van Dropbox OAuth autorisatie URL...',
      details: 'Maken van de juiste OAuth URL met redirect URI en alle vereiste scopes',
      solution: 'Controleer redirect URI configuratie in Dropbox App Console'
    },
    {
      id: 'popup-test',
      name: '5. Popup Window Test',
      status: 'pending',
      message: 'Testen van popup window functionaliteit...',
      details: 'Controleren of browser popups toestaat',
      solution: 'Sta popups toe voor deze website in je browser instellingen'
    },
    {
      id: 'token-exchange',
      name: '6. Token Exchange Test',
      status: 'pending',
      message: 'Testen van OAuth token uitwisseling...',
      details: 'Simuleren van token exchange proces',
      solution: 'Controleer DROPBOX_APP_SECRET en redirect URI configuratie'
    },
    {
      id: 'api-permissions',
      name: '7. API Permissions Check',
      status: 'pending',
      message: 'Controleren van Dropbox API permissions...',
      details: 'Verificatie van files.metadata.read, files.content.read en account_info.read permissions',
      solution: 'Voeg de juiste permissions toe in Dropbox App Console'
    },
    {
      id: 'file-access-test',
      name: '8. File Access Test',
      status: 'pending',
      message: 'Testen van bestandstoegang...',
      details: 'Controleren of app bestanden kan lezen uit Dropbox',
      solution: 'Zorg dat app "Full Dropbox" toegang heeft (niet "App folder")'
    }
  ]

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

  // Get the correct redirect URI based on environment
  const getRedirectUri = (): string => {
    if (typeof window !== 'undefined') {
      // Use current origin for redirect URI
      return `${window.location.origin}/dropbox-callback`
    }
    // Fallback for SSR
    return `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dropbox-callback`
  }

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true)
    setShowDiagnostics(true)
    const steps = initializeDiagnosticSteps()
    setDiagnosticSteps(steps)

    // Step 1: Environment Variables Check
    await updateDiagnosticStep('env-check', 'running', 'Controleren van environment variables...')
    
    const clientId = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
    
    if (!clientId) {
      await updateDiagnosticStep('env-check', 'error', 
        'NEXT_PUBLIC_DROPBOX_APP_KEY niet gevonden!',
        'Deze environment variable is vereist voor Dropbox OAuth',
        'Voeg NEXT_PUBLIC_DROPBOX_APP_KEY toe aan je .env.local bestand'
      )
      setIsRunningDiagnostics(false)
      return
    }
    
    await updateDiagnosticStep('env-check', 'success', 
      `✅ Environment variables gevonden: App Key (${clientId.substring(0, 8)}...)`
    )

    // Step 2: App Key Validation
    await updateDiagnosticStep('app-key-validation', 'running', 'Valideren van App Key format...')
    
    if (clientId.length < 10 || !clientId.match(/^[a-zA-Z0-9]+$/)) {
      await updateDiagnosticStep('app-key-validation', 'error',
        'App Key heeft ongeldig format!',
        `App Key: ${clientId} lijkt niet geldig`,
        'Controleer je App Key in de Dropbox App Console en kopieer de juiste waarde'
      )
      setIsRunningDiagnostics(false)
      return
    }
    
    await updateDiagnosticStep('app-key-validation', 'success', 
      '✅ App Key format is geldig'
    )

    // Step 3: Redirect URI Check
    await updateDiagnosticStep('redirect-uri-check', 'running', 'Controleren van redirect URI...')
    
    const redirectUri = getRedirectUri()
    const expectedUris = [
      `${window.location.origin}/dropbox-callback`,
      'http://localhost:3000/dropbox-callback',
      'https://your-domain.netlify.app/dropbox-callback'
    ]
    
    await updateDiagnosticStep('redirect-uri-check', 'warning',
      `⚠️ Huidige redirect URI: ${redirectUri}`,
      `Zorg dat deze URI is toegevoegd in je Dropbox App Console.\n\nVerwachte URIs:\n${expectedUris.join('\n')}`,
      'Ga naar Dropbox App Console → Settings → Redirect URIs en voeg de juiste URI toe'
    )

    // Step 4: OAuth URL Generation
    await updateDiagnosticStep('oauth-url-generation', 'running', 'Genereren van OAuth URL...')
    
    try {
      // Updated scope to include account_info.read
      const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=files.metadata.read files.content.read account_info.read`
      
      await updateDiagnosticStep('oauth-url-generation', 'success',
        '✅ OAuth URL succesvol gegenereerd',
        `Redirect URI: ${redirectUri}\nScopes: files.metadata.read, files.content.read, account_info.read\n\nOAuth URL: ${authUrl}`
      )
    } catch (error) {
      await updateDiagnosticStep('oauth-url-generation', 'error',
        'Fout bij genereren OAuth URL',
        error instanceof Error ? error.message : 'Onbekende fout',
        'Controleer je browser console voor meer details'
      )
      setIsRunningDiagnostics(false)
      return
    }

    // Step 5: Popup Test
    await updateDiagnosticStep('popup-test', 'running', 'Testen van popup functionaliteit...')
    
    try {
      const testPopup = window.open('about:blank', 'test-popup', 'width=100,height=100')
      
      if (testPopup) {
        testPopup.close()
        await updateDiagnosticStep('popup-test', 'success', 
          '✅ Popup windows zijn toegestaan'
        )
      } else {
        await updateDiagnosticStep('popup-test', 'warning',
          '⚠️ Popup windows mogelijk geblokkeerd',
          'Browser blokkeert mogelijk popups voor deze site',
          'Sta popups toe voor deze website in je browser instellingen'
        )
      }
    } catch (error) {
      await updateDiagnosticStep('popup-test', 'error',
        'Popup test mislukt',
        error instanceof Error ? error.message : 'Onbekende fout',
        'Controleer je browser popup instellingen'
      )
    }

    // Step 6: Token Exchange Test (simulate)
    await updateDiagnosticStep('token-exchange', 'running', 'Testen van token exchange endpoint...')
    
    try {
      const testResponse = await fetch('/api/dropbox/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: 'test-code-for-validation',
          redirectUri: redirectUri
        })
      })
      
      const testData = await testResponse.json()
      
      if (testData.error && testData.error.includes('credentials not configured')) {
        await updateDiagnosticStep('token-exchange', 'error',
          '❌ DROPBOX_APP_SECRET niet geconfigureerd',
          'Server-side environment variable ontbreekt',
          'Voeg DROPBOX_APP_SECRET toe aan je .env.local bestand'
        )
      } else {
        await updateDiagnosticStep('token-exchange', 'success',
          '✅ Token exchange endpoint is bereikbaar'
        )
      }
    } catch (error) {
      await updateDiagnosticStep('token-exchange', 'error',
        'Token exchange endpoint niet bereikbaar',
        error instanceof Error ? error.message : 'Onbekende fout',
        'Controleer of je development server draait'
      )
    }

    // Step 7: API Permissions Check (if we have a token)
    if (accessToken) {
      await updateDiagnosticStep('api-permissions', 'running', 'Controleren van API permissions...')
      
      try {
        const accountResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: null,
        })

        if (accountResponse.ok) {
          await updateDiagnosticStep('api-permissions', 'success',
            '✅ API permissions zijn correct geconfigureerd'
          )
        } else {
          const errorText = await accountResponse.text()
          if (errorText.includes('missing_scope') && errorText.includes('account_info.read')) {
            await updateDiagnosticStep('api-permissions', 'error',
              '❌ Ontbrekende account_info.read permission',
              'De app heeft geen toestemming om account informatie te lezen',
              'Verbreek de verbinding en verbind opnieuw om de nieuwe permissions te krijgen'
            )
          } else {
            await updateDiagnosticStep('api-permissions', 'error',
              'API permissions fout',
              `HTTP ${accountResponse.status}: ${errorText}`,
              'Controleer je Dropbox App permissions in de App Console'
            )
          }
        }
      } catch (error) {
        await updateDiagnosticStep('api-permissions', 'error',
          'API permissions test mislukt',
          error instanceof Error ? error.message : 'Onbekende fout',
          'Controleer je internetverbinding en Dropbox API status'
        )
      }

      // Step 8: File Access Test
      await updateDiagnosticStep('file-access-test', 'running', 'Testen van bestandstoegang...')
      
      try {
        const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: '',
            recursive: false,
            limit: 1
          }),
        })

        if (listResponse.ok) {
          await updateDiagnosticStep('file-access-test', 'success',
            '✅ Bestandstoegang werkt correct'
          )
        } else {
          const errorText = await listResponse.text()
          if (errorText.includes('invalid_argument') || errorText.includes('not_found')) {
            await updateDiagnosticStep('file-access-test', 'error',
              '❌ App folder configuratie probleem',
              'App is geconfigureerd voor "App folder" in plaats van "Full Dropbox"',
              'Ga naar Dropbox App Console → Settings → Choose "Full Dropbox" access'
            )
          } else {
            await updateDiagnosticStep('file-access-test', 'error',
              'Bestandstoegang mislukt',
              `HTTP ${listResponse.status}: ${errorText}`,
              'Controleer je Dropbox App configuratie'
            )
          }
        }
      } catch (error) {
        await updateDiagnosticStep('file-access-test', 'error',
          'Bestandstoegang test mislukt',
          error instanceof Error ? error.message : 'Onbekende fout',
          'Controleer je internetverbinding'
        )
      }
    } else {
      await updateDiagnosticStep('api-permissions', 'warning',
        '⚠️ Geen access token beschikbaar',
        'Kan API permissions niet testen zonder actieve verbinding',
        'Verbind eerst met Dropbox om deze test uit te voeren'
      )
      await updateDiagnosticStep('file-access-test', 'warning',
        '⚠️ Geen access token beschikbaar',
        'Kan bestandstoegang niet testen zonder actieve verbinding',
        'Verbind eerst met Dropbox om deze test uit te voeren'
      )
    }

    setIsRunningDiagnostics(false)
  }

  // Helper function to update diagnostic step
  const updateDiagnosticStep = async (
    stepId: string, 
    status: DiagnosticStep['status'], 
    message: string, 
    details?: string, 
    solution?: string
  ) => {
    setDiagnosticSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, details, solution }
        : step
    ))
    
    // Reduced delay for faster diagnostics
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Optimized Dropbox OAuth flow with faster processing and better error recovery
  const connectToDropbox = () => {
    setIsConnecting(true)
    setError('')
    setConfigurationError(null)
    setIsAutoRetrying(false)

    // Dropbox OAuth URL with correct redirect URI and updated scopes
    const clientId = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
    if (!clientId) {
      setError('Dropbox App Key niet geconfigureerd. Voeg NEXT_PUBLIC_DROPBOX_APP_KEY toe aan environment variables.')
      setIsConnecting(false)
      return
    }

    const redirectUri = getRedirectUri()
    // Updated scope to include account_info.read
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=files.metadata.read files.content.read account_info.read`

    console.log('🔗 Starting optimized Dropbox OAuth flow:', {
      redirectUri,
      scopes: 'files.metadata.read files.content.read account_info.read',
      timestamp: new Date().toISOString(),
      attempt: retryCount + 1,
      optimizations: 'fast-retry, reduced-timeouts, immediate-processing'
    })

    // Open popup for OAuth with optimized settings for faster loading
    const popup = window.open(
      authUrl,
      'dropbox-auth',
      'width=600,height=700,scrollbars=yes,resizable=yes,location=yes,status=yes,toolbar=no,menubar=no'
    )

    if (!popup) {
      setError('Popup geblokkeerd door browser. Sta popups toe voor deze website en probeer opnieuw.')
      setIsConnecting(false)
      return
    }

    // Listen for popup messages with improved handling and faster processing
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      console.log('📨 Received message from popup:', event.data.type)

      if (event.data.type === 'DROPBOX_AUTH_SUCCESS') {
        const { accessToken } = event.data
        handleAuthSuccess(accessToken)
        popup?.close()
        window.removeEventListener('message', messageListener)
        setRetryCount(0) // Reset retry count on success
      } else if (event.data.type === 'DROPBOX_AUTH_ERROR') {
        const errorMessage = event.data.userMessage || event.data.error || 'Onbekende fout'
        
        console.log('❌ Auth error received:', {
          errorType: event.data.errorType,
          shouldRetry: event.data.shouldRetry,
          fastRetry: event.data.fastRetry,
          attempt: retryCount + 1
        })
        
        // Handle specific error types with optimized retry logic
        if (event.data.errorType === 'expired_code') {
          setError(`⚠️ Autorisatie code verlopen (poging ${retryCount + 1}). ${event.data.fastRetry ? 'Probeer direct opnieuw voor snellere verwerking.' : 'Klik direct op "Toestaan" in Dropbox.'}`)
          
          // Implement fast retry for expired codes
          if (event.data.fastRetry && retryCount < 3) {
            setIsAutoRetrying(true)
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              connectToDropbox()
            }, 200) // Very fast retry
          } else {
            setRetryCount(prev => prev + 1)
          }
        } else if (event.data.errorType === 'timeout') {
          setError('⏰ Verbinding time-out. Probeer direct opnieuw - de verbinding wordt nu sneller verwerkt.')
          
          // Fast retry for timeouts
          if (event.data.fastRetry && retryCount < 2) {
            setIsAutoRetrying(true)
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              connectToDropbox()
            }, 300)
          } else {
            setRetryCount(prev => prev + 1)
          }
        } else if (event.data.errorType === 'invalid_credentials') {
          setError('❌ Dropbox app configuratie fout: ' + errorMessage)
          setConfigurationError({
            step1: 'Ga naar https://www.dropbox.com/developers/apps',
            step2: 'Selecteer je app',
            step3: 'Controleer App Key en App Secret',
            step4: `Voeg deze redirect URI toe: ${redirectUri}`,
            step5: 'Zorg dat "Full Dropbox" toegang is geselecteerd',
            step6: 'Voeg deze permissions toe: files.metadata.read, files.content.read, account_info.read'
          })
        } else {
          setError('Dropbox autorisatie mislukt: ' + errorMessage)
          
          // Fast retry for generic errors if supported
          if (event.data.fastRetry && retryCount < 2) {
            setIsAutoRetrying(true)
            setTimeout(() => {
              setRetryCount(prev => prev + 1)
              connectToDropbox()
            }, 500)
          } else {
            setRetryCount(prev => prev + 1)
          }
        }
        
        if (!event.data.fastRetry || retryCount >= 2) {
          setIsConnecting(false)
          setIsAutoRetrying(false)
        }
        
        popup?.close()
        window.removeEventListener('message', messageListener)
      } else if (event.data.type === 'DROPBOX_AUTH_RETRY') {
        // User clicked retry in the callback window
        console.log('🔄 User requested retry from callback window')
        popup?.close()
        window.removeEventListener('message', messageListener)
        // Automatically retry the connection with minimal delay
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          connectToDropbox()
        }, 200)
      }
    }

    window.addEventListener('message', messageListener)

    // Handle popup closed manually with improved detection
    let checkClosedInterval: NodeJS.Timeout
    const checkClosed = () => {
      try {
        if (popup?.closed) {
          clearInterval(checkClosedInterval)
          setIsConnecting(false)
          setIsAutoRetrying(false)
          window.removeEventListener('message', messageListener)
          
          // Only show error if not auto-retrying and no previous errors
          if (!isAutoRetrying && retryCount === 0 && !error) {
            setError('Verbinding geannuleerd. Popup venster werd gesloten voordat de autorisatie voltooid was.')
          }
        }
      } catch (error) {
        // Popup might be from different origin, ignore cross-origin errors
        clearInterval(checkClosedInterval)
        setIsConnecting(false)
        setIsAutoRetrying(false)
        window.removeEventListener('message', messageListener)
      }
    }

    checkClosedInterval = setInterval(checkClosed, 1000)

    // Reduced timeout for the entire process to prevent code expiration
    setTimeout(() => {
      if (popup && !popup.closed) {
        console.log('⏰ OAuth process timeout - closing popup and implementing fast retry')
        popup.close()
        clearInterval(checkClosedInterval)
        window.removeEventListener('message', messageListener)
        
        if (retryCount < 2) {
          setError('Verbinding time-out. Probeer direct opnieuw - de verbinding wordt nu sneller verwerkt.')
          setIsAutoRetrying(true)
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            connectToDropbox()
          }, 500)
        } else {
          setIsConnecting(false)
          setIsAutoRetrying(false)
          setError('Verbinding time-out na meerdere pogingen. Controleer je internetverbinding en probeer later opnieuw.')
        }
      }
    }, 45000) // Reduced to 45 seconds with auto-retry capability
  }

  const handleAuthSuccess = async (token: string) => {
    try {
      console.log('✅ Handling auth success with optimized flow')
      setAccessToken(token)
      localStorage.setItem('dropbox_access_token', token)
      setIsConnected(true)
      setIsConnecting(false)
      setIsAutoRetrying(false)
      onConnectionChange(true)
      
      // Clear any previous errors
      setError('')
      setConfigurationError(null)
      
      // Load files from Dropbox
      await loadDropboxFiles(token)
    } catch (error) {
      console.error('Error handling auth success:', error)
      setError('Fout bij het opslaan van Dropbox verbinding')
      setIsConnecting(false)
      setIsAutoRetrying(false)
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
    setShowDiagnostics(false)
    setDiagnosticSteps([])
    setRetryCount(0)
    setIsAutoRetrying(false)
    onConnectionChange(false)
    onFilesLoaded([])
  }

  const refreshFiles = () => {
    if (accessToken) {
      loadDropboxFiles(accessToken, true) // Pass true to indicate this is a manual refresh
    }
  }

  // Get status icon for diagnostic step
  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'running': return '🔄'
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return '❓'
    }
  }

  // Get status color for diagnostic step
  const getStatusColor = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500'
      case 'running': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-500'
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
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={connectToDropbox}
              disabled={isConnecting || isAutoRetrying}
              className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors font-medium disabled:opacity-50"
              style={{backgroundColor: '#0061FF'}}
            >
              {isAutoRetrying ? '🔄 Automatisch opnieuw proberen...' : 
               isConnecting ? '🔄 Verbinden...' : 
               retryCount > 0 ? `🚀 Snelle Retry (${retryCount + 1})` :
               '🔗 Verbind met Dropbox'}
            </button>
            
            <button
              onClick={runDiagnostics}
              disabled={isRunningDiagnostics}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isRunningDiagnostics ? '🔍 Diagnostiek loopt...' : '🔧 Run Verbinding Diagnostiek'}
            </button>
          </div>
          
          {error && (
            <div className={`mt-4 p-3 rounded-lg ${
              error.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : error.includes('⚠️')
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <p className="text-sm">{error}</p>
              {error.includes('verlopen') && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  💡 <strong>Snelle Tip:</strong> Autorisatie codes verlopen binnen 10 minuten. Voor optimale resultaten:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Klik direct op "Toestaan" wanneer Dropbox om toestemming vraagt</li>
                    <li>De verbinding wordt nu sneller verwerkt met automatische retry</li>
                    <li>Sluit geen vensters tot de verbinding bevestigd is</li>
                  </ul>
                </div>
              )}
              {error.includes('popup') && (
                <p className="text-xs mt-2 opacity-75">
                  💡 Tip: Controleer je browser instellingen en sta popups toe voor deze website.
                </p>
              )}
              {error.includes('time-out') && (
                <p className="text-xs mt-2 opacity-75">
                  💡 Tip: De verbinding wordt nu sneller verwerkt. Probeer direct opnieuw.
                </p>
              )}
            </div>
          )}

          {/* Configuration Error Help */}
          {configurationError && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
              <h5 className="font-semibold text-yellow-800 mb-2">🔧 Dropbox App Configuratie Vereist</h5>
              <p className="text-sm text-yellow-700 mb-3">
                Je Dropbox app moet correct geconfigureerd worden:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Ga naar <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">Dropbox App Console</a></li>
                <li>Selecteer je app</li>
                <li>Zorg dat <strong>"Full Dropbox"</strong> toegang is geselecteerd (niet "App folder")</li>
                <li>Voeg deze redirect URI toe: <code className="bg-yellow-100 px-1 rounded">{getRedirectUri()}</code></li>
                <li>Controleer dat deze permissions zijn ingeschakeld:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• files.metadata.read</li>
                    <li>• files.content.read</li>
                    <li>• <strong>account_info.read</strong> (nieuw vereist)</li>
                  </ul>
                </li>
                <li>Herverbind je Dropbox account in deze applicatie</li>
              </ol>
            </div>
          )}

          {/* Diagnostics Panel */}
          {showDiagnostics && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-gray-800">🔍 Verbinding Diagnostiek</h5>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Sluiten
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {diagnosticSteps.map((step) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getStatusIcon(step.status)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h6 className={`font-medium text-sm ${getStatusColor(step.status)}`}>
                            {step.name}
                          </h6>
                          {step.status === 'running' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                        
                        {step.details && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-line">
                            <strong>Details:</strong> {step.details}
                          </div>
                        )}
                        
                        {step.solution && step.status === 'error' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Oplossing:</strong> {step.solution}
                          </div>
                        )}
                        
                        {step.solution && step.status === 'warning' && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                            <strong>Aanbeveling:</strong> {step.solution}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {!isRunningDiagnostics && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={runDiagnostics}
                    className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Diagnostiek Opnieuw Uitvoeren
                  </button>
                </div>
              )}
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
                <li>Controleer permissions: files.metadata.read, files.content.read, <strong>account_info.read</strong></li>
                <li>Klik op "Verbreek verbinding" en verbind opnieuw</li>
              </ol>
            </div>
          )}

          {/* Advanced Diagnostics Button for Connected State */}
          <div className="mb-4">
            <button
              onClick={runDiagnostics}
              disabled={isRunningDiagnostics}
              className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isRunningDiagnostics ? '🔍 Diagnostiek loopt...' : '🔧 Geavanceerde Diagnostiek'}
            </button>
          </div>

          {/* Diagnostics Panel for Connected State */}
          {showDiagnostics && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-gray-800">🔍 Verbinding Diagnostiek</h5>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Sluiten
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {diagnosticSteps.map((step) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getStatusIcon(step.status)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h6 className={`font-medium text-sm ${getStatusColor(step.status)}`}>
                            {step.name}
                          </h6>
                          {step.status === 'running' && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                        
                        {step.details && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-line">
                            <strong>Details:</strong> {step.details}
                          </div>
                        )}
                        
                        {step.solution && step.status === 'error' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            <strong>Oplossing:</strong> {step.solution}
                          </div>
                        )}
                        
                        {step.solution && step.status === 'warning' && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                            <strong>Aanbeveling:</strong> {step.solution}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {!isRunningDiagnostics && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={runDiagnostics}
                    className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Diagnostiek Opnieuw Uitvoeren
                  </button>
                </div>
                )}
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