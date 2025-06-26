'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DropboxCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [shouldRetry, setShouldRetry] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`Dropbox autorisatie geweigerd: ${error}`)
        setShouldRetry(true)
        
        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'DROPBOX_AUTH_ERROR',
            error: error,
            shouldRetry: true
          }, window.location.origin)
        }
        return
      }

      if (!code) {
        setStatus('error')
        setMessage('Geen autorisatie code ontvangen van Dropbox')
        setShouldRetry(true)
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'DROPBOX_AUTH_ERROR',
            error: 'No authorization code received',
            shouldRetry: true
          }, window.location.origin)
        }
        return
      }

      try {
        // Exchange code for access token
        const response = await fetch('/api/dropbox/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            redirectUri: window.location.origin + '/dropbox-callback'
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage('Dropbox verbinding succesvol!')
          
          // Send success to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'DROPBOX_AUTH_SUCCESS',
              accessToken: data.accessToken
            }, window.location.origin)
          }
        } else {
          // Handle specific error types from the API
          const errorMessage = data.userMessage || data.error || 'Authentication failed'
          const retryable = data.shouldRetry !== false
          
          setStatus('error')
          setMessage(errorMessage)
          setShouldRetry(retryable)
          
          if (window.opener) {
            window.opener.postMessage({
              type: 'DROPBOX_AUTH_ERROR',
              error: data.error || 'Authentication failed',
              userMessage: errorMessage,
              errorType: data.errorType,
              shouldRetry: retryable
            }, window.location.origin)
          }
        }
      } catch (error) {
        console.error('Dropbox callback error:', error)
        const errorMessage = 'Fout bij Dropbox autorisatie: ' + (error instanceof Error ? error.message : 'Onbekende fout')
        
        setStatus('error')
        setMessage(errorMessage)
        setShouldRetry(true)
        
        if (window.opener) {
          window.opener.postMessage({
            type: 'DROPBOX_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
            userMessage: errorMessage,
            shouldRetry: true
          }, window.location.origin)
        }
      }
    }

    handleCallback()
  }, [searchParams])

  const handleRetry = () => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'DROPBOX_AUTH_RETRY'
      }, window.location.origin)
    }
    window.close()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Dropbox Autorisatie
              </h2>
              <p className="text-gray-600">
                Bezig met het verwerken van je Dropbox autorisatie...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Verbinding Succesvol!
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <p className="text-sm text-gray-500">
                Je kunt dit venster nu sluiten.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Verbinding Mislukt
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <div className="space-y-2">
                {shouldRetry && (
                  <button
                    onClick={handleRetry}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Probeer Opnieuw
                  </button>
                )}
                <button
                  onClick={() => window.close()}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Venster Sluiten
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}