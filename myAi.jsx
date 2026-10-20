import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  Loader2, 
  Upload, 
  X, 
  Sparkles, 
  Play, 
  Download, 
  Cpu,
  Volume2,
  Command,
  Aperture 
} from 'lucide-react';

// --- API Configuration ---
const apiKey = ""; 

// --- Utility: PCM to WAV Converter ---
const pcmToWav = (base64PCM, sampleRate = 24000) => {
  const binaryString = window.atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);
  const blob = new Blob([view, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};
const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// --- Components ---

const NavDock = ({ activeMode, setActiveMode }) => {
  const modes = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'image', label: 'Studio', icon: ImageIcon },
    { id: 'voice', label: 'Voice', icon: Mic },
  ];

  return (
    <div className="flex justify-center mb-6">
      <div className="flex items-center gap-1 p-1.5 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl ring-1 ring-black/50">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`relative px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ease-out group overflow-hidden ${
                isActive 
                  ? 'text-white shadow-lg' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-100 rounded-full" />
              )}
              <span className="relative z-10 flex items-center gap-2 font-medium">
                <Icon size={18} className={isActive ? "animate-pulse" : ""} />
                <span>{mode.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Chat Mode ---
const ChatMode = () => {
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hello, I am Nexi. I am connected and ready to assist you." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          file: file,
          preview: reader.result,
          base64: reader.result.split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = { role: 'user', text: input, image: selectedImage?.preview };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const currentImage = selectedImage;
    setSelectedImage(null);

    try {
      const parts = [{ text: userMessage.text }];
      if (currentImage) {
        parts.push({
          inlineData: { mimeType: currentImage.mimeType, data: currentImage.base64 }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        }
      );

      const data = await response.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', text: botText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/40 rounded-3xl border border-white/5 shadow-inner overflow-hidden relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
             {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 mr-3 shadow-lg shadow-violet-900/50">
                  <Aperture size={14} className="text-white" />
                </div>
             )}
            <div className={`max-w-[80%] rounded-2xl p-5 shadow-xl backdrop-blur-sm ${
              msg.role === 'user' 
                ? 'bg-white/10 text-white border border-white/10 rounded-br-sm' 
                : 'bg-black/40 text-gray-200 border border-white/5 rounded-bl-sm'
            }`}>
              {msg.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                    <img src={msg.image} alt="User upload" className="max-h-64 w-full object-cover" />
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-sm font-light tracking-wide">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start items-center gap-3 animate-pulse">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Loader2 size={14} className="text-white animate-spin" />
              </div>
             <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Nexi is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900/80 border-t border-white/5 backdrop-blur-md">
        {selectedImage && (
          <div className="flex items-center gap-3 mb-3 p-2 pl-3 bg-white/5 rounded-lg border border-white/10 w-fit animate-in slide-in-from-bottom-2">
            <img src={selectedImage.preview} alt="Preview" className="h-8 w-8 object-cover rounded-md" />
            <span className="text-xs text-gray-400 truncate max-w-[100px]">Image attached</span>
            <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 text-gray-400 hover:text-violet-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-violet-500/30"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />
          <div className="flex-1 relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Message Nexi..."
              rows={1}
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 text-white placeholder-gray-600 transition-all resize-none min-h-[50px] max-h-[120px]"
            />
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
          </div>
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="p-3.5 bg-gradient-to-br from-violet-600 to-fuchsia-700 hover:from-violet-500 hover:to-fuchsia-600 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white rounded-2xl transition-all shadow-lg shadow-violet-900/20 disabled:shadow-none transform active:scale-95"
          >
            <Send size={20} fill={(!input.trim() && !selectedImage) ? "none" : "currentColor"} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Image Studio ---
const ImageMode = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: prompt }],
            parameters: { sampleCount: 1 }
          })
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
      if (base64Image) setGeneratedImage(`data:image/png;base64,${base64Image}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-2">
       {/* Canvas Area */}
       <div className="flex-1 bg-black/40 rounded-3xl border border-white/5 relative overflow-hidden group flex items-center justify-center">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-6 relative z-10">
              <div className="relative">
                 <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse"></div>
                 <Loader2 size={48} className="text-violet-400 animate-spin relative z-10" />
              </div>
              <p className="text-violet-200/70 font-mono text-sm animate-pulse">NEXI IS CREATING...</p>
            </div>
          ) : generatedImage ? (
            <div className="relative w-full h-full p-4 flex items-center justify-center">
              <img src={generatedImage} alt="Generated" className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-white/10" />
              <div className="absolute bottom-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <a href={generatedImage} download={`nexi-gen-${Date.now()}.png`} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors shadow-lg shadow-white/10">
                  <Download size={18} /> Save Artwork
                </a>
              </div>
            </div>
          ) : error ? (
             <div className="max-w-md text-center p-8 border border-red-500/30 bg-red-500/10 rounded-2xl backdrop-blur-md">
               <p className="text-red-400 font-medium mb-2">Generation Failed</p>
               <p className="text-xs text-red-300/70 font-mono">{error}</p>
             </div>
          ) : (
            <div className="text-center space-y-4 opacity-30 select-none pointer-events-none">
              <Sparkles size={64} strokeWidth={1} className="mx-auto" />
              <p className="text-xl font-light tracking-widest">NEXI STUDIO</p>
            </div>
          )}
       </div>

       {/* Controls */}
       <div className="mt-4 bg-gray-900/60 border border-white/5 backdrop-blur-xl rounded-3xl p-2 flex gap-2 items-center shadow-2xl">
         <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Command size={16} />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe your vision..."
              className="w-full bg-black/40 border border-transparent focus:border-violet-500/30 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
            />
         </div>
         <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-3 bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-white/5"
          >
             <Sparkles size={18} />
             <span className="hidden sm:inline">Generate</span>
          </button>
       </div>
    </div>
  );
};

// --- Voice Mode ---
const VoiceMode = () => {
  const [text, setText] = useState("Hello, I am Nexi. Type below and I will speak for you.");
  const [voice, setVoice] = useState("Puck");
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const voices = ["Puck", "Charon", "Kore", "Fenrir", "Leda", "Zephyr", "Orus"];

  const handleSpeak = async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setAudioUrl(null);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
            }
          })
        }
      );
      const data = await response.json();
      const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) setAudioUrl(pcmToWav(base64Audio));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900/40 border border-white/10 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Visualizer Header */}
        <div className="h-32 bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 relative flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           {isLoading ? (
             <div className="flex items-center gap-1 h-12">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-2 bg-white/80 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}></div>
               ))}
             </div>
           ) : audioUrl ? (
             <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Play fill="currentColor" className="text-emerald-400 ml-1" />
             </div>
           ) : (
             <Volume2 size={40} className="text-white/20" />
           )}
        </div>

        <div className="p-8 space-y-8">
           {/* Voice Selection */}
           <div className="space-y-3">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Voice Persona</label>
             <div className="flex flex-wrap gap-2">
               {voices.map(v => (
                 <button
                   key={v}
                   onClick={() => setVoice(v)}
                   className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                     voice === v 
                       ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105' 
                       : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                   }`}
                 >
                   {v}
                 </button>
               ))}
             </div>
           </div>

           {/* Text Input */}
           <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Script</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-32 bg-black/30 border border-white/5 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none leading-relaxed"
              />
           </div>

           {/* Action */}
           <div className="flex gap-4 items-center pt-2">
             <button
               onClick={handleSpeak}
               disabled={isLoading || !text.trim()}
               className="flex-1 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
             >
                {isLoading ? "Synthesizing..." : "Generate Speech"}
             </button>
             
             {audioUrl && (
               <>
                 <audio src={audioUrl} autoPlay className="hidden" />
                 <a 
                   href={audioUrl} 
                   download={`nexi-voice-${Date.now()}.wav`}
                   className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-colors flex items-center justify-center"
                   title="Download Audio"
                 >
                   <Download size={20} />
                 </a>
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Layout ---
const App = () => {
  const [activeMode, setActiveMode] = useState('chat');

  return (
    <div className="fixed inset-0 bg-black text-gray-100 font-sans overflow-hidden flex flex-col selection:bg-violet-500/30 selection:text-violet-100">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      {/* Top Bar */}
      <header className="relative z-20 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 blur opacity-50 rounded-lg"></div>
             <div className="relative w-10 h-10 bg-gray-900 border border-white/10 rounded-xl flex items-center justify-center">
                <Aperture size={20} className="text-violet-400" />
             </div>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">Nexi</h1>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span>SYSTEM ONLINE</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 relative z-10 flex flex-col max-w-5xl mx-auto w-full px-4 pb-4">
        <div className="flex-1 relative">
          {/* Mode Transitions would go here, simple conditional for now */}
          <div className="absolute inset-0 transition-all duration-500 ease-in-out">
            {activeMode === 'chat' && <ChatMode />}
            {activeMode === 'image' && <ImageMode />}
            {activeMode === 'voice' && <VoiceMode />}
          </div>
        </div>
        
        {/* Floating Dock Navigation */}
        <div className="mt-6">
          <NavDock activeMode={activeMode} setActiveMode={setActiveMode} />
        </div>
      </main>
    </div>
  );
};

export default App;
