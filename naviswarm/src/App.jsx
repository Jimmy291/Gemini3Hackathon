import { useState, useRef, useEffect } from 'react';
import { Camera, Map, Compass, Mic, Navigation, Zap, ShieldAlert, KeyRound, BrainCircuit, Activity, ChevronsUp, ChevronsDown, ChevronsRight, ChevronsLeft, RotateCcw, CheckCircle } from 'lucide-react';
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

  return <SwarmInterface />;
}

// ------------------------------------------------------------------
// Typing Text Animation Component
// ------------------------------------------------------------------
function TypewriterText({ text, speed = 20 }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    if (!text) return;

    // Quick burst effect
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span className="typing-cursor font-mono tracking-tight">{displayed}</span>;
}

// ------------------------------------------------------------------
// AR Directional Overlay Component
// ------------------------------------------------------------------
function ARDirectionOverlay({ direction }) {
  if (!direction || direction === 'NONE') return null;

  const arrowProps = {
    className: "w-48 h-48 text-[#3898ec] animate-[pulse_1s_ease-in-out_infinite] drop-shadow-[0_0_25px_rgba(56,152,236,0.8)]",
    strokeWidth: 1.5
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none mix-blend-screen">
      <div className="flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-md p-10 rounded-full border border-[#3898ec]/20 shadow-[0_0_50px_rgba(56,152,236,0.15)]">
        {direction === 'FORWARD' && <ChevronsUp {...arrowProps} />}
        {direction === 'LEFT' && <ChevronsLeft {...arrowProps} />}
        {direction === 'RIGHT' && <ChevronsRight {...arrowProps} />}
        {direction === 'TURN_AROUND' && <RotateCcw {...arrowProps} />}
        {direction === 'ARRIVED' && <CheckCircle className="w-48 h-48 text-green-400 animate-pulse drop-shadow-[0_0_25px_rgba(74,222,128,0.8)]" strokeWidth={1.5} />}

        <span className="text-2xl font-black tracking-[0.5em] text-[#3898ec] drop-shadow-[0_0_10px_rgba(56,152,236,0.8)] uppercase">
          {direction.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}

function SwarmInterface() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logsEndRef = useRef(null);

  const [memory, setMemory] = useState({
    landmarks: [],
    hazards: [],
    state: "Scanning environment...",
    logs: []
  });
  const [isScouting, setIsScouting] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState('scout'); // scout, cartographer, coordinator
  const [activeDirection, setActiveDirection] = useState('NONE');

  const addLog = (msg, type = "info") => {
    setMemory(prev => ({
      ...prev,
      logs: [...prev.logs, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }), msg, type }]
    }));
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memory.logs.length]);

  // Initialize Camera
  useEffect(() => {
    let activeStream = null;
    async function setupCamera() {
      try {
        const _stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } }
        });
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
    const ai = new GoogleGenAI({ apiKey: API_KEY });

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

        const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
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
  }, [isScouting]);

  // Coordinator handles the user question
  const handleAskSwarm = async (e) => {
    e.preventDefault();
    if (!userQuery.trim() || !API_KEY) return;

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    setActiveAgent('coordinator');
    const question = userQuery;
    setUserQuery('');

    addLog(`USER >> ${question}`, "info");
    setMemory(prev => ({ ...prev, state: "PROCESSING NEURAL PATHWAYS..." }));

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
                
                Provide human-like, concise navigation instructions (max 2 sentences).
                If you see the goal in the live image, guide them directly.
                If it's in the memory database, tell them how to get there.
                If nowhere to be found, ask them to find a floorplan or map.

                RESPOND STRICTLY IN JSON format:
                {
                  "instruction": "Your human-like answer here",
                  "ar_direction": "FORWARD" // MUST BE EXACTLY ONE OF: FORWARD, LEFT, RIGHT, TURN_AROUND, ARRIVED, or NONE
                }`
              }
            ]
          }
        ]
      });

      // Parse JSON from response
      const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(jsonStr);

      const answer = data.instruction || "Could not parse navigation instructions.";
      const direction = data.ar_direction || "NONE";

      setActiveDirection(direction);
      addLog(`Coordinator: ${answer}`, "success");
      setMemory(prev => ({ ...prev, state: `AR HUD POINTING: ${direction}` }));

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
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden text-neutral-100 font-sans selection:bg-[#3898ec] selection:text-white">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen scale-105"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Cinematic AR Overlays */}
      <div className="scanlines absolute inset-0 mix-blend-overlay"></div>
      <div className="vignette absolute inset-0"></div>

      {/* Augmented Reality Container */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10 transition-all duration-500">

        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="glass-panel px-5 py-2.5 rounded-sm flex items-center gap-4 data-sweep box-border border-l-2 border-l-[#3898ec]">
            <BrainCircuit className={`w-5 h-5 ${isScouting ? 'text-[#3898ec] animate-pulse' : 'text-neutral-600'}`} />
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase leading-none mb-1">System State</span>
              <span className="text-xs font-bold tracking-widest text-neutral-100 uppercase leading-none">
                {isScouting ? 'SWARM UPLINK ESTABLISHED' : 'SYSTEM STANDBY'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsScouting(!isScouting)}
            className={`pointer-events-auto px-6 py-2.5 rounded-sm text-xs font-bold tracking-widest transition-all uppercase
               ${isScouting
                ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-[#3898ec]/10 text-[#3898ec] border border-[#3898ec]/50 hover:bg-[#3898ec]/20 shadow-[0_0_15px_rgba(56,152,236,0.2)]'}`}
          >
            {isScouting ? 'TERMINATE UPLINK' : 'INITIALIZE UPLINK'}
          </button>
        </div>

        {/* Center Target AR HUD */}
        <div className="flex-1 flex items-center justify-center relative">

          {/* Central status readout */}
          {memory.state && isScouting && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 border border-[#3898ec]/30 rounded-sm">
              <span className="text-xs font-mono text-[#3898ec] uppercase tracking-widest animate-pulse flex items-center gap-2">
                <Activity className="w-4 h-4" /> {memory.state}
              </span>
            </div>
          )}

          <div className={`w-[350px] h-[350px] border-[0.5px] border-[#3898ec]/10 rounded-full flex items-center justify-center relative
                          ${isScouting ? 'radar-spin opacity-80' : 'opacity-20'}`}>
            <div className="w-[180px] h-[180px] border border-[#3898ec]/50 rounded-full pulse-glow" />

            {/* Architectural Reticles */}
            <div className="absolute w-[400px] h-[0.5px] bg-[#3898ec]/20" />
            <div className="absolute h-[400px] w-[0.5px] bg-[#3898ec]/20" />

            {/* Corner brackets */}
            <div className="absolute w-[350px] h-[350px] border border-[#3898ec]/30 rounded-full border-t-transparent border-b-transparent animate-[spin_8s_linear_reverse_infinite]" />
          </div>

          {/* AR Direction Overlay HUD */}
          <ARDirectionOverlay direction={activeDirection} />

        </div>

        {/* Bottom Swarm UI Dashboard */}
        <div className="glass-panel rounded-sm border-t-2 border-t-[#3898ec]/50 p-6 mt-auto flex flex-col gap-5 max-h-[45vh] pointer-events-auto backdrop-blur-xl">

          <div className="flex gap-6 mb-2">
            {/* Memory Graph */}
            <div className="flex-1 overflow-y-auto max-h-[160px] pr-4 scrollbar-hide space-y-3">
              <div className="text-[10px] font-bold text-[#3898ec] uppercase tracking-[0.2em] sticky top-0 bg-[#0a0a0a]/90 backdrop-blur pb-2 z-10 border-b border-white/5 mb-3">
                Spatial Knowledge Graph <span className="text-neutral-500 ml-2">[{memory.landmarks.length} NODES]</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {memory.landmarks.length === 0 && <span className="text-[11px] text-neutral-600 font-mono tracking-widest">Awaiting spatial mappings...</span>}
                {memory.landmarks.map((m, i) => (
                  <div key={i} className="bg-white/5 text-neutral-200 border border-white/10 px-3 py-1.5 rounded-sm text-[11px] font-mono flex items-center gap-2 hover:bg-white/10 transition-colors">
                    <Navigation className="w-3 h-3 text-[##3898ec]" /> {m}
                  </div>
                ))}
              </div>

              {memory.hazards.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3 animate-pulse" /> Critical Path Hazards
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {memory.hazards.map((h, i) => (
                      <div key={i} className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-sm text-[11px] font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Agent Logs */}
            <div className="w-[300px] border-l border-white/10 pl-5 flex flex-col bg-black/20 rounded-sm box-border relative">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur pb-2">Swarm Telemetry</div>
              <div className="flex-1 overflow-y-auto max-h-[140px] space-y-3 scroll-smooth">
                {memory.logs.map((log, i) => (
                  <div key={i} className={`text-[11px] font-mono leading-relaxed flex flex-col ${log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-[#3898ec]' :
                      log.type === 'warning' ? 'text-yellow-400' : 'text-neutral-400'
                    }`}>
                    <span className="opacity-40 text-[9px] tracking-widest">{log.time}</span>
                    <TypewriterText text={log.msg} speed={10} />
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#3898ec]/30 to-transparent my-1" />

          {/* User Input Coordinator */}
          <form onSubmit={handleAskSwarm} className="relative flex items-center group">
            <div className="absolute left-4 shadow-[0_0_10px_rgba(56,152,236,0.2)] p-1.5 rounded-sm bg-[#3898ec]/20 border border-[#3898ec]/30">
              {activeAgent === 'scout' ? <Camera className="w-4 h-4 text-[#3898ec]" /> :
                activeAgent === 'coordinator' ? <Mic className="w-4 h-4 text-[#3898ec] animate-pulse" /> :
                  <Map className="w-4 h-4 text-[#3898ec]" />}
            </div>
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Query Swarm Intelligence (e.g. Locate nearest exit)"
              className="w-full bg-black/60 border border-white/10 group-hover:border-[#3898ec]/50 focus:border-[#3898ec] rounded-sm pl-16 pr-14 py-4 text-[13px] font-mono text-white placeholder-neutral-600 outline-none transition-all duration-300"
            />
            <button type="submit" className="absolute right-2 px-4 py-2 bg-[#3898ec] hover:bg-blue-400 rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(56,152,236,0.3)]">
              <Zap className="w-4 h-4 text-black" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
