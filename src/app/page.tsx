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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Canvas Coach Maike</h1>
              <p className="text-blue-100">Professionele LMS ondersteuning voor onderwijsprofessionals</p>
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
            <p className="font-medium" style={{color: '#eec434'}}>Canvas Coach Maike - Gespecialiseerde ondersteuning voor Canvas LMS</p>
            <p className="mt-1">Powered by Gemini AI • Gemaakt door Tom Naberink en Mieke Van Rijckeghem</p>
          </div>
        </div>
      </div>
    </div>
  )
}