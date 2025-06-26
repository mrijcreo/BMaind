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

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dropbox-callback`
      }),
    })

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

      // Handle specific error cases
      if (parsedError.error === 'invalid_grant') {
        return NextResponse.json(
          { 
            error: 'Authorization code expired or invalid',
            details: 'The authorization code has expired or was already used. Please try connecting to Dropbox again.',
            errorType: 'expired_code',
            userMessage: 'De autorisatie code is verlopen. Probeer opnieuw verbinding te maken met Dropbox.',
            shouldRetry: true
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

      // Generic error handling
      return NextResponse.json(
        { 
          error: 'Token exchange failed',
          details: parsedError.error_description || errorText,
          errorType: 'token_exchange_failed',
          userMessage: 'Fout bij Dropbox autorisatie. Probeer het opnieuw.',
          shouldRetry: true
        },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      success: true,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      accountId: tokenData.account_id
    })

  } catch (error) {
    console.error('Dropbox auth error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to authenticate with Dropbox',
        details: errorMessage,
        errorType: 'server_error',
        userMessage: 'Server fout bij Dropbox autorisatie. Probeer het later opnieuw.',
        shouldRetry: true,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}