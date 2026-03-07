import { useState, useRef, useEffect } from 'react';
import { Camera, Map, Compass, Mic, Navigation, Zap, ShieldAlert, KeyRound, BrainCircuit, Activity, ChevronsUp, ChevronsDown, ChevronsRight, ChevronsLeft, RotateCcw, CheckCircle, Crosshair } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// ------------------------------------------------------------------
// API KEY CONFIGURATION
// Paste your Gemini API key directly here.
const API_KEY = "AIzaSyAl7iJv_mcARsmJtE10CpbRVrznftLWIYg";
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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Motion Detection Refs
  const lastOrientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const lastMotionRef = useRef(Date.now());

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
  const [isListening, setIsListening] = useState(false);
  const [activeTargets, setActiveTargets] = useState([]); // [{ label, box: [y1, x1, y2, x2] }]
  const [isMoving, setIsMoving] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState('');

  const addLog = (msg, type = "info") => {
    setMemory(prev => ({
      ...prev,
      logs: [...prev.logs, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }), msg, type }]
    }));
  };

  // Helper to sync subtitles based on external audio duration
  const startSubtitleSync = (text, durationMs) => {
    setActiveSubtitle('');
    clearTimeout(window.subtitleTimeout);
    clearInterval(window.subtitleInterval);

    const words = text.split(' ');
    const msPerWord = durationMs / words.length;
    let currentIndex = 0;

    window.subtitleInterval = setInterval(() => {
      if (currentIndex < words.length) {
        setActiveSubtitle(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(window.subtitleInterval);
        window.subtitleTimeout = setTimeout(() => {
          setActiveSubtitle('');
        }, 2000);
      }
    }, msPerWord);
  };

  const speakNaturalTone = (text) => {
    if (!text || text.trim() === '') return;

    // Direct Web Speech API Synthesis
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly faster for techy feel

      // Start subtitle sync based on approximate reading duration
      const words = text.split(' ').length;
      const durationMs = (words / 2.5) * 1000; // ~2.5 words per second
      startSubtitleSync(text, durationMs);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memory.logs.length]);

  // IMU Motion Detection (Variable Polling)
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.alpha === null) return;
      const { alpha, beta, gamma } = event;
      const last = lastOrientationRef.current;
      const move = Math.abs(alpha - last.alpha) + Math.abs(beta - last.beta) + Math.abs(gamma - last.gamma);

      if (move > 10) { // Device is panning
        lastMotionRef.current = Date.now();
        setIsMoving(true);
        lastOrientationRef.current = { alpha, beta, gamma };
      } else if (Date.now() - lastMotionRef.current > 3000) {
        // Still for 3 seconds
        setIsMoving(false);
      }
    };

    // Start listening to IMU
    window.addEventListener('deviceorientation', handleOrientation);

    // Fallback Mock for Desktop Dev (Since IMU might be null): Toggle motion every 15s to demo
    const mockInterval = setInterval(() => {
      setIsMoving(prev => !prev);
    }, 15000);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearInterval(mockInterval);
    };
  }, []);

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

      // Variable API Polling logic!
      if (!isMoving) {
        setMemory(prev => ({ ...prev, state: "STATIONARY: Polling halted to save API cost." }));
        return; // Don't process if still
      }

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
  }, [isScouting, isMoving]);

  // Coordinator handles the user question
  const handleAskSwarm = async (e, audioBase64 = null, audioMimeType = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!userQuery.trim() && !audioBase64 && !API_KEY) return;

    // Cancel any currently playing audio loops
    clearInterval(window.subtitleInterval);

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    setActiveAgent('coordinator');
    const question = typeof e === 'string' ? e : userQuery || "Voice Audio attached.";
    if (typeof e !== 'string') setUserQuery('');

    addLog(`USER >> ${audioBase64 ? "[AUDIO SENT TO SWARM]" : question}`, "info");
    setMemory(prev => ({ ...prev, state: "PROCESSING NEURAL PATHWAYS..." }));

    try {
      const db = JSON.stringify({ landmarks: memory.landmarks, hazards: memory.hazards });
      const frameBase64 = captureFrame();

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              ...(audioBase64 ? [{ inlineData: { data: audioBase64, mimeType: audioMimeType } }] : []),
              ...(frameBase64 ? [{ inlineData: { data: frameBase64, mimeType: 'image/jpeg' } }] : []),
              {
                text: `You are the NaviSwarm Coordinator Agent. The user asks: "${question}". 
                (If an audio voice file is attached, LISTEN CAREFULLY to the audio instead to dictate the objective).
                
                Current visual spatial memory database: ${db}
                (If an image is attached, it's the user's current LIVE view).
                
                INSTRUCTIONS:
                1. Provide a human-like, conversational response (1-2 sentences).
                2. If the goal is in the live image, guide them to it.
                3. If it's in the memory database, tell them how to get there.
                
                YOU MUST STRICTLY USE THIS EXACT MULTI-LINE FORMAT (Do not use JSON or Markdown):
                MESSAGE: <Your conversational text>
                DIRECTION: <FORWARD|LEFT|RIGHT|TURN_AROUND|ARRIVED|NONE>
                TARGET_LABEL: <Target Name or NONE>
                TARGET_BOX: <ymin,xmin,ymax,xmax values 0-1000 or NONE>
                `
              }
            ]
          }
        ]
      });

      let fullResponseString = '';
      let spokenMessage = '';
      let sentenceBuffer = '';

      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        fullResponseString += chunkText;

        const msgMatch = fullResponseString.match(/MESSAGE:\s*(.*?)(?=\n[A-Z_]+:|$)/s);
        if (msgMatch) {
          const currentMessage = msgMatch[1];
          const newText = currentMessage.substring(spokenMessage.length + sentenceBuffer.length);
          if (newText) {
            sentenceBuffer += newText;
            setMemory(prev => ({ ...prev, state: `COORDINATOR: ${currentMessage}` }));

            // Match chunked sentences for smooth streaming TTS
            const sentenceMatch = sentenceBuffer.match(/^.*?[.!?](?:\s|$)/);
            if (sentenceMatch) {
              const sentence = sentenceMatch[0];
              speakNaturalTone(sentence);
              spokenMessage += sentence;
              sentenceBuffer = sentenceBuffer.substring(sentence.length);
            }
          }
        }
      }

      // Flush remaining text
      if (sentenceBuffer.trim().length > 0) {
        speakNaturalTone(sentenceBuffer);
      }

      // Metadata parsing
      const dirMatch = fullResponseString.match(/DIRECTION:\s*([A-Za-z_]+)/);
      const labelMatch = fullResponseString.match(/TARGET_LABEL:\s*(.*)/);
      const boxMatch = fullResponseString.match(/TARGET_BOX:\s*([0-9,]+)/);

      const direction = dirMatch ? dirMatch[1].trim() : 'NONE';
      setActiveDirection(direction);

      if (labelMatch && boxMatch && labelMatch[1].trim() !== 'NONE' && boxMatch[1].trim() !== 'NONE') {
        const coords = boxMatch[1].trim().split(',').map(Number);
        if (coords.length === 4) {
          setActiveTargets([{ label: labelMatch[1].trim(), box: coords }]);
        }
      } else {
        setActiveTargets([]);
      }

      // Restore full message to the visual log terminal
      const finalMsgMatch = fullResponseString.match(/MESSAGE:\s*(.*?)(?=\n[A-Z_]+:|$)/s);
      const finalMsg = finalMsgMatch ? finalMsgMatch[1].trim() : "Audio Reply Streamed.";
      addLog(`Coordinator: ${finalMsg}`, "success");

    } catch (err) {
      console.error(err);
      addLog(`Coordinator Error: ${err.message}`, "error");
    }
  };

  const toggleVoiceCommand = async () => {
    // If already listening, stop recording
    if (isListening && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      return;
    }

    // Start recording audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        addLog("Audio captured, routing to Gemini...", "info");

        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          handleAskSwarm(null, base64Data, audioBlob.type);
        };

        // Turn off mic tracks
        stream.getTracks().forEach(track => track.stop());
      });

      setIsListening(true);
      setActiveAgent('coordinator');
      mediaRecorder.start();

      // Auto-stop after 5 seconds limit
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 5000);

    } catch (err) {
      console.error("Audio Recording Error:", err);
      setIsListening(false);
      addLog(`Mic Error: ${err.message || 'Permission denied'}`, "error");
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
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase leading-none mb-1 flex items-center gap-2">
                System State {isScouting && <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} title={isMoving ? "Motion Detected" : "Stationary (Saving API cost)"} />}
              </span>
              <span className="text-xs font-bold tracking-widest text-neutral-100 uppercase leading-none">
                {isScouting ? (isMoving ? 'SWARM UPLINK ESTABLISHED' : 'STATIONARY MODE (POLLING PAUSED)') : 'SYSTEM STANDBY'}
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

          {/* AR Bounding Box Tracker */}
          {activeTargets.map((target, idx) => {
            const [ymin, xmin, ymax, xmax] = target.box;
            const top = `${(ymin / 1000) * 100}%`;
            const left = `${(xmin / 1000) * 100}%`;
            const height = `${((ymax - ymin) / 1000) * 100}%`;
            const width = `${((xmax - xmin) / 1000) * 100}%`;

            return (
              <div
                key={idx}
                className="absolute border-2 border-[#3898ec] bg-[#3898ec]/10 shadow-[0_0_20px_rgba(56,152,236,0.5)] transition-all duration-700 ease-in-out pointer-events-none z-30 flex flex-col justify-start items-start"
                style={{ top, left, width, height }}
              >
                {/* Reticle Corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -translate-x-[2px] -translate-y-[2px]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white translate-x-[2px] -translate-y-[2px]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -translate-x-[2px] translate-y-[2px]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white translate-x-[2px] translate-y-[2px]" />

                {/* Target Label */}
                <div className="absolute -top-7 left-0 bg-[#3898ec] text-white text-[10px] font-mono tracking-widest px-2 py-1 flex items-center gap-1 uppercase whitespace-nowrap box-border shadow-lg">
                  <Crosshair className="w-3 h-3 animate-spin duration-[3000ms]" />
                  [LOCK-ON] {target.label}
                </div>
              </div>
            );
          })}

          {/* Cinematic Word-by-Word Subtitles */}
          {activeSubtitle && (
            <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-4/5 text-center pointer-events-none z-50">
              <span className="bg-black/70 backdrop-blur-md text-white font-mono text-lg md:text-xl px-4 py-2 leading-relaxed tracking-wider shadow-[0_0_20px_rgba(56,152,236,0.3)] border-l-4 border-[#3898ec]">
                {activeSubtitle}
                <span className="w-2 h-5 inline-block bg-[#3898ec] animate-[pulse_0.5s_infinite] ml-2 align-middle"></span>
              </span>
            </div>
          )}

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
          <form onSubmit={handleAskSwarm} className="relative flex items-center gap-2 group pointer-events-auto">
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-4 shadow-[0_0_10px_rgba(56,152,236,0.2)] p-1.5 rounded-sm bg-[#3898ec]/20 border border-[#3898ec]/30 z-10">
                {activeAgent === 'scout' ? <Camera className="w-4 h-4 text-[#3898ec]" /> :
                  activeAgent === 'coordinator' ? <Mic className={`w-4 h-4 text-[#3898ec] ${isListening ? 'animate-pulse' : ''}`} /> :
                    <Map className="w-4 h-4 text-[#3898ec]" />}
              </div>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={isListening ? "LISTENING FOR UPLINK COMMAND..." : "Query Swarm Intelligence (e.g. Locate nearest exit)"}
                className={`w-full bg-black/60 border border-white/10 group-hover:border-[#3898ec]/50 focus:border-[#3898ec] rounded-sm pl-16 pr-14 py-4 text-[13px] font-mono text-white placeholder-neutral-600 outline-none transition-all duration-300 ${isListening ? 'ring-1 ring-purple-500/50 border-purple-500' : ''}`}
              />
              <button type="submit" className="absolute right-2 px-4 py-2 bg-[#3898ec] hover:bg-blue-400 rounded-sm transition-all duration-300 shadow-[0_0_15px_rgba(56,152,236,0.3)]">
                <Zap className="w-4 h-4 text-black" />
              </button>
            </div>

            <button
              type="button"
              onClick={toggleVoiceCommand}
              className={`p-4 rounded-sm transition-all flex items-center justify-center border ${isListening ? 'bg-purple-500/20 border-purple-500 animate-[pulse_1s_infinite] shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
              title="Voice Control"
            >
              <Mic className={`w-5 h-5 ${isListening ? 'text-purple-400' : 'text-neutral-400'}`} />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
