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
    const { accessToken, query, fileExtensions, forceRefresh } = await request.json()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      )
    }

    if (forceRefresh) {
      console.log('🔄 Force refresh requested - performing comprehensive Dropbox search')
    }

    // Use list_folder for comprehensive file discovery instead of search
    // This ensures we get ALL files, including newly added ones
    const listResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '',
        recursive: true,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        limit: 2000
      }),
    })

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      console.error('Dropbox list_folder error:', errorText)
      throw new Error(`Dropbox API error: ${listResponse.status}`)
    }

    const listData = await listResponse.json()
    
    // Filter and format files
    const files: DropboxFile[] = listData.entries
      .filter((entry: any) => {
        if (entry['.tag'] !== 'file') return false
        
        // Filter by file extensions if provided
        if (fileExtensions && fileExtensions.length > 0) {
          return fileExtensions.some((ext: string) => 
            entry.name.toLowerCase().endsWith(ext.toLowerCase())
          )
        }
        
        return true
      })
      .map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        path_lower: entry.path_lower,
        size: entry.size,
        content_hash: entry.content_hash,
        is_downloadable: entry.is_downloadable !== false
      }))

    // Sort files by name for consistent ordering
    files.sort((a, b) => a.name.localeCompare(b.name))

    if (forceRefresh) {
      console.log(`🔄 Refresh completed: Found ${files.length} files in Dropbox`)
    } else {
      console.log(`📁 Found ${files.length} files in Dropbox`)
    }

    // Handle pagination if there are more files
    let hasMore = listData.has_more
    let cursor = listData.cursor
    
    while (hasMore) {
      try {
        const continueResponse = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cursor: cursor
          }),
        })

        if (continueResponse.ok) {
          const continueData = await continueResponse.json()
          
          // Process additional files
          const additionalFiles: DropboxFile[] = continueData.entries
            .filter((entry: any) => {
              if (entry['.tag'] !== 'file') return false
              
              if (fileExtensions && fileExtensions.length > 0) {
                return fileExtensions.some((ext: string) => 
                  entry.name.toLowerCase().endsWith(ext.toLowerCase())
                )
              }
              
              return true
            })
            .map((entry: any) => ({
              id: entry.id,
              name: entry.name,
              path_lower: entry.path_lower,
              size: entry.size,
              content_hash: entry.content_hash,
              is_downloadable: entry.is_downloadable !== false
            }))

          files.push(...additionalFiles)
          hasMore = continueData.has_more
          cursor = continueData.cursor
        } else {
          console.warn('Failed to get additional files, stopping pagination')
          break
        }
      } catch (paginationError) {
        console.error('Error during pagination:', paginationError)
        break
      }
    }

    // Final sort after all files are collected
    files.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      files: files,
      total: files.length,
      refreshed: forceRefresh || false
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