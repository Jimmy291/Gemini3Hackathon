import { useState, useRef, useEffect } from 'react';
import { Camera, Map, Compass, Mic, Navigation, Zap, ShieldAlert, KeyRound } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// ------------------------------------------------------------------
// API KEY CONFIGURATION
// Paste your Gemini API key directly here.
const API_KEY = "AIzaSyAupyIL__n1kzspxvDJ4WyAyv-zLgdNbwQ";
// ------------------------------------------------------------------

export default function App() {
  const [isReady, setIsReady] = useState(false);

  const startSwarm = (e) => {
    e.preventDefault();
    setIsReady(true);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

          <div className="flex justify-center mb-6">
            <div className="bg-[#1a1a1a] p-1 rounded-full border border-zinc-800 shadow-[0_0_20px_rgba(56,152,236,0.4)]">
              <img src="/logo.png" alt="NaviSwarm Logo" className="w-16 h-16 rounded-full object-cover" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">NaviSwarm</h1>
          <p className="text-zinc-400 text-center mb-8 text-sm">Semantic Spatial Intelligence System</p>

          <form onSubmit={startSwarm} className="space-y-4">
            <p className="text-center text-zinc-500 text-xs mb-8">System API Key configured internally.</p>

            <button
              type="submit"
              className="w-full bg-[#3898ec] hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(56,152,236,0.3)] hover:shadow-[0_0_20px_rgba(56,152,236,0.5)] transition-all flex items-center justify-center gap-2"
            >
              Initialize Swarm
              <Zap className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <SwarmInterface apiKey={API_KEY} />;
}

function SwarmInterface({ apiKey }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [memory, setMemory] = useState({
    landmarks: [],
    hazards: [],
    state: "Scanning environment...",
    logs: []
  });
  const [isScouting, setIsScouting] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState('scout'); // scout, cartographer, coordinator

  // Initialize Camera
  useEffect(() => {
    let activeStream = null;
    async function setupCamera() {
      try {
        const _stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } }
        });
        setStream(_stream);
        if (videoRef.current) {
          videoRef.current.srcObject = _stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        addLog("System: Camera access denied or unavailable.", "error");
      }
    }
    setupCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const addLog = (msg, type = "info") => {
    setMemory(prev => ({
      ...prev,
      logs: [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev.logs].slice(0, 10)
    }));
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const cw = videoRef.current.videoWidth;
    const ch = videoRef.current.videoHeight;
    canvasRef.current.width = cw;
    canvasRef.current.height = ch;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, cw, ch);
    return canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
  };

  // Agent Swarm Loop
  useEffect(() => {
    if (!isScouting) return;

    let intervalId;
    let isProcessing = false;

    // Using GenAI SDK
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const pingScout = async () => {
      if (isProcessing) return;
      isProcessing = true;
      setActiveAgent('scout');

      const frameBase64 = captureFrame();
      if (!frameBase64) {
        isProcessing = false;
        return;
      }

      setMemory(prev => ({ ...prev, state: "Scout pinging environment..." }));

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: frameBase64,
                    mimeType: 'image/jpeg'
                  }
                },
                {
                  text: `You are an indoor mapping robot. Identify strictly visible architectural landmarks, signs, and hazards. 
                  Return JSON with 'landmarks_seen' array (short descriptions like 'Red Double Doors', 'Restroom Sign') 
                  and 'hazards' array ('Wet Floor', 'Broken Elevator'). Do not list general objects like 'wall' or 'ceiling'. Respond strictly in JSON.`
                }
              ]
            }
          ]
        });

        const jsonStr = response.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const data = JSON.parse(jsonStr);

        if (data.landmarks_seen?.length > 0 || data.hazards?.length > 0) {
          setMemory(prev => {
            const newLandmarks = Array.from(new Set([...prev.landmarks, ...(data.landmarks_seen || [])]));
            const newHazards = Array.from(new Set([...prev.hazards, ...(data.hazards || [])]));

            // Check if we actually found something new to log
            if (newLandmarks.length > prev.landmarks.length) {
              addLog(`Scout: Mapped ${data.landmarks_seen.length} new landmarks.`, "success");
            }
            if (newHazards.length > prev.hazards.length) {
              addLog(`Scout: ALERT: Found hazard!`, "warning");
            }

            return {
              ...prev,
              landmarks: newLandmarks,
              hazards: newHazards,
              state: "Monitoring..."
            };
          });
        }
      } catch (err) {
        console.error("Scout error:", err);
      }

      setTimeout(() => { isProcessing = false; }, 2000);
    };

    intervalId = setInterval(pingScout, 4000); // Ping every 4 seconds
    return () => clearInterval(intervalId);
  }, [isScouting, apiKey]);

  // Coordinator handles the user question
  const handleAskSwarm = async (e) => {
    e.preventDefault();
    if (!userQuery.trim() || !apiKey) return;

    const ai = new GoogleGenAI({ apiKey: apiKey });
    setActiveAgent('coordinator');
    const question = userQuery;
    setUserQuery('');

    addLog(`User: ${question}`, "info");
    setMemory(prev => ({ ...prev, state: "Coordinator reasoning..." }));

    try {
      const db = JSON.stringify({ landmarks: memory.landmarks, hazards: memory.hazards });
      const frameBase64 = captureFrame();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              ...(frameBase64 ? [{ inlineData: { data: frameBase64, mimeType: 'image/jpeg' } }] : []),
              {
                text: `You are the NaviSwarm Coordinator Agent. The user asks: "${question}". 
                
                Current visual spatial memory database: ${db}
                (If an image is attached, it's the user's current LIVE view).
                
                Provide human-like, very concise navigation instructions (max 2 sentences).
                If you see the goal in the live image, guide them directly.
                If it's in the memory database, tell them how to get there.
                If nowhere to be found, ask them to find a floorplan or map.`
              }
            ]
          }
        ]
      });

      const answer = response.text;
      addLog(`Coordinator: ${answer}`, "success");
      setMemory(prev => ({ ...prev, state: "Awaiting instructions..." }));

      // Speak the response natively!
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.rate = 1.1; // Fast, techy feel
        window.speechSynthesis.speak(utterance);
      }

    } catch (err) {
      console.error(err);
      addLog(`Coordinator Error: ${err.message}`, "error");
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden text-white font-sans">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Augmented Reality Overlay */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">

        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isScouting ? 'bg-green-400' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isScouting ? 'bg-green-500' : 'bg-red-600'}`}></span>
            </div>
            <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
              {isScouting ? 'SWARM ACTIVE' : 'SWARM IDLE'}
            </span>
          </div>

          <button
            onClick={() => setIsScouting(!isScouting)}
            className={`pointer-events-auto px-5 py-2 rounded-full text-xs font-bold transition-all border
               ${isScouting
                ? 'bg-red-500/20 text-red-500 border-red-500'
                : 'bg-[#3898ec]/20 text-[#3898ec] border-[#3898ec]'}`}
          >
            {isScouting ? 'HALT SCANNERS' : 'ENGAGE SCANNERS'}
          </button>
        </div>

        {/* Center Target (Optional UI touch) */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`w-[300px] h-[300px] border border-white/10 rounded-full flex items-center justify-center
                          ${isScouting ? 'radar-spin opacity-50' : 'opacity-20'}`}>
            <div className="w-[150px] h-[150px] border border-[#3898ec]/40 rounded-full pulse-glow" />
            {/* Reticle lines */}
            <div className="absolute w-[320px] h-[1px] bg-white/5" />
            <div className="absolute h-[320px] w-[1px] bg-white/5" />
          </div>
        </div>

        {/* Bottom Swarm UI Dashboard */}
        <div className="glass-panel rounded-2xl border-t border-t-white/10 p-5 mt-auto flex flex-col gap-4 max-h-[45vh] pointer-events-auto">

          <div className="flex gap-4 mb-2">
            {/* Memory Graph */}
            <div className="flex-1 overflow-y-auto max-h-[150px] pr-2 scrollbar-hide space-y-2">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider sticky top-0 bg-[#0a0a0a]/80 backdrop-blur pb-1 z-10">
                Spatial Memory Graph ({memory.landmarks.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {memory.landmarks.length === 0 && <span className="text-xs text-zinc-600">No objects mapped...</span>}
                {memory.landmarks.map((m, i) => (
                  <div key={i} className="bg-zinc-800/80 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-md text-xs flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-[#3898ec]" /> {m}
                  </div>
                ))}
              </div>

              {memory.hazards.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" /> Hazards Detected
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {memory.hazards.map((h, i) => (
                      <div key={i} className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Agent Logs */}
            <div className="w-[200px] border-l border-zinc-800 pl-4 flex flex-col">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Agent Feed</div>
              <div className="flex-1 overflow-y-auto max-h-[120px] space-y-2">
                {memory.logs.map((log, i) => (
                  <div key={i} className={`text-[10px] leading-tight flex flex-col ${log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-yellow-400' : 'text-zinc-400'
                    }`}>
                    <span className="opacity-50 text-[8px]">{log.time}</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full bg-zinc-800" />

          {/* User Input Coordinator */}
          <form onSubmit={handleAskSwarm} className="relative flex items-center">
            <div className="absolute left-3 p-1 rounded-full bg-[#3898ec]/20">
              {activeAgent === 'scout' ? <Camera className="w-4 h-4 text-[#3898ec]" /> :
                activeAgent === 'coordinator' ? <Mic className="w-4 h-4 text-purple-400" /> :
                  <Map className="w-4 h-4 text-green-400" />}
            </div>
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask Coordinate Agent (e.g. Where is the lobby?)"
              className="w-full bg-[#1a1a1a] border border-zinc-700 focus:border-[#3898ec] rounded-xl pl-12 pr-12 py-3 text-sm text-white placeholder-zinc-500 outline-none"
            />
            <button type="submit" className="absolute right-2 p-2 bg-[#3898ec] hover:bg-blue-500 rounded-lg transition-colors">
              <Zap className="w-4 h-4 text-white" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
