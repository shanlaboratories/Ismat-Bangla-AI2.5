import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { STRINGS, APP_NAME, MODEL_IDS } from './constants';
import { AppView, User, ChatSession, Message, AppSettings } from './types';
import { useGeminiLive } from './hooks/useGeminiLive';
import { GoogleGenAI } from '@google/genai';
import { 
  MicrophoneIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  TrashIcon,
  UserIcon,
  SpeakerWaveIcon,
  StopIcon,
  PaperAirplaneIcon,
  Bars3Icon,
  XMarkIcon,
  MoonIcon,
  SunIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/solid';

// --- Contexts ---
const AppContext = createContext<any>(null);

// --- Components ---

// 1. Splash Screen
const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 5000); // 5 seconds
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-600 to-secondary flex flex-col items-center justify-center text-white z-50">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md mb-6 animate-bounce">
        <SpeakerWaveIcon className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-3xl font-bold mb-2 tracking-wider">{APP_NAME}</h1>
      <div className="mt-8 flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse">{STRINGS.bn.loading}</p>
      </div>
    </div>
  );
};

// 2. Auth Screen
const AuthScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        id: '1',
        name: 'ব্যবহারকারী', // Bengali for "User"
        email: 'user@example.com',
        avatar: 'https://picsum.photos/200'
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md transition-colors duration-300">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800 dark:text-white">
          {isLogin ? STRINGS.bn.loginTitle : STRINGS.bn.signupTitle}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{STRINGS.bn.nameLabel}</label>
               <input required type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition" />
             </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{STRINGS.bn.emailLabel}</label>
            <input required type="email" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{STRINGS.bn.passwordLabel}</label>
            <input required type="password" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition" />
          </div>
          
          <button disabled={isLoading} type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition transform active:scale-95 disabled:opacity-70">
            {isLoading ? STRINGS.bn.loading : (isLogin ? STRINGS.bn.loginBtn : STRINGS.bn.signupBtn)}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {STRINGS.bn.googleLogin}
            </p>
            <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline">
                {isLogin ? STRINGS.bn.switchSignup : STRINGS.bn.switchLogin}
            </button>
        </div>
      </div>
    </div>
  );
};

// 3. Post-Auth Loading
const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
   useEffect(() => {
    const timer = setTimeout(onFinish, 3000); 
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center z-50 transition-colors duration-300">
      <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-4 animate-bounce">
        {STRINGS.bn.welcome}
      </h1>
      <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 animate-[width_2s_ease-in-out_infinite]" style={{width: '100%'}}></div>
      </div>
    </div>
  );
};

// 4. Main Dashboard Component
const Dashboard = () => {
  const { user, logout, sessions, setSessions, settings, toggleTheme, currentSessionId, setCurrentSessionId } = useContext(AppContext);
  const [mode, setMode] = useState<'live' | 'text'>('text');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Gemini Live Hook
  const handleTranscription = (text: string, isUser: boolean) => {
     setSessions((prev: ChatSession[]) => {
        const updated = [...prev];
        const sessionIdx = updated.findIndex(s => s.id === currentSessionId);
        if (sessionIdx > -1) {
            const msgs = [...updated[sessionIdx].messages];
            const lastMsg = msgs[msgs.length - 1];
            
            // Merge logic: if same role, append text
            const isSameRole = lastMsg && lastMsg.role === (isUser ? 'user' : 'model');
            
            if (isSameRole) {
                msgs[msgs.length - 1] = {
                    ...lastMsg,
                    text: lastMsg.text + text
                };
            } else {
                msgs.push({
                    id: Date.now().toString(),
                    role: isUser ? 'user' : 'model',
                    text: text,
                    timestamp: Date.now()
                });
            }
            updated[sessionIdx].messages = msgs;
        }
        return updated;
     });
  };

  const handleAudioData = (url: string) => {
      setSessions((prev: ChatSession[]) => {
          const updated = [...prev];
          const idx = updated.findIndex(s => s.id === currentSessionId);
          if (idx > -1) {
             const msgs = [...updated[idx].messages];
             // Attach audio to the last model message
             let lastModelMsgIdx = -1;
             for (let i = msgs.length - 1; i >= 0; i--) {
                 if (msgs[i].role === 'model') {
                     lastModelMsgIdx = i;
                     break;
                 }
             }
             
             if (lastModelMsgIdx > -1) {
                 msgs[lastModelMsgIdx] = { ...msgs[lastModelMsgIdx], audioUrl: url };
                 updated[idx].messages = msgs;
             }
          }
          return updated;
      });
  };

  const { isConnected, isSpeaking, volumeLevel, connect, disconnect, error: liveError } = useGeminiLive({
    onTranscription: handleTranscription,
    onAudioData: handleAudioData
  });

  // Text Chat Logic
  const handleSendMessage = async () => {
    if (!inputText.trim() || !process.env.API_KEY) return;
    
    const text = inputText;
    setInputText('');
    setIsTyping(true);

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    
    setSessions((prev: ChatSession[]) => {
        const updated = [...prev];
        const idx = updated.findIndex(s => s.id === currentSessionId);
        if (idx > -1) updated[idx].messages.push(userMsg);
        return updated;
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const result = await ai.models.generateContent({
        model: MODEL_IDS.chat,
        contents: text,
        config: {
           systemInstruction: "You are a helpful AI assistant. Respond in Bengali."
        }
      });
      
      const responseText = result.text || "";

      const aiMsg: Message = { id: (Date.now()+1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      
      setSessions((prev: ChatSession[]) => {
        const updated = [...prev];
        const idx = updated.findIndex(s => s.id === currentSessionId);
        if (idx > -1) updated[idx].messages.push(aiMsg);
        return updated;
    });

    } catch (err) {
        console.error(err);
        const errorMsg: Message = { id: Date.now().toString(), role: 'model', text: STRINGS.bn.error, timestamp: Date.now() };
         setSessions((prev: ChatSession[]) => {
            const updated = [...prev];
            const idx = updated.findIndex(s => s.id === currentSessionId);
            if (idx > -1) updated[idx].messages.push(errorMsg);
            return updated;
        });
    } finally {
        setIsTyping(false);
    }
  };

  // Create a new session if none exists
  useEffect(() => {
    if (!currentSessionId) {
        const newId = Date.now().toString();
        setSessions((prev: ChatSession[]) => [{
            id: newId,
            title: 'New Chat',
            date: Date.now(),
            preview: 'Started a new conversation',
            messages: []
        }, ...prev]);
        setCurrentSessionId(newId);
    }
  }, [currentSessionId, setSessions, setCurrentSessionId]);

  const currentSession = sessions.find((s: ChatSession) => s.id === currentSessionId) || { messages: [] };

  // Scroll to bottom
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession.messages, mode]);


  // --- Subcomponents for Dashboard ---

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30 transition-transform duration-300 flex flex-col`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">{STRINGS.bn.inbox}</h2>
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500"><XMarkIcon className="w-6 h-6"/></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sessions.map((session: ChatSession) => (
          <button 
            key={session.id}
            onClick={() => {
                setCurrentSessionId(session.id);
                setIsSidebarOpen(false);
            }}
            className={`w-full text-left p-3 rounded-lg transition-colors ${currentSessionId === session.id ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          >
             <p className="font-medium truncate text-slate-800 dark:text-white">{session.messages[0]?.text.slice(0,20) || "New Chat"}</p>
             <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(session.date).toLocaleDateString()}</span>
          </button>
        ))}
        {sessions.length === 0 && <p className="text-center text-slate-400 mt-10 text-sm">{STRINGS.bn.inbox}</p>}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
         <button onClick={() => setSessions([])} className="flex items-center space-x-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded w-full">
            <TrashIcon className="w-5 h-5" />
            <span>{STRINGS.bn.clearHistory}</span>
         </button>
         <button onClick={toggleTheme} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded w-full">
             {settings.theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
             <span>{STRINGS.bn.theme}</span>
         </button>
         <button onClick={logout} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded w-full">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>{STRINGS.bn.logout}</span>
         </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        
        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-20 md:hidden"></div>}

        <div className="flex-1 flex flex-col h-full relative">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 shadow-sm z-10">
                <div className="flex items-center space-x-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-600 dark:text-slate-300">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white">{STRINGS.bn.dashboard}</h1>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-full p-1">
                    <button 
                        onClick={() => setMode('text')}
                        className={`px-4 py-1 rounded-full text-sm font-medium transition ${mode === 'text' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {STRINGS.bn.textMode}
                    </button>
                    <button 
                         onClick={() => setMode('live')}
                         className={`px-4 py-1 rounded-full text-sm font-medium transition ${mode === 'live' ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        {STRINGS.bn.liveMode}
                    </button>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <UserIcon className="w-5 h-5" />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative flex flex-col">
                
                {mode === 'live' ? (
                    /* --- LIVE VOICE MODE --- */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
                        <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-primary-50 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {/* Pulse Ring */}
                            {isConnected && (
                                <div className="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-primary-900 animate-[ping_3s_ease-in-out_infinite]"></div>
                            )}
                            
                            {/* Visualizer Circle */}
                            <div 
                                className="w-48 h-48 rounded-full bg-gradient-to-br from-primary-500 to-secondary shadow-2xl flex items-center justify-center transition-transform duration-100"
                                style={{ transform: `scale(${1 + (volumeLevel / 255) * 0.5})` }}
                            >
                                <MicrophoneIcon className="w-20 h-20 text-white" />
                            </div>
                        </div>

                        <div className="text-center space-y-2 h-16">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {isConnected ? (isSpeaking ? STRINGS.bn.listening : STRINGS.bn.processing) : STRINGS.bn.startVoice}
                            </h3>
                            {liveError && <p className="text-red-500 text-sm">{liveError}</p>}
                        </div>

                        <button
                            onClick={isConnected ? disconnect : connect}
                            className={`px-8 py-4 rounded-full font-bold text-xl shadow-lg transition transform active:scale-95 flex items-center space-x-3 ${isConnected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                        >
                            {isConnected ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                            <span>{isConnected ? STRINGS.bn.stopVoice : STRINGS.bn.startVoice}</span>
                        </button>
                        
                        <p className="text-xs text-slate-400 max-w-xs text-center">
                           Powered by Gemini 2.5 Live API (Native Audio)
                        </p>
                    </div>
                ) : (
                    /* --- TEXT CHAT MODE --- */
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {currentSession.messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex max-w-[80%] px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-primary-600 text-white rounded-br-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                                    }`}>
                                        <p>{msg.text}</p>
                                    </div>
                                    {/* Audio Download Button for AI messages */}
                                    {msg.role === 'model' && msg.audioUrl && (
                                        <a 
                                            href={msg.audioUrl} 
                                            download={`response-${msg.id}.wav`}
                                            className="mt-1 flex items-center space-x-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg text-xs font-medium hover:bg-primary-200 dark:hover:bg-primary-900 transition-colors"
                                        >
                                            <ArrowDownTrayIcon className="w-3 h-3" />
                                            <span>{STRINGS.bn.downloadAudio}</span>
                                        </a>
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 flex space-x-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                             <form 
                                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                                className="flex items-center space-x-2"
                             >
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={STRINGS.bn.typeMessage}
                                    className="flex-1 px-4 py-3 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputText.trim()}
                                    className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                             </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
};


// Main App Component
const App = () => {
  const [view, setView] = useState<AppView>(AppView.SPLASH);
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    language: 'bn',
    theme: 'light',
    voiceGender: 'female'
  });
  const [showKeyModal, setShowKeyModal] = useState(false);


  // Initialize theme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setSettings(s => ({ ...s, theme: 'dark' }));
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView(AppView.POST_AUTH_LOADING);
  };

  const handleLogout = () => {
    setUser(null);
    setView(AppView.AUTH);
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  // API Key check simulation for Veo/Live requirements
  useEffect(() => {
    if (!process.env.API_KEY && (view === AppView.DASHBOARD)) {
        // If no env key, ideally prompt user. For this demo, we assume env is set or we show error.
    }
  }, [view]);

  // Context Value
  const contextValue = useMemo(() => ({
    user,
    logout: handleLogout,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    toggleTheme
  }), [user, sessions, currentSessionId, settings]);

  // View Routing
  let content;
  switch (view) {
    case AppView.SPLASH:
      content = <SplashScreen onFinish={() => setView(AppView.AUTH)} />;
      break;
    case AppView.AUTH:
      content = <AuthScreen onLogin={handleLogin} />;
      break;
    case AppView.POST_AUTH_LOADING:
      content = <WelcomeScreen onFinish={() => setView(AppView.DASHBOARD)} />;
      break;
    case AppView.DASHBOARD:
    default:
      content = <Dashboard />;
      break;
  }

  return (
    <AppContext.Provider value={contextValue}>
      {content}
    </AppContext.Provider>
  );
};

export default App;