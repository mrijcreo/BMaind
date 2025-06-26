'use client'

import { useState, useEffect } from 'react'
import DropboxConnect from './DropboxConnect'
import DropboxChatInterface from './DropboxChatInterface'

interface DropboxFile {
  id: string
  name: string
  path_lower: string
  size: number
  content_hash?: string
  is_downloadable: boolean
}

export default function CanvasCoach() {
  const [isDropboxConnected, setIsDropboxConnected] = useState(false)
  const [dropboxFiles, setDropboxFiles] = useState<DropboxFile[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Load access token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('dropbox_access_token')
    if (savedToken) {
      setAccessToken(savedToken)
    }
  }, [])

  const handleConnectionChange = (connected: boolean) => {
    setIsDropboxConnected(connected)
    if (!connected) {
      setDropboxFiles([])
      setAccessToken(null)
    } else {
      const savedToken = localStorage.getItem('dropbox_access_token')
      setAccessToken(savedToken)
    }
  }

  const handleFilesLoaded = (files: DropboxFile[]) => {
    console.log(`📁 Files loaded in CanvasCoach: ${files.length} files`)
    setDropboxFiles(files)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      {!isDropboxConnected && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background: 'linear-gradient(135deg, #233975 0%, #2d4a8a 100%)'}}>
              <svg className="w-8 h-8" style={{color: '#eec434'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{color: '#233975'}}>
              Welkom bij Canvas Coach Maike! 👋
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ik ben jouw professionele onderwijstechnologie-expert en coach, gespecialiseerd in Canvas LMS. 
              Verbind met Dropbox en ik help je met al je Canvas-gerelateerde vragen door je handleidingen te doorzoeken!
            </p>
          </div>

          <div className="rounded-xl p-6 mb-8" style={{backgroundColor: '#f8f9ff', borderColor: '#233975', borderWidth: '1px'}}>
            <h3 className="text-lg font-semibold mb-3 flex items-center" style={{color: '#233975'}}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hoe werkt het?
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#0061FF'}}>1</div>
                <p className="font-medium" style={{color: '#233975'}}>Verbind met Dropbox</p>
                <p className="text-gray-600 text-sm">Geef toegang tot je Canvas handleidingen</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#233975'}}>2</div>
                <p className="font-medium" style={{color: '#233975'}}>Automatische detectie</p>
                <p className="text-gray-600 text-sm">Ik vind alle Canvas PDF's en documenten</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold" style={{backgroundColor: '#233975'}}>3</div>
                <p className="font-medium" style={{color: '#233975'}}>Stel vragen</p>
                <p className="text-gray-600 text-sm">Krijg expert Canvas ondersteuning</p>
              </div>
            </div>
          </div>

          <DropboxConnect 
            onFilesLoaded={handleFilesLoaded}
            onConnectionChange={handleConnectionChange}
          />
        </div>
      )}

      {/* Main Interface */}
      {isDropboxConnected && (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Dropbox Management */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 sticky top-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center" style={{color: '#233975'}}>
                <svg className="w-5 h-5 mr-2" style={{color: '#0061FF'}} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.71 6.71C7.31 6.31 6.69 6.31 6.29 6.71L1.71 11.29C1.31 11.69 1.31 12.31 1.71 12.71L6.29 17.29C6.69 17.69 7.31 17.69 7.71 17.29C8.11 16.89 8.11 16.27 7.71 15.87L4.83 13H11C15.97 13 20 9.97 20 5C20 4.45 19.55 4 19 4S18 4.45 18 5C18 8.86 14.86 12 11 12H4.83L7.71 9.13C8.11 8.73 8.11 8.11 7.71 7.71Z"/>
                </svg>
                Dropbox Bronnen ({dropboxFiles.length})
              </h3>

              {/* File List */}
              <div className="space-y-3 mb-6">
                {dropboxFiles.slice(0, 5).map((file) => (
                  <div key={file.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <span className="text-lg">
                          {file.name.toLowerCase().endsWith('.pdf') ? '📄' : 
                           file.name.toLowerCase().endsWith('.docx') ? '📝' : '📋'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {dropboxFiles.length > 5 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    ... en nog {dropboxFiles.length - 5} bestanden
                  </div>
                )}
              </div>

              {/* Dropbox Connection Management */}
              <DropboxConnect 
                onFilesLoaded={handleFilesLoaded}
                onConnectionChange={handleConnectionChange}
              />
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3">
            <DropboxChatInterface 
              dropboxFiles={dropboxFiles}
              accessToken={accessToken}
            />
          </div>
        </div>
      )}
    </div>
  )
}