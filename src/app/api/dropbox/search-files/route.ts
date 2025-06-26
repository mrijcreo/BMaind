import { NextRequest, NextResponse } from 'next/server'

interface DropboxFile {
  id: string
  name: string
  path_lower: string
  size: number
  content_hash?: string
  is_downloadable: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, query, fileExtensions } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    // Search for files in Dropbox
    const searchResponse = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query || '',
        options: {
          path: '',
          max_results: 100,
          file_status: 'active',
          filename_only: false
        },
        match_field_options: {
          include_highlights: false
        }
      }),
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('Dropbox search error:', errorText)
      throw new Error(`Dropbox API error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    // Filter and format files
    const files: DropboxFile[] = searchData.matches
      .filter((match: any) => {
        const file = match.metadata.metadata
        if (file['.tag'] !== 'file') return false
        
        // Filter by file extensions if provided
        if (fileExtensions && fileExtensions.length > 0) {
          return fileExtensions.some((ext: string) => 
            file.name.toLowerCase().endsWith(ext.toLowerCase())
          )
        }
        
        return true
      })
      .map((match: any) => {
        const file = match.metadata.metadata
        return {
          id: file.id,
          name: file.name,
          path_lower: file.path_lower,
          size: file.size,
          content_hash: file.content_hash,
          is_downloadable: file.is_downloadable
        }
      })

    console.log(`Found ${files.length} files in Dropbox`)

    return NextResponse.json({
      success: true,
      files: files,
      total: files.length
    })

  } catch (error) {
    console.error('Dropbox search files error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to search Dropbox files',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}