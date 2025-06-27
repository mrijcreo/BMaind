import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    const clientId = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
    const clientSecret = process.env.DROPBOX_APP_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Dropbox credentials not configured' },
        { status: 500 }
      )
    }

    // Use the provided redirectUri or construct a default one
    const finalRedirectUri = redirectUri || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dropbox-callback`

    console.log('🔗 Token exchange request:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri: finalRedirectUri,
      codeLength: code.length,
      timestamp: new Date().toISOString()
    })

    // Reduced timeout to 6 seconds for faster failure detection
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      // Exchange code for access token immediately with optimized fetch options
      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CanvasCoach/1.0',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          code: code,
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: finalRedirectUri
        }),
        signal: controller.signal,
        // Add keepalive and priority for better performance
        keepalive: true,
        priority: 'high' as RequestPriority
      })

      clearTimeout(timeoutId)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Dropbox token exchange error:', errorText)
        
        // Parse the error response to provide better user feedback
        let parsedError
        try {
          parsedError = JSON.parse(errorText)
        } catch {
          parsedError = { error: 'unknown', error_description: errorText }
        }

        // Handle specific error cases with improved messaging
        if (parsedError.error === 'invalid_grant') {
          console.log('🔄 Authorization code expired or invalid - implementing faster retry strategy')
          return NextResponse.json(
            { 
              error: 'Authorization code expired or invalid',
              details: 'De autorisatie code is verlopen of al gebruikt. Dit gebeurt vaak bij langzame verbindingen.',
              errorType: 'expired_code',
              userMessage: 'Autorisatie code verlopen. Probeer opnieuw en klik direct op "Toestaan".',
              shouldRetry: true,
              retryDelay: 500, // Reduced retry delay for faster recovery
              fastRetry: true // Flag for immediate retry without delay
            },
            { status: 400 }
          )
        }

        if (parsedError.error === 'invalid_client') {
          return NextResponse.json(
            { 
              error: 'Invalid Dropbox app credentials',
              details: 'The Dropbox app key or secret is incorrect.',
              errorType: 'invalid_credentials',
              userMessage: 'Dropbox app configuratie is onjuist. Controleer je app instellingen.',
              shouldRetry: false
            },
            { status: 400 }
          )
        }

        // Check for redirect URI mismatch
        if (parsedError.error_description && parsedError.error_description.includes('redirect_uri')) {
          return NextResponse.json(
            { 
              error: 'Redirect URI mismatch',
              details: `The redirect URI ${finalRedirectUri} is not registered in your Dropbox app.`,
              errorType: 'redirect_uri_mismatch',
              userMessage: `Redirect URI probleem. Voeg ${finalRedirectUri} toe aan je Dropbox App Console.`,
              shouldRetry: false,
              configurationHelp: {
                step1: 'Ga naar https://www.dropbox.com/developers/apps',
                step2: 'Selecteer je app',
                step3: 'Ga naar Settings tab',
                step4: `Voeg deze URI toe onder "Redirect URIs": ${finalRedirectUri}`,
                step5: 'Sla op en probeer opnieuw te verbinden'
              }
            },
            { status: 400 }
          )
        }

        // Generic error handling with faster retry
        return NextResponse.json(
          { 
            error: 'Token exchange failed',
            details: parsedError.error_description || errorText,
            errorType: 'token_exchange_failed',
            userMessage: 'Fout bij Dropbox autorisatie. Probeer het opnieuw.',
            shouldRetry: true,
            retryDelay: 500,
            fastRetry: true
          },
          { status: tokenResponse.status }
        )
      }

      const tokenData = await tokenResponse.json()

      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        accountId: tokenData.account_id,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        accountId: tokenData.account_id
      })

    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('⏰ Token exchange timeout - implementing fast retry')
        return NextResponse.json(
          { 
            error: 'Request timeout',
            details: 'The token exchange request timed out',
            errorType: 'timeout',
            userMessage: 'Verbinding time-out. Probeer direct opnieuw.',
            shouldRetry: true,
            retryDelay: 500,
            fastRetry: true
          },
          { status: 408 }
        )
      }
      
      throw fetchError
    }

  } catch (error) {
    console.error('Dropbox auth error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to authenticate with Dropbox',
        details: errorMessage,
        errorType: 'server_error',
        userMessage: 'Server fout bij Dropbox autorisatie. Probeer opnieuw.',
        shouldRetry: true,
        retryDelay: 1000,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}