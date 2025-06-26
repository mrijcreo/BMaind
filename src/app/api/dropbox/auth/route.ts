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
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
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
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}