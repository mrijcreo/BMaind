# 🚀 Canvas Coach Maike - Dropbox Integration

> **Een complete, professionele AI template met Gemini API, Dropbox integratie voor Canvas handleidingen zoeken**
>
> **Gemaakt door Tom Naberink voor de onderwijssector**

Een geavanceerde Next.js template die **alles** biedt wat je nodig hebt voor innovatieve AI-projecten in het onderwijs. Van simpele chatbots tot complexe multi-modal AI applicaties met Dropbox integratie - dit is je startpunt!

## ✨ Complete Feature Set

### 🎯 **Core AI Functionaliteiten**
- 🧠 **Multi-Model AI**: Gemini 2.5 Pro, 2.5 Flash, en 2.0 Flash met internet toegang
- 🌐 **Real-time Internet Access**: Gemini 2.0 Flash met Google Search integration
- 🎵 **Audio Transcriptie**: Gemini 2.5 Flash voor speech-to-text
- 📸 **Multi-Image Analysis**: Meerdere afbeeldingen tegelijk analyseren
- 💬 **Markdown Rendering**: Perfecte opmaak van AI responses
- 🗣️ **Spraakherkenning**: Browser native voice input
- ⚡ **Streaming Responses**: Real-time AI response weergave

### 📁 **Dropbox Integratie**
- 🔗 **OAuth Verbinding**: Veilige Dropbox autorisatie
- 🔍 **Automatische Detectie**: Vindt alle Canvas PDF's en documenten
- 📄 **Multi-Format Support**: PDF, DOCX, TXT, MD bestanden
- 🔄 **Real-time Sync**: Automatische updates van bestandslijst
- 🎯 **Smart Search**: Geavanceerde zoekalgoritmes door alle Dropbox content
- 📊 **Comprehensive Analysis**: Analyseert ALLE documenten tegelijk

### 🔊 **Advanced Text-to-Speech (TTS)**
- 🎙️ **Dual TTS Engines**: Microsoft TTS (standaard) + Gemini AI TTS
- 🎭 **30 Gemini Voices**: Van Zephyr tot Sulafat met unieke karakteristieken
- 😊 **7 Emotion Styles**: Neutraal, Gelukkig, Enthousiast, Kalm, Professioneel, Vriendelijk, Informatief
- ⚡ **Speed Control**: 4 snelheden voor Microsoft TTS (0.75x tot 2.0x)
- ⚙️ **Unified Settings**: Één settings dropdown voor alle TTS opties
- 📱 **Responsive Interface**: Geoptimaliseerd voor alle schermformaten

### 🎨 **User Experience**
- 💜 **Modern Design**: Strakke paarse interface met Tailwind CSS
- 📱 **Mobile First**: Perfect responsive op alle apparaten
- ⚡ **Real-time Feedback**: Loading states, progress indicators
- 🎮 **Keyboard Shortcuts**: Enter om te verzenden, Ctrl+V om te plakken
- 🔒 **Secure**: Alle API keys blijven server-side
- 📄 **Word Export**: AI responses exporteren naar Word documenten
- 📋 **One-Click Copy**: Responses kopiëren naar klembord

### 🚀 **Deployment & Performance**
- 🌐 **Netlify Optimized**: Perfect voor Bolt.new deployment
- ⚡ **Next.js 15**: Nieuwste versie met optimale performance
- 🔧 **TypeScript**: Volledig type-safe development
- 📦 **Lean Dependencies**: Alleen wat nodig is, geen bloat

## 🚀 Quick Start: Van 0 naar AI in 5 Minuten!

### Stap 1: 🔑 API Keys Verkrijgen
**Vereist:** 
- [Gemini API Key](https://makersuite.google.com/app/apikey) (gratis)
- [Dropbox App](https://www.dropbox.com/developers/apps) (gratis)

### Stap 2: 🛠️ Dropbox App Setup
1. Ga naar [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Klik "Create app"
3. Kies "Scoped access" → "Full Dropbox" → Geef je app een naam
4. In App settings:
   - **Permissions**: `files.metadata.read`, `files.content.read`, `account_info.read`
   - **Redirect URIs**: `http://localhost:3000/dropbox-callback` (en je productie URL)
5. Noteer je **App key** en **App secret**

### Stap 3: 🔧 Environment Configuration
Maak `.env.local` aan met je API keys:

```env
# VEREIST: Voor alle Gemini AI functionaliteiten
GEMINI_API_KEY=your_gemini_api_key_here

# VEREIST: Voor Dropbox integratie
NEXT_PUBLIC_DROPBOX_APP_KEY=your_dropbox_app_key_here
DROPBOX_APP_SECRET=your_dropbox_app_secret_here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
```

### Stap 4: 📦 Project Setup
```bash
# Dependencies installeren
npm install

# Development server starten
npm run dev
# Open http://localhost:3000
```

### Stap 5: 📁 Dropbox Verbinden
1. **Klik "Verbind met Dropbox"** in de interface
2. **Autoriseer** de app in het popup venster
3. **Upload Canvas handleidingen** naar je Dropbox (PDF/DOCX)
4. **Test** de zoekfunctionaliteit!

### Stap 6: 🚀 Deploy naar Netlify
1. **In Bolt.new**: "Deploy to Netlify"
2. **Environment Variables toevoegen** in Netlify dashboard:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_DROPBOX_APP_KEY`
   - `DROPBOX_APP_SECRET`
3. **Update Dropbox Redirect URI** naar je live URL
4. **Deploy** en je app is live!

## 📋 Dropbox Integratie Features

### 🔍 **Geavanceerde Zoekfunctionaliteit**
```
✅ Automatische detectie van Canvas handleidingen in Dropbox
✅ Support voor PDF, DOCX, TXT, MD bestanden
✅ Real-time download en analyse van alle documenten
✅ Comprehensive search door ALLE content tegelijk
✅ Smart prioritering op basis van relevantie
✅ Bronvermelding per antwoord
```

### 🎯 **Canvas-Specifieke Optimalisaties**
```
🧠 Gemini 2.5 Flash: Beste balans snelheid & kwaliteit (standaard)
⚡ Streaming responses voor real-time feedback
🔍 Keyword extraction voor Canvas-specifieke termen
📊 Content prioritering op basis van zoektermen
🎯 Instructional content detection
📝 Stap-voor-stap procedure herkenning
```

### 📁 **Dropbox File Management**
- **Visual File Manager**: Overzicht van alle gevonden handleidingen
- **Automatic Refresh**: Ververs bestandslijst met één klik
- **File Type Icons**: 📄 PDF, 📝 DOCX, 📋 TXT herkenning
- **Size & Metadata**: Complete bestandsinformatie
- **Connection Status**: Real-time verbindingsstatus

## 🛠️ Technical Architecture

### 📂 **Project Structure**
```
├── 🔑 .env.local                 # API Keys (maak zelf aan)
├── 📦 package.json               # Dependencies & scripts
├── ⚙️ next.config.js             # Next.js configuration
├── 🌐 netlify.toml               # Netlify deployment config
└── src/
    ├── 🎨 app/
    │   ├── 🌍 globals.css         # Tailwind CSS styling
    │   ├── 📱 layout.tsx          # App layout & metadata
    │   ├── 🏠 page.tsx            # Main interface
    │   ├── 📁 dropbox-callback/   # OAuth callback page
    │   └── 🔌 api/
    │       ├── 💬 chat/route.ts            # Gemini AI endpoint
    │       ├── 🌊 chat-stream/route.ts     # Streaming responses
    │       ├── 🔊 generate-tts/route.ts    # Gemini TTS endpoint
    │       ├── 🎵 transcribe-audio/route.ts # Audio transcription
    │       └── 📁 dropbox/
    │           ├── 🔍 search-files/route.ts    # Dropbox file search
    │           ├── 📄 get-file-content/route.ts # File download & parse
    │           └── 🔐 auth/route.ts            # OAuth token exchange
    └── 🧩 components/
        ├── 🤖 CanvasCoach.tsx      # Main interface
        ├── 📁 DropboxConnect.tsx   # Dropbox connection
        ├── 💬 DropboxChatInterface.tsx # Chat with Dropbox search
        ├── 🔊 GeminiTTS.tsx        # Gemini TTS component
        ├── ⚙️ ResponseActions.tsx  # TTS, Copy, Word export
        ├── 📸 CameraCapture.tsx    # Camera functionality
        ├── 📝 MarkdownRenderer.tsx # Response formatting
        └── 🗣️ VoiceInput.tsx       # Speech recognition
```

### 🔌 **API Endpoints**

| Endpoint | Functie | Input | Output |
|----------|---------|-------|--------|
| `/api/chat-stream` | Streaming AI Response | `message`, `aiModel` | Server-Sent Events |
| `/api/generate-tts` | Gemini TTS Audio | `text`, `voiceName`, `emotion` | WAV Audio |
| `/api/transcribe-audio` | Audio → Tekst | Audio File | Transcriptie |
| `/api/dropbox/auth` | OAuth Token Exchange | `code`, `redirectUri` | Access Token |
| `/api/dropbox/search-files` | Zoek Dropbox Bestanden | `accessToken`, `query` | File List |
| `/api/dropbox/get-file-content` | Download & Parse | `accessToken`, `filePath` | Extracted Text |

### 📊 **Supported File Formats**

| Category | Formats | Processing | Max Size |
|----------|---------|------------|----------|
| 📄 **Documents** | PDF, DOCX, TXT, MD | Text Extraction | 10MB |
| 🎵 **Audio** | MP3, WAV, AIFF, AAC, OGG, FLAC | Gemini 2.5 Flash | 25MB |
| 📸 **Images** | JPG, PNG, GIF, WebP, BMP | Gemini Vision | 20MB |

## 🔧 Advanced Usage & Customization

### 🎨 **Styling Customization**
```css
/* globals.css - Pas het kleurenschema aan */
:root {
  --primary-color: #233975;     /* Canvas blauw */
  --secondary-color: #eec434;   /* Canvas geel */
  --dropbox-color: #0061FF;     /* Dropbox blauw */
}
```

### 🤖 **Gemini Model Configuration**
```typescript
// src/components/DropboxChatInterface.tsx
const modelName = 'gemini-2.5-flash-preview-05-20' // Optimaal voor Dropbox search
```

### 📁 **Dropbox Search Optimization**
```typescript
// src/app/api/dropbox/search-files/route.ts
const searchOptions = {
  max_results: 100,           // Meer bestanden
  file_status: 'active',      // Alleen actieve bestanden
  filename_only: false        // Zoek ook in content
}
```

## 🌐 Production Deployment

### 🎯 **Netlify (Aanbevolen)**
**Via Bolt.new:**
1. ✅ "Deploy to Netlify" button
2. ✅ Build settings: `npm run build`
3. ✅ Environment variables toevoegen
4. ✅ Dropbox redirect URI updaten
5. ✅ Automatische HTTPS & CDN

### 🔧 **Environment Variables (Production)**
```
GEMINI_API_KEY=gai_xxxxxxxxxxxxx           # Google AI Studio
NEXT_PUBLIC_DROPBOX_APP_KEY=xxxxxxxxxx     # Dropbox App Console
DROPBOX_APP_SECRET=xxxxxxxxxx              # Dropbox App Console (SECRET!)
NEXTAUTH_URL=https://your-domain.com       # Je productie URL
```

### 📁 **Dropbox App Production Setup**
1. **App Console** → Je app → Settings
2. **Redirect URIs** toevoegen: `https://your-domain.com/dropbox-callback`
3. **Permissions** controleren: `files.metadata.read`, `files.content.read`, `account_info.read`
4. **Status** → "Apply for production" (voor meer dan 500 users)

## 🚨 Troubleshooting & Common Issues

### ❌ **Dropbox Connection Issues**
| Error | Oorzaak | Oplossing |
|-------|---------|-----------|
| `App key not configured` | Missing env var | Check `NEXT_PUBLIC_DROPBOX_APP_KEY` |
| `Redirect URI mismatch` | Wrong callback URL | Update Dropbox app settings |
| `Access denied` | User cancelled | Retry connection process |
| `Token exchange failed` | Wrong app secret | Check `DROPBOX_APP_SECRET` |
| `Missing scope: account_info.read` | Ontbrekende permission | Voeg `account_info.read` toe aan Dropbox App permissions |

### 🔧 **File Processing Issues**
| Problem | Solution |
|---------|----------|
| PDF parsing fails | Check file isn't password protected |
| DOCX not readable | Ensure file isn't corrupted |
| Large files timeout | Reduce file size < 10MB |
| No files found | Check Dropbox permissions |

### 📱 **Mobile Issues**
- **Popup blocked**: Gebruik desktop voor eerste verbinding
- **OAuth redirect**: Controleer mobile browser compatibility
- **File access**: Dropbox mobile app kan interfereren

## 🎓 Educational Use Cases

### 👨‍🏫 **Voor Docenten**
- 📁 **Canvas handleidingen** centraal opslaan in Dropbox
- 🔍 **Instant zoeken** door alle documentatie
- 📝 **Stap-voor-stap instructies** krijgen voor Canvas functies
- 🎯 **Specifieke procedures** vinden zonder handmatig zoeken

### 👩‍🎓 **Voor Studenten**
- 📚 **Canvas hulp** op basis van officiële handleidingen
- 🔍 **Snel antwoorden** vinden op Canvas vragen
- 📱 **Mobile toegang** tot alle Canvas documentatie
- 💡 **Contextuele hulp** bij Canvas problemen

### 🏫 **Institutionele Deployment**
```bash
# Multi-tenant setup
GEMINI_API_KEY=shared_institutional_key
NEXT_PUBLIC_DROPBOX_APP_KEY=institutional_app_key
DROPBOX_APP_SECRET=institutional_app_secret
CANVAS_INSTITUTION=your_institution_name
```

## 🔒 Security & Privacy

### 🛡️ **Data Protection**
- ✅ **OAuth 2.0**: Veilige Dropbox autorisatie
- ✅ **Server-side secrets**: App secrets nooit client-side
- ✅ **Temporary processing**: Bestanden niet permanent opgeslagen
- ✅ **HTTPS only**: Secure transmission
- ✅ **Token management**: Secure token storage

### 📊 **Data Handling**
- 🔄 **Read-only access**: Alleen lezen van Dropbox bestanden
- 🗑️ **Auto-cleanup**: Downloads automatisch verwijderd
- 🚫 **No tracking**: Geen user analytics by default
- 🔐 **Privacy first**: GDPR compliant design

## 🤝 Contributing & Development

### 🛠️ **Development Setup**
```bash
# Development mode
npm run dev

# Type checking  
npm run lint

# Production build test
npm run build && npm start
```

### 📈 **Feature Roadmap**
- [ ] **Multi-Dropbox Accounts**: Support voor meerdere accounts
- [ ] **Folder Organization**: Specifieke Canvas folders
- [ ] **Real-time Sync**: Live updates van Dropbox changes
- [ ] **Collaborative Features**: Team Canvas documentatie
- [ ] **Analytics Dashboard**: Usage insights
- [ ] **Advanced Search**: Semantic search in documents

## 📚 Resources & Links

### 🔗 **API Documentation**
- [Gemini API Docs](https://ai.google.dev/docs) - Google AI ontwikkelaar resources
- [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) - Dropbox integratie
- [Next.js 15](https://nextjs.org/docs) - Framework documentatie

### 🎥 **Setup Tutorials**
- [Gemini API Setup](https://makersuite.google.com/app/apikey) - API key verkrijgen
- [Dropbox App Creation](https://www.dropbox.com/developers/apps) - App registratie
- [Netlify Deployment](https://netlify.com) - Hosting platform

### 💡 **Community**
- [GitHub Repository](https://github.com/TomNaberink/canvas-coach-dropbox)
- [Issues & Feature Requests](https://github.com/TomNaberink/canvas-coach-dropbox/issues)
- [Tom Naberink LinkedIn](https://linkedin.com/in/tomnaberink) - Direct contact

---

## 🎉 **Ready to Transform Canvas Education?**

Deze template geeft je **alles** wat je nodig hebt om geavanceerde AI-applicaties te bouwen voor Canvas LMS ondersteuning. Van simpele vragen beantwoorden tot complexe multi-document analyse - de mogelijkheden zijn eindeloos!

**💜 Gemaakt met passie door Tom Naberink**  
**🚀 Deploy nu en start met bouwen aan de toekomst van Canvas onderwijs!**

---

*Versie 2.1 - Canvas Coach met Dropbox Integration + OAuth Scope Fix*  
*Last updated: December 2024*