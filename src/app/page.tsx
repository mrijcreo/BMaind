import CanvasCoach from '@/components/CanvasCoach'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'}}>
      {/* Header */}
      <div className="shadow-sm border-b border-gray-200" style={{backgroundColor: '#233975'}}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #eec434 0%, #f4d03f 100%)'}}>
              <svg className="w-7 h-7" style={{color: '#233975'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BMaind</h1>
              <p className="text-blue-100">Intelligente AI-assistent voor je Dropbox documenten</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <CanvasCoach />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-16" style={{backgroundColor: '#233975'}}>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-blue-100 text-sm">
            <p className="font-medium" style={{color: '#eec434'}}>BMaind - Intelligente AI-assistent voor documentanalyse</p>
            <p className="mt-1">Powered by Gemini AI • Gemaakt door Tom Naberink en Mieke Van Rijckeghem</p>
          </div>
        </div>
      </div>
    </div>
  )
}