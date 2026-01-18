import React, { useState, useRef } from 'react';
import { Operator, AVAILABLE_VOICES, Language, TTSProvider } from '../types';

interface SettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  bgUrl: string;
  setBgUrl: (url: string) => void;
  userAvatar: string;
  setUserAvatar: (url: string) => void;
  onClose: () => void;
  operators: Operator[];
  setOperators: React.Dispatch<React.SetStateAction<Operator[]>>;
  language: Language;
  setLanguage: (lang: Language) => void;
  ttsProvider: TTSProvider;
  setTtsProvider: (provider: TTSProvider) => void;
  customTtsUrl: string;
  setCustomTtsUrl: (url: string) => void;
  t: (key: string) => string;
}

const Settings: React.FC<SettingsProps> = ({ 
    apiKey, 
    setApiKey, 
    bgUrl,
    setBgUrl,
    userAvatar,
    setUserAvatar,
    onClose, 
    operators, 
    setOperators,
    language,
    setLanguage,
    ttsProvider,
    setTtsProvider,
    customTtsUrl,
    setCustomTtsUrl,
    t
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'operators'>('system');
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  
  // Voice Training State
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const tachieInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const userAvatarInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleUpdateOp = (op: Operator) => {
    setOperators(prev => prev.map(p => p.id === op.id ? op : p));
  };

  const handleAddOp = () => {
    const newOp: Operator = {
        id: `op_${Date.now()}`,
        name: 'New Operator',
        avatar: 'https://picsum.photos/200',
        tachieUrl: 'https://picsum.photos/600/1000',
        description: 'New recruit.',
        personality: 'Ready for orders.',
        systemPrompt: 'You are a new operator.',
        memory: '',
        voiceId: ttsProvider === 'custom' ? 'Default_Speaker' : 'Puck',
        isCustom: true
    };
    setOperators(prev => [...prev, newOp]);
    setEditingOp(newOp);
  };

  const handleDeleteOp = (id: string) => {
    setOperators(prev => prev.filter(p => p.id !== id));
    if (editingOp?.id === id) setEditingOp(null);
  };

  // --- File Handlers ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingOp) {
          try {
              const base64 = await readFileAsBase64(e.target.files[0]);
              setEditingOp({ ...editingOp, avatar: base64 });
          } catch (err) {
              console.error("Avatar upload failed", err);
          }
      }
  };

  const handleTachieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingOp) {
          try {
              const base64 = await readFileAsBase64(e.target.files[0]);
              setEditingOp({ ...editingOp, tachieUrl: base64 });
          } catch (err) {
              console.error("Tachie upload failed", err);
          }
      }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await readFileAsBase64(e.target.files[0]);
              setBgUrl(base64);
          } catch (err) {
              console.error("Background upload failed", err);
          }
      }
  };

  const handleUserAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          try {
              const base64 = await readFileAsBase64(e.target.files[0]);
              setUserAvatar(base64);
          } catch (err) {
              console.error("User avatar upload failed", err);
          }
      }
  };

  const handlePromptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingOp) {
          try {
              const file = e.target.files[0];
              const text = await file.text();
              setEditingOp({ ...editingOp, systemPrompt: text });
          } catch (err) {
              console.error("Prompt upload failed", err);
          }
      }
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingOp) {
          const file = e.target.files[0];
          setEditingOp({ ...editingOp, voiceSampleName: file.name, isVoiceTrained: false });
      }
  };

  const startVoiceTraining = () => {
      if (!editingOp?.voiceSampleName && ttsProvider !== 'custom') return;
      
      setIsTraining(true);
      setTrainingProgress(0);

      if (ttsProvider === 'custom') {
        setTrainingStatus('PINGING EXTERNAL NEURAL NET...');
        setTimeout(() => setTrainingProgress(30), 500);
        setTimeout(() => setTrainingStatus('HANDSHAKE ESTABLISHED.'), 1000);
        setTimeout(() => {
            setTrainingProgress(100);
            setIsTraining(false);
            setEditingOp(prev => prev ? ({ ...prev, isVoiceTrained: true }) : null);
        }, 1500);
        return;
      }

      setTrainingStatus('SPECTRAL ANALYSIS INIT...');
      const steps = [
          { p: 15, s: 'SEGMENTING AUDIO WAVES...' },
          { p: 30, s: 'EXTRACTING FORMANT FREQUENCIES...' },
          { p: 50, s: 'MATCHING NEURAL VOICE BASES...' },
          { p: 75, s: 'OPTIMIZING PROSODY TENSORS...' },
          { p: 90, s: 'CALIBRATING EMOTIONAL WEIGHTS...' },
          { p: 100, s: 'SYNTHESIS COMPLETE.' }
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
          if (currentStep >= steps.length) {
              clearInterval(interval);
              setIsTraining(false);
              setEditingOp(prev => prev ? ({ ...prev, isVoiceTrained: true }) : null);
              return;
          }
          setTrainingProgress(steps[currentStep].p);
          setTrainingStatus(steps[currentStep].s);
          currentStep++;
      }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden font-['Noto_Sans_SC']">
      <div className="w-full h-full flex flex-col relative bg-[#0a0a0a] overflow-hidden">
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(90deg,transparent_49%,#fff_50%,transparent_51%),linear-gradient(#fff_1px,transparent_1px)] bg-[length:40px_40px]"></div>

        {/* Top Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-[#121212] z-30 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-3">
                <span className="w-1.5 h-6 bg-yellow-500 block"></span>
                {t('settings_title')}
            </h2>
            
            <div className="flex items-center bg-black/50 border border-gray-800 rounded-sm">
                <button 
                    onClick={() => setActiveTab('system')}
                    className={`px-8 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-all
                    ${activeTab === 'system' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    {t('tab_system')}
                </button>
                <div className="w-[1px] h-4 bg-gray-700"></div>
                <button 
                    onClick={() => setActiveTab('operators')}
                    className={`px-8 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-all
                    ${activeTab === 'operators' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    {t('tab_personnel')}
                </button>
            </div>

            <button onClick={onClose} className="text-gray-500 hover:text-white px-4 py-2 hover:bg-white/10 transition-colors uppercase text-[10px] font-bold tracking-widest border border-transparent hover:border-gray-600">
                [ ESC ] CLOSE
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative z-10 flex">
            
            {activeTab === 'system' && (
                 <div className="w-full h-full p-12 overflow-y-auto animate-fadeIn bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000_100%)]">
                    <div className="max-w-3xl mx-auto space-y-12 pb-24">
                        {/* Language */}
                        <div className="group relative border border-gray-800 bg-black/40 p-8 hover:border-cyan-500 transition-colors">
                            <h3 className="text-sm font-bold text-cyan-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">translate</span>
                                {t('language_label')}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {['zh', 'en'].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang as Language)}
                                        className={`p-4 border text-left transition-all ${language === lang ? 'border-cyan-500 bg-cyan-900/20 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                    >
                                        <div className="text-xs font-mono uppercase opacity-50 mb-1">Select</div>
                                        <div className="font-bold">{lang === 'zh' ? '简体中文' : 'English (US)'}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                         {/* User Profile */}
                        <div className="group relative border border-gray-800 bg-black/40 p-8 hover:border-cyan-500 transition-colors">
                             <h3 className="text-sm font-bold text-cyan-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">face</span>
                                {t('doctor_profile')}
                            </h3>
                             <div className="flex gap-8 items-center">
                                <div className="w-24 h-24 border border-gray-700 bg-black flex items-center justify-center overflow-hidden relative shadow-lg">
                                    <img src={userAvatar} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <input 
                                        type="file" 
                                        ref={userAvatarInputRef}
                                        onChange={handleUserAvatarUpload}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                    <button 
                                        onClick={() => userAvatarInputRef.current?.click()}
                                        className="px-8 py-4 border border-gray-600 hover:border-white bg-transparent hover:bg-white text-xs font-bold text-gray-300 hover:text-black uppercase tracking-widest transition-all w-full mb-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                    >
                                        {t('upload_doctor_avatar')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* TTS Backend Provider - RESTORED */}
                        <div className="group relative border border-gray-800 bg-black/40 p-8 hover:border-green-500 transition-colors">
                             <h3 className="text-sm font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">graphic_eq</span>
                                {t('tts_provider_label')}
                            </h3>
                            
                            <div className="flex gap-4 mb-6">
                                <button 
                                    onClick={() => setTtsProvider('gemini')}
                                    className={`flex-1 p-4 border text-left transition-all ${ttsProvider === 'gemini' ? 'border-green-500 bg-green-900/20 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                >
                                    <div className="font-bold text-xs uppercase">{t('tts_provider_gemini')}</div>
                                </button>
                                <button 
                                    onClick={() => setTtsProvider('custom')}
                                    className={`flex-1 p-4 border text-left transition-all ${ttsProvider === 'custom' ? 'border-green-500 bg-green-900/20 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                >
                                    <div className="font-bold text-xs uppercase">{t('tts_provider_custom')}</div>
                                </button>
                            </div>

                            {ttsProvider === 'custom' && (
                                <div className="animate-fadeIn">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-2 block">{t('custom_tts_url_label')}</label>
                                    <input 
                                        type="text" 
                                        value={customTtsUrl}
                                        onChange={(e) => setCustomTtsUrl(e.target.value)}
                                        className="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-green-500 outline-none font-mono text-sm tracking-wider"
                                        placeholder={t('custom_tts_url_placeholder')}
                                    />
                                    <p className="text-[10px] text-gray-500 font-mono mt-2 opacity-70">
                                        {t('custom_tts_desc')}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* API Key */}
                        <div className="group relative border border-gray-800 bg-black/40 p-8 hover:border-yellow-500 transition-colors">
                             <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">key</span>
                                {t('api_label')}
                            </h3>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-[#111] border border-gray-700 p-4 text-white focus:border-yellow-500 outline-none font-mono text-sm tracking-wider"
                                placeholder="sk-..."
                            />
                            <p className="text-[10px] text-gray-500 font-mono mt-3 opacity-70">
                                {t('api_desc')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'operators' && (
                <div className="flex h-full w-full">
                    {/* COLUMN 1: Operator List (Narrow Sidebar) */}
                    <div className="w-64 flex flex-col border-r border-gray-800 bg-[#0a0a0a] z-20">
                         <div className="p-4 border-b border-gray-800 bg-[#0f0f0f]">
                             <button 
                                onClick={handleAddOp}
                                className="w-full py-3 border border-dashed border-gray-700 text-gray-400 hover:text-yellow-500 hover:border-yellow-500 hover:bg-yellow-900/10 text-[10px] font-bold uppercase transition-all tracking-widest"
                            >
                                {t('recruit_btn')}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {operators.map(op => (
                                <div 
                                    key={op.id} 
                                    onClick={() => setEditingOp(op)}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-l-2
                                        ${editingOp?.id === op.id ? 'bg-white/5 border-yellow-500' : 'border-transparent hover:bg-white/5 hover:border-white/30'}
                                    `}
                                >
                                    <img src={op.avatar} className="w-8 h-8 object-cover bg-gray-800 grayscale opacity-70 group-hover:grayscale-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-xs font-bold uppercase truncate ${editingOp?.id === op.id ? 'text-white' : 'text-gray-500'}`}>{op.name}</h4>
                                        <p className="text-[8px] text-gray-700 tracking-wider font-mono">{op.id.slice(0,6).toUpperCase()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 2: Visual Feed (The "Huge" Tachie) */}
                    <div className="flex-1 relative bg-[#050505] overflow-hidden group border-r border-gray-800">
                        {/* Background Grid */}
                         <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(0deg,transparent_24%,#333_25%,#333_26%,transparent_27%,transparent_74%,#333_75%,#333_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,#333_25%,#333_26%,transparent_27%,transparent_74%,#333_75%,#333_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>

                        {editingOp ? (
                            <>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <img 
                                        src={editingOp.tachieUrl || editingOp.avatar} 
                                        className="h-full w-full object-cover object-top opacity-90 transition-transform duration-700 group-hover:scale-[1.02]" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/20"></div>
                                </div>

                                <div className="absolute top-8 left-8">
                                    <h1 className="text-6xl font-black text-white/10 uppercase tracking-tighter select-none">{editingOp.name}</h1>
                                    <div className="text-xs font-mono text-yellow-500 mt-2 tracking-[0.3em]">VISUAL_FEED_ACTIVE</div>
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-sm">
                                    <button 
                                        onClick={() => tachieInputRef.current?.click()}
                                        className="px-8 py-3 bg-yellow-500 text-black font-bold text-xs uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                                    >
                                        {t('upload_tachie_hover')}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={tachieInputRef}
                                        onChange={handleTachieUpload}
                                        className="hidden" 
                                        accept="image/*"
                                    />
                                </div>
                            </>
                        ) : (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <span className="text-gray-800 text-6xl font-black uppercase tracking-tighter opacity-20">NO SIGNAL</span>
                             </div>
                        )}
                    </div>

                    {/* COLUMN 3: Archive Editor (Right Side) */}
                    <div className="w-[450px] bg-[#0f0f0f] border-l border-gray-800 flex flex-col relative z-20 shadow-2xl">
                         {editingOp ? (
                             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
                                 {/* Header */}
                                 <div className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-start">
                                     <div>
                                        <div className="inline-block bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 mb-2">E2_PROMOTED</div>
                                        <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{t('archive_header')}</h2>
                                        <p className="text-[10px] text-gray-500 font-mono mt-1">ID: {editingOp.id.toUpperCase()}</p>
                                     </div>
                                      <div 
                                        className="w-16 h-16 border border-gray-600 bg-black relative group cursor-pointer hover:border-yellow-500 transition-colors"
                                        onClick={() => avatarInputRef.current?.click()}
                                    >
                                        <img src={editingOp.avatar} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100">
                                            <span className="material-symbols-outlined text-white text-sm">upload</span>
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={avatarInputRef}
                                            onChange={handleAvatarUpload}
                                            className="hidden" 
                                            accept="image/*"
                                        />
                                     </div>
                                 </div>

                                 {/* Identity Parameters */}
                                 <div className="space-y-6 mb-10">
                                     <h3 className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-4 border-l-2 border-yellow-600 pl-2">[01] IDENTITY PARAMETERS</h3>
                                     
                                     <div className="space-y-1">
                                         <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{t('op_codename')}</label>
                                         <input 
                                             value={editingOp.name}
                                             onChange={e => setEditingOp({...editingOp, name: e.target.value})}
                                             className="w-full bg-[#1a1a1a] border border-gray-700 p-3 text-sm text-white focus:border-yellow-500 outline-none font-mono transition-colors"
                                         />
                                     </div>
                                 </div>

                                 {/* Neural Configuration & Memory */}
                                 <div className="space-y-6 mb-10">
                                     <h3 className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-4 border-l-2 border-yellow-600 pl-2">[02] NEURAL CONFIGURATION</h3>
                                     
                                     {/* System Prompt */}
                                     <div className="space-y-1 mb-4">
                                         <div className="flex justify-between items-end">
                                            <label className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">{t('op_prompt')}</label>
                                            <div className="flex gap-2">
                                                 <span className="text-[8px] text-gray-600 font-mono self-center">
                                                    {editingOp.systemPrompt.length} CHARS
                                                 </span>
                                                 <button 
                                                    onClick={() => promptInputRef.current?.click()}
                                                    className="text-[8px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 uppercase tracking-wider transition-colors"
                                                >
                                                    {t('upload_prompt') || "IMPORT_TXT"}
                                                </button>
                                                <input 
                                                    type="file" 
                                                    ref={promptInputRef}
                                                    onChange={handlePromptUpload}
                                                    className="hidden" 
                                                    accept=".txt,.md,.json"
                                                />
                                            </div>
                                         </div>
                                         <textarea 
                                             value={editingOp.systemPrompt}
                                             onChange={e => setEditingOp({...editingOp, systemPrompt: e.target.value})}
                                             className="w-full h-40 bg-[#1a1a1a] border border-gray-700 p-3 text-xs text-gray-300 font-mono focus:border-yellow-500 outline-none resize-y leading-relaxed"
                                             spellCheck={false}
                                         />
                                     </div>

                                     {/* Memory */}
                                     <div className="space-y-1">
                                         <label className="text-[9px] text-green-500 uppercase font-bold tracking-wider">{t('op_memory')}</label>
                                         <textarea 
                                             value={editingOp.memory || ''}
                                             onChange={e => setEditingOp({...editingOp, memory: e.target.value})}
                                             className="w-full h-40 bg-[#0c1a12] border border-gray-700 hover:border-green-500 p-3 text-xs text-green-100 font-mono focus:border-green-400 outline-none resize-y leading-relaxed"
                                             placeholder="Persistent memory context..."
                                             spellCheck={false}
                                         />
                                     </div>
                                 </div>

                                 {/* Voice Module */}
                                 <div className="space-y-6 mb-10">
                                     <h3 className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-4 border-l-2 border-yellow-600 pl-2">[03] AUDIO SYNTHESIS</h3>
                                     
                                     <div className="bg-[#151515] border border-gray-800 p-4">
                                         <div className="flex justify-between items-center mb-4">
                                            <label className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{t('op_voice_module')}</label>
                                            <div className="flex items-center gap-2">
                                                 <span className={`w-1.5 h-1.5 rounded-full ${editingOp.isVoiceTrained ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                 <span className="text-[8px] text-gray-500 font-mono">{editingOp.isVoiceTrained ? 'CALIBRATED' : 'UNINITIALIZED'}</span>
                                            </div>
                                         </div>

                                         <div className="grid grid-cols-1 gap-4 mb-4">
                                            {/* Logic Switch: Gemini (Select) vs Custom (Input) */}
                                            {ttsProvider === 'gemini' ? (
                                                <div className="space-y-2">
                                                    <label className="text-[8px] text-gray-500 uppercase">Gemini Base Voice</label>
                                                    <select 
                                                        value={editingOp.voiceId}
                                                        onChange={e => setEditingOp({...editingOp, voiceId: e.target.value})}
                                                        className="w-full bg-black border border-gray-700 hover:border-white p-2 text-[9px] text-gray-300 uppercase outline-none"
                                                    >
                                                        {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="text-[8px] text-gray-500 uppercase">{t('op_voice_id_custom_label')}</label>
                                                    <input 
                                                        type="text"
                                                        value={editingOp.voiceId}
                                                        onChange={e => setEditingOp({...editingOp, voiceId: e.target.value})}
                                                        className="w-full bg-black border border-gray-700 p-2 text-[10px] text-white focus:border-green-500 outline-none font-mono"
                                                        placeholder="e.g. Amiya_V1"
                                                    />
                                                    <p className="text-[8px] text-gray-600">{t('op_voice_id_custom_desc')}</p>
                                                </div>
                                            )}

                                             {/* Only show upload in Gemini mode (fake training) or keep for archival purposes */}
                                             <div className="flex gap-2">
                                                 <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-1 bg-black border border-gray-700 hover:border-white p-2 text-[9px] text-gray-300 uppercase tracking-wider transition-colors text-left truncate"
                                                 >
                                                    {editingOp.voiceSampleName ? `FILE: ${editingOp.voiceSampleName}` : `+ ${t('select_audio')}`}
                                                 </button>
                                                 <input type="file" ref={fileInputRef} onChange={handleVoiceUpload} className="hidden" accept="audio/*" />
                                             </div>
                                         </div>

                                         {/* Advanced Visualizer / Progress */}
                                         <div className="h-12 bg-black border border-gray-800 relative overflow-hidden flex items-center justify-center">
                                             {isTraining ? (
                                                 <div className="w-full h-full relative">
                                                     <div className={`absolute inset-0 ${ttsProvider === 'custom' ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}></div>
                                                     <div className={`h-full transition-all duration-300 ${ttsProvider === 'custom' ? 'bg-green-500/50' : 'bg-yellow-500/50'}`} style={{width: `${trainingProgress}%`}}></div>
                                                     <div className={`absolute inset-0 flex items-center justify-center text-[9px] font-mono tracking-widest animate-pulse ${ttsProvider === 'custom' ? 'text-green-500' : 'text-yellow-500'}`}>
                                                         {trainingStatus}
                                                     </div>
                                                 </div>
                                             ) : (
                                                 <div className="w-full h-full flex items-center justify-center gap-0.5">
                                                     {[...Array(20)].map((_, i) => (
                                                         <div key={i} className={`w-1 bg-gray-800 h-${Math.floor(Math.random()*3 + 1) * 2} rounded-sm`}></div>
                                                     ))}
                                                     <span className="absolute text-[8px] text-gray-600 font-mono">SPECTRUM_IDLE</span>
                                                 </div>
                                             )}
                                         </div>

                                         <button 
                                            onClick={startVoiceTraining}
                                            disabled={(!editingOp.voiceSampleName && ttsProvider !== 'custom') || isTraining}
                                            className={`w-full mt-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] border transition-all
                                                ${(!editingOp.voiceSampleName && ttsProvider !== 'custom')
                                                    ? 'bg-transparent border-gray-800 text-gray-600 cursor-not-allowed' 
                                                    : ttsProvider === 'custom' 
                                                        ? 'bg-green-900/50 border-green-500 text-green-400 hover:bg-green-800'
                                                        : 'bg-yellow-500 text-black border-yellow-500 hover:bg-white hover:border-white'}`}
                                         >
                                            {isTraining 
                                                ? t('processing_btn') 
                                                : ttsProvider === 'custom' ? t('test_connection') : t('init_training')}
                                         </button>
                                     </div>
                                 </div>

                             </div>
                         ) : (
                             <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                                 <div className="w-16 h-16 border border-gray-700 flex items-center justify-center">
                                     <span className="material-symbols-outlined text-2xl">folder_off</span>
                                 </div>
                                 <p className="text-xs font-mono uppercase tracking-widest">{t('awaiting_selection')}</p>
                             </div>
                         )}
                         
                         {/* Footer Actions */}
                         {editingOp && (
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#0f0f0f]/90 border-t border-gray-800 backdrop-blur">
                                <button 
                                    onClick={() => handleUpdateOp(editingOp)}
                                    className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-[0.25em] hover:bg-yellow-500 transition-colors shadow-lg"
                                >
                                    {t('confirm_updates')}
                                </button>
                            </div>
                         )}
                    </div>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;