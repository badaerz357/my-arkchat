import React, { useState, useEffect, useRef } from 'react';
import { Operator, Message, ChatSession, Language, TTSProvider, MAX_CONTEXT_CHARS } from './types';
import { DEFAULT_OPERATORS, GROUP_CHAT_ID, TRANSLATIONS } from './constants';
import OperatorCard from './components/OperatorCard';
import Settings from './components/Settings';
import GroupSetup from './components/GroupSetup';
import AudioVisualizer from './components/AudioVisualizer';
import { generateChatResponse, generateSpeech, generateSummary } from './services/gemini';

const App: React.FC = () => {
  // --- State ---
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('prts_api_key') || '');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('prts_language') as Language) || 'zh');
  
  // TTS State
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>(() => (localStorage.getItem('prts_tts_provider') as TTSProvider) || 'gemini');
  const [customTtsUrl, setCustomTtsUrl] = useState<string>(() => localStorage.getItem('prts_custom_tts_url') || 'http://127.0.0.1:9880');

  // User Profile
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem('prts_user_avatar') || 'https://picsum.photos/seed/doctor/100/100');

  const [operators, setOperators] = useState<Operator[]>(() => {
    const saved = localStorage.getItem('prts_operators');
    return saved ? JSON.parse(saved) : DEFAULT_OPERATORS;
  });

  // Group Participants State
  const [groupParticipants, setGroupParticipants] = useState<string[]>(() => {
    const saved = localStorage.getItem('prts_group_participants');
    return saved ? JSON.parse(saved) : DEFAULT_OPERATORS.map(op => op.id);
  });
  const [isGroupSetupOpen, setIsGroupSetupOpen] = useState(false);
  
  // Active Operator ID (used for sidebar selection)
  const [currentOperatorId, setCurrentOperatorId] = useState<string>(DEFAULT_OPERATORS[0].id);
  
  // Session State
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  
  // Ref for session menu click-outside detection
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(!apiKey);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [bgUrl, setBgUrl] = useState<string>('');

  // Summary State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentPlayingMsgId, setCurrentPlayingMsgId] = useState<string | null>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // --- Translation Helper ---
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('prts_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('prts_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('prts_tts_provider', ttsProvider);
  }, [ttsProvider]);

  useEffect(() => {
    localStorage.setItem('prts_custom_tts_url', customTtsUrl);
  }, [customTtsUrl]);

  useEffect(() => {
    localStorage.setItem('prts_user_avatar', userAvatar);
  }, [userAvatar]);

  useEffect(() => {
    try {
        localStorage.setItem('prts_operators', JSON.stringify(operators));
    } catch (e) {
        console.warn("Storage quota exceeded.");
    }
  }, [operators]);

  useEffect(() => {
    localStorage.setItem('prts_group_participants', JSON.stringify(groupParticipants));
  }, [groupParticipants]);

  // Load sessions from local storage only once
  useEffect(() => {
      const savedSessions = localStorage.getItem('prts_sessions_v2');
      if (savedSessions) {
          try {
              setSessions(JSON.parse(savedSessions));
          } catch(e) {
              console.error("Failed to load sessions");
          }
      }
  }, []);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    try {
        // Always save, even if empty, to ensure deletes persist
        localStorage.setItem('prts_sessions_v2', JSON.stringify(sessions));
    } catch (e) {
        console.warn("Session storage quota exceeded.");
    }
  }, [sessions]);

  // Auto-select most recent session when operator changes
  useEffect(() => {
      const opSessions = Object.values(sessions).filter(s => s.operatorId === currentOperatorId);
      // Sort by createdAt desc
      opSessions.sort((a, b) => b.createdAt - a.createdAt);

      if (opSessions.length > 0) {
          // If current session is not in this operator's list, switch
          if (!currentSessionId || sessions[currentSessionId]?.operatorId !== currentOperatorId) {
              setCurrentSessionId(opSessions[0].id);
          }
      } else {
          // No sessions for this operator, create default one
          createNewSession(currentOperatorId);
      }
  }, [currentOperatorId, sessions]);


  useEffect(() => {
    // Initialize Audio Context and Analyser once
    if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({ sampleRate: 24000 });
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
    }
  }, []);

  // Click Outside Listener for Session Menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
              setIsSessionMenuOpen(false);
          }
      };

      if (isSessionMenuOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [isSessionMenuOpen]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  // --- Logic ---
  const getCurrentOperator = () => {
    if (currentOperatorId === GROUP_CHAT_ID) return null;
    return operators.find(op => op.id === currentOperatorId) || operators[0];
  };

  const getSessionMessages = () => {
    if (!currentSessionId) return [];
    return sessions[currentSessionId]?.messages || [];
  };

  const getCurrentSession = () => {
      if (!currentSessionId) return null;
      return sessions[currentSessionId];
  };

  const createNewSession = (opId: string) => {
      const newId = `${opId}_${Date.now()}`;
      const newSession: ChatSession = {
          id: newId,
          operatorId: opId,
          title: t('default_session_title'),
          createdAt: Date.now(),
          messages: []
      };
      setSessions(prev => ({ ...prev, [newId]: newSession }));
      setCurrentSessionId(newId);
      setIsSessionMenuOpen(false); 
  };

  const deleteSession = (sessionId: string) => {
      if (!window.confirm(t('confirm_delete'))) return;
      
      const sessionToDelete = sessions[sessionId];
      if (!sessionToDelete) return;

      // Use functional update to ensure we are deleting from the latest state
      setSessions(prev => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
      });

      // Handle navigation if we deleted the current session
      if (currentSessionId === sessionId) {
          // Find candidates in the *current* state (filtering out the deleted one)
          const remainingCandidates = Object.values(sessions)
              .filter(s => s.id !== sessionId && s.operatorId === sessionToDelete.operatorId)
              .sort((a, b) => b.createdAt - a.createdAt);
          
          if (remainingCandidates.length > 0) {
              setCurrentSessionId(remainingCandidates[0].id);
          } else {
              // No sessions left for this operator, create a new one
              // createNewSession uses functional updates so it is safe to call
              createNewSession(sessionToDelete.operatorId);
          }
      }
  };

  const renameSession = (sessionId: string, newTitle: string) => {
      if (!newTitle.trim()) {
           setEditingTitleId(null);
           return;
      }
      
      setSessions(prev => ({
          ...prev,
          [sessionId]: {
              ...prev[sessionId],
              title: newTitle
          }
      }));
      setEditingTitleId(null);
  };

  // Calculate Context Usage
  const calculateContextUsage = () => {
      const msgs = getSessionMessages();
      let totalChars = 0;
      msgs.forEach(m => totalChars += m.text.length);
      return totalChars;
  };

  // Group Setup Logic
  const handleToggleParticipant = (id: string) => {
    setGroupParticipants(prev => 
        prev.includes(id) 
            ? prev.filter(p => p !== id) 
            : [...prev, id]
    );
  };
  
  const handleSelectAllParticipants = () => {
      setGroupParticipants(operators.map(op => op.id));
  };

  const handleDeselectAllParticipants = () => {
      setGroupParticipants([]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey || !currentSessionId) return;
    
    const userText = input;
    setInput('');
    setIsLoading(true);

    const newMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        senderName: 'Doctor',
        text: userText,
        timestamp: Date.now(),
        avatar: userAvatar
    };

    setSessions(prev => {
        const session = prev[currentSessionId];
        return {
            ...prev,
            [currentSessionId]: {
                ...session,
                messages: [...session.messages, newMessage]
            }
        };
    });

    const currentOp = getCurrentOperator();
    const history = sessions[currentSessionId]?.messages || [];
    const isGroup = currentOperatorId === GROUP_CHAT_ID;
    
    // Filter operators for group chat
    const activeGroupOps = isGroup 
        ? operators.filter(op => groupParticipants.includes(op.id))
        : [];

    const responseMessages = await generateChatResponse(
        apiKey, 
        [...history, newMessage], 
        currentOp || operators[0], 
        isGroup,
        activeGroupOps
    );

    const newBotMessages: Message[] = responseMessages.map((resp, index) => {
        // Resolve avatar for group chat members
        let avatar = currentOp ? currentOp.avatar : 'https://picsum.photos/seed/rhodes/100';
        let voiceId = currentOp ? currentOp.voiceId : 'Puck';

        if (isGroup) {
            const speakerOp = operators.find(op => op.name === resp.sender);
            if (speakerOp) {
                avatar = speakerOp.avatar;
                voiceId = speakerOp.voiceId;
            }
        }

        return {
            id: (Date.now() + index + 1).toString(),
            role: 'model',
            senderName: resp.sender,
            text: resp.text,
            timestamp: Date.now() + index * 10, // Slight offset for sorting if needed
            avatar: avatar,
            audioUrl: voiceId // Store voiceId for playback trigger
        };
    });

    setSessions(prev => {
        const session = prev[currentSessionId];
        return {
            ...prev,
            [currentSessionId]: {
                ...session,
                messages: [...session.messages, ...newBotMessages]
            }
        };
    });

    setIsLoading(false);

    // Auto-play first voice if enabled
    if (voiceEnabled && newBotMessages.length > 0) {
        const firstMsg = newBotMessages[0];
        const op = operators.find(o => o.name === firstMsg.senderName) || getCurrentOperator() || operators[0];
        playVoiceResponse(firstMsg.text, op.voiceId, firstMsg.id);
    }
  };

  const handleSummarize = async () => {
      const msgs = getSessionMessages();
      if (msgs.length === 0) return;
      
      setIsSummarizing(true);
      setShowSummaryModal(true);
      const summary = await generateSummary(apiKey, msgs);
      setSummaryText(summary);
      setIsSummarizing(false);
  };

  const handleApplyMemory = () => {
      const op = getCurrentOperator();
      if (op && summaryText) {
          const updatedOp = { ...op, memory: summaryText };
          setOperators(prev => prev.map(p => p.id === op.id ? updatedOp : p));
          alert(t('summary_complete') + " -> " + t('op_memory'));
          setShowSummaryModal(false);
      }
  };

  const playVoiceResponse = async (text: string, voiceId: string, msgId: string) => {
    if (!apiKey && ttsProvider === 'gemini') return;
    
    if (sourceRef.current) {
        sourceRef.current.stop();
    }

    setIsPlayingAudio(true);
    setCurrentPlayingMsgId(msgId);

    const audioBuffer = await generateSpeech(text, voiceId, {
        provider: ttsProvider,
        apiKey: apiKey,
        customUrl: customTtsUrl
    });
    
    if (audioBuffer && audioContextRef.current && analyserRef.current) {
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        
        source.onended = () => {
            setIsPlayingAudio(false);
            setCurrentPlayingMsgId(null);
        };
        
        sourceRef.current = source;
        source.start();
    } else {
        setIsPlayingAudio(false);
        setCurrentPlayingMsgId(null);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Browser does not support voice input.");
        return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = language === 'zh' ? 'zh-CN' : 'en-US'; 
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + ' ' + transcript);
    };
    recognition.start();
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden relative font-['Noto_Sans_SC']">
      <div className="absolute inset-0 crt-overlay pointer-events-none z-50 opacity-30"></div>
      
      {bgUrl && (
        <div 
            className="absolute inset-0 z-0 opacity-50 bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}

      {/* --- Sidebar --- */}
      <div className="w-64 bg-[#0a0a0a]/95 border-r border-gray-800 flex flex-col z-10 backdrop-blur-md">
        <div className="h-16 flex items-center px-4 border-b border-gray-800 bg-[#121212]">
            <div className="w-8 h-8 bg-cyan-600 rhombus-clip mr-3 flex items-center justify-center">
                <span className="text-black font-bold text-xs">PRTS</span>
            </div>
            <div>
                <h1 className="text-sm font-bold tracking-[0.2em] text-cyan-500">{t('app_title')}</h1>
                <p className="text-[10px] text-gray-500 tracking-widest">{t('subtitle')}</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            <div 
                onClick={() => setCurrentOperatorId(GROUP_CHAT_ID)}
                className={`p-3 mb-2 cursor-pointer border-l-4 transition-all ${currentOperatorId === GROUP_CHAT_ID ? 'border-yellow-500 bg-yellow-900/10' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-800 flex items-center justify-center border border-gray-600">
                        <span className="text-lg">👥</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-xs uppercase">{t('tactical_room')}</h4>
                        <p className="text-[9px] uppercase tracking-wider">{t('group_channel')}</p>
                    </div>
                </div>
            </div>

            <div className="my-2 border-t border-gray-800 mx-4"></div>

            {operators.map(op => (
                <OperatorCard 
                    key={op.id} 
                    operator={op} 
                    isActive={currentOperatorId === op.id}
                    onClick={() => setCurrentOperatorId(op.id)}
                    t={t}
                />
            ))}
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#0f0f0f]">
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-gray-700 text-xs font-bold text-gray-400 hover:bg-cyan-900/20 hover:text-cyan-400 hover:border-cyan-500 transition-all uppercase tracking-widest"
             >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>{t('system_config')}</span>
             </button>
        </div>
      </div>

      {/* --- Main Chat Area --- */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="h-16 border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                         <h2 className="text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
                            {currentOperatorId === GROUP_CHAT_ID ? t('tactical_room') : getCurrentOperator()?.name}
                             {getCurrentOperator()?.isVoiceTrained && (
                             <span className="text-[9px] bg-cyan-900/30 text-cyan-400 border border-cyan-800 px-1 rounded-sm">{t('voice_cloned_badge')}</span>
                        )}
                        </h2>
                        
                        {/* Session Switcher Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSessionMenuOpen(!isSessionMenuOpen);
                                }}
                                className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white bg-black/50 border border-gray-700 px-3 py-1 rounded-sm"
                            >
                                <span className="max-w-[150px] truncate">{getCurrentSession()?.title || '...'}</span>
                                <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                            </button>

                            {isSessionMenuOpen && (
                                <div 
                                    ref={sessionMenuRef}
                                    className="absolute top-full left-0 mt-2 w-72 bg-[#1a1a1a] border border-gray-700 shadow-2xl z-[60] animate-fadeIn"
                                >
                                    <div className="p-2 border-b border-gray-700 bg-[#121212] flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{t('session_list')}</span>
                                        <button 
                                            onClick={() => createNewSession(currentOperatorId)}
                                            className="text-cyan-500 hover:text-white"
                                            title={t('new_chat')}
                                        >
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                        {Object.values(sessions)
                                            .filter(s => s.operatorId === currentOperatorId)
                                            .sort((a, b) => b.createdAt - a.createdAt)
                                            .map(s => (
                                                <div 
                                                    key={s.id} 
                                                    className={`p-3 border-l-2 cursor-pointer flex items-center justify-between gap-2
                                                        ${currentSessionId === s.id ? 'border-cyan-500 bg-cyan-900/10' : 'border-transparent text-gray-400 hover:bg-white/5'}
                                                    `}
                                                    onClick={() => {
                                                        setCurrentSessionId(s.id);
                                                        setIsSessionMenuOpen(false);
                                                    }}
                                                >
                                                    {editingTitleId === s.id ? (
                                                        <input 
                                                            value={tempTitle}
                                                            onChange={(e) => setTempTitle(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    e.currentTarget.blur();
                                                                }
                                                            }}
                                                            onBlur={() => renameSession(s.id, tempTitle)}
                                                            className="bg-black border border-gray-500 text-xs w-full px-1 focus:border-cyan-500 outline-none text-white"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-bold truncate">{s.title}</div>
                                                            <div className="text-[9px] text-gray-600 font-mono mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTitleId(s.id);
                                                                setTempTitle(s.title);
                                                            }}
                                                            className="text-gray-500 hover:text-white p-1"
                                                            title={t('edit_title')}
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteSession(s.id);
                                                            }}
                                                            className="text-gray-500 hover:text-red-500 p-1"
                                                            title={t('delete_chat')}
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.values(sessions).filter(s => s.operatorId === currentOperatorId).length === 0 && (
                                                <div className="p-4 text-center text-[10px] text-gray-600 uppercase">
                                                    {t('no_sessions')}
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Explicit New Chat Button next to dropdown */}
                         <button 
                            onClick={() => createNewSession(currentOperatorId)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-cyan-500 border border-transparent hover:border-cyan-500 px-2 py-1 rounded-sm transition-all"
                            title={t('new_chat')}
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            <span className="hidden sm:inline">{t('new_chat')}</span>
                        </button>

                    </div>

                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-blink' : 'bg-green-500'}`}></span>
                             <span className="text-[10px] font-mono text-cyan-600">
                                {isLoading ? t('processing') : t('stable')}
                             </span>
                        </div>
                        <div className="h-3 w-[1px] bg-gray-700"></div>
                        
                        {/* Context Usage Bar */}
                        <div className="flex items-center gap-2" title={t('chars_remaining')}>
                             <span className="text-[9px] text-gray-500 font-mono uppercase">{t('context_usage')}</span>
                             <div className="w-20 h-1.5 bg-gray-800 rounded-sm overflow-hidden border border-gray-700">
                                <div 
                                    className={`h-full transition-all duration-500 ${calculateContextUsage() > MAX_CONTEXT_CHARS * 0.9 ? 'bg-red-500' : 'bg-cyan-600'}`}
                                    style={{ width: `${Math.min(100, (calculateContextUsage() / MAX_CONTEXT_CHARS) * 100)}%` }}
                                ></div>
                             </div>
                             <span className="text-[9px] text-gray-600 font-mono">{(calculateContextUsage() / 1000).toFixed(1)}k / {(MAX_CONTEXT_CHARS / 1000000).toFixed(0)}M</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 
                 <button 
                    onClick={handleSummarize}
                    className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    title={t('summarize')}
                 >
                    <span className="material-symbols-outlined text-lg">summarize</span>
                 </button>

                 <div className="h-6 w-[1px] bg-gray-700 mx-1"></div>

                 {currentOperatorId === GROUP_CHAT_ID && (
                    <button 
                        onClick={() => setIsGroupSetupOpen(true)}
                        className="flex items-center gap-2 px-3 py-1 border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">group_add</span>
                        <span className="text-xs font-mono uppercase font-bold">{t('team_config')}</span>
                    </button>
                 )}

                <div className="w-32 h-8 border border-gray-800 bg-black/50">
                    <AudioVisualizer analyser={analyserRef.current} isPlaying={isPlayingAudio} />
                </div>

                <button 
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`flex items-center gap-2 px-3 py-1 border transition-all ${voiceEnabled ? 'border-cyan-500 text-cyan-500 bg-cyan-900/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                >
                    <span className="text-xs font-mono uppercase font-bold">{voiceEnabled ? t('voice_on') : t('voice_off')}</span>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[#050505]/90">
            {getSessionMessages().length === 0 && (
                <div className="flex h-full items-center justify-center opacity-30">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-cyan-500 mb-4">terminal</span>
                        <h3 className="text-lg font-bold tracking-[0.3em] uppercase">{t('new_chat')}</h3>
                        <p className="text-xs font-mono mt-2">{currentOperatorId} // SESSION_INIT</p>
                    </div>
                </div>
            )}

            {getSessionMessages().map((msg) => (
                <div key={msg.id} className={`flex gap-4 animate-fadeIn ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-10 h-10 flex-shrink-0 border border-gray-600 bg-black overflow-hidden relative shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                        <img src={msg.avatar} alt={msg.senderName} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className={`max-w-[70%] relative group`}>
                        <div className={`
                            p-4 text-sm leading-relaxed border relative
                            ${msg.role === 'user' 
                                ? 'bg-[#1a1a1a] border-gray-700 text-gray-300' 
                                : 'bg-cyan-950/20 border-cyan-900/50 text-cyan-100'}
                        `}>
                            {/* Decorative corner accent */}
                            <div className={`absolute top-0 w-2 h-2 border-t border-l ${msg.role === 'user' ? 'right-0 border-r border-l-0 border-gray-500' : 'left-0 border-cyan-500'}`}></div>

                            <div className={`
                                absolute -top-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border bg-[#050505]
                                ${msg.role === 'user' 
                                    ? 'right-0 border-gray-600 text-gray-500' 
                                    : 'left-0 border-cyan-800 text-cyan-500'}
                            `}>
                                {msg.senderName}
                            </div>
                            
                            {/* Render Text with Newlines */}
                            <div className="whitespace-pre-wrap">
                                {msg.text}
                            </div>

                            {/* Play Button for Bot Messages */}
                            {msg.role === 'model' && (
                                <div className="mt-2 flex items-center justify-end pt-2 border-t border-cyan-900/30">
                                    <button 
                                        onClick={() => {
                                            const op = operators.find(o => o.name === msg.senderName) || getCurrentOperator() || operators[0];
                                            const text = msg.text.replace(/\*.*?\*/g, '').replace(/\[.*?\]/g, '').trim();
                                            playVoiceResponse(text, op.voiceId, msg.id);
                                        }}
                                        className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-colors
                                            ${currentPlayingMsgId === msg.id && isPlayingAudio 
                                                ? 'text-cyan-400 animate-pulse' 
                                                : 'text-gray-500 hover:text-cyan-500'}
                                        `}
                                    >
                                        <span className="material-symbols-outlined text-sm">
                                            {currentPlayingMsgId === msg.id && isPlayingAudio ? 'graphic_eq' : 'play_arrow'}
                                        </span>
                                        {currentPlayingMsgId === msg.id && isPlayingAudio ? 'PLAYING...' : t('play_voice')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={`text-[9px] text-gray-600 mt-1 font-mono ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-4">
                     <div className="w-10 h-10 bg-gray-800 animate-pulse"></div>
                     <div className="h-10 w-32 bg-gray-800/50 animate-pulse flex items-center px-4 border-l-2 border-yellow-500">
                        <span className="text-xs font-mono text-yellow-500 animate-pulse">{t('thinking')}</span>
                     </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
            <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
                <div className="flex-1 bg-[#151515] border border-gray-700 p-2 focus-within:border-cyan-500 transition-colors">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={t('input_placeholder')}
                        className="w-full bg-transparent text-gray-200 text-sm outline-none resize-none font-mono h-12 scrollbar-hide placeholder-gray-700"
                    />
                </div>
                
                <button 
                    onClick={handleVoiceInput}
                    className={`p-3 border border-gray-700 hover:border-cyan-500 hover:text-cyan-500 transition-colors h-[50px] w-[50px] flex items-center justify-center ${isPlayingAudio ? 'text-green-500 border-green-500 bg-green-900/10' : 'text-gray-400'}`}
                    title="Voice Input"
                >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>

                <button 
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="h-[50px] px-8 bg-cyan-800 hover:bg-cyan-700 text-white font-bold tracking-widest text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all rhombus-clip"
                >
                    {t('transmit')}
                </button>
            </div>
            <div className="text-center mt-2 flex justify-center gap-4 opacity-50">
                 <p className="text-[9px] text-gray-600 font-mono">{t('footer_text')}</p>
            </div>
        </div>
      </div>

      {isSettingsOpen && (
        <Settings 
            apiKey={apiKey} 
            setApiKey={setApiKey} 
            bgUrl={bgUrl}
            setBgUrl={setBgUrl}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            onClose={() => setIsSettingsOpen(false)}
            operators={operators}
            setOperators={setOperators}
            language={language}
            setLanguage={setLanguage}
            ttsProvider={ttsProvider}
            setTtsProvider={setTtsProvider}
            customTtsUrl={customTtsUrl}
            setCustomTtsUrl={setCustomTtsUrl}
            t={t}
        />
      )}

      {isGroupSetupOpen && (
          <GroupSetup 
            operators={operators}
            selectedIds={groupParticipants}
            onToggle={handleToggleParticipant}
            onClose={() => setIsGroupSetupOpen(false)}
            onSelectAll={handleSelectAllParticipants}
            onDeselectAll={handleDeselectAllParticipants}
            t={t}
          />
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="w-[600px] bg-[#1a1a1a] border border-cyan-900 p-6 shadow-2xl relative">
                  <h3 className="text-lg font-bold text-cyan-500 mb-4 tracking-widest">{t('summarize')}</h3>
                  
                  {isSummarizing ? (
                      <div className="h-40 flex items-center justify-center">
                           <div className="text-yellow-500 font-mono animate-pulse">{t('summarizing')}</div>
                      </div>
                  ) : (
                      <textarea 
                        value={summaryText}
                        onChange={(e) => setSummaryText(e.target.value)}
                        className="w-full h-64 bg-black border border-gray-700 text-sm text-gray-300 p-4 font-mono mb-4 focus:border-cyan-500 outline-none resize-none"
                        placeholder={t('summary_placeholder')}
                      />
                  )}

                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowSummaryModal(false)}
                        className="px-4 py-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider"
                      >
                          Close
                      </button>
                      <button 
                        onClick={() => navigator.clipboard.writeText(summaryText)}
                        className="px-4 py-2 border border-gray-600 hover:border-white text-xs font-bold uppercase tracking-wider"
                      >
                          {t('copy')}
                      </button>
                      {currentOperatorId !== GROUP_CHAT_ID && (
                        <button 
                            onClick={handleApplyMemory}
                            className="px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white text-xs font-bold uppercase tracking-wider"
                        >
                            {t('apply_to_memory')}
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;