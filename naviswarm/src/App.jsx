import { useState, useRef, useEffect } from 'react';
import { Camera, Map, Compass, Mic, Navigation, Zap, ShieldAlert, KeyRound, BrainCircuit, Activity, ChevronsUp, ChevronsDown, ChevronsRight, ChevronsLeft, RotateCcw, CheckCircle, Crosshair, Power, ArrowUp } from 'lucide-react';
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
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3898ec] to-indigo-500"></div>

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
// Minimalist, User-Centric AR Directional Overlay
// ------------------------------------------------------------------
function ARDirectionOverlay({ direction, instruction }) {
  if (!direction || direction === 'NONE') return null;

  const arrowProps = {
    className: "w-64 h-64 text-white drop-shadow-[0_10px_30px_rgba(56,152,236,1)] animate-[float_3s_ease-in-out_infinite]",
    strokeWidth: 2.5
  };

  return (
    <div className="absolute top-[15%] left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
      <div className="flex flex-col items-center justify-center gap-6">
        {direction === 'FORWARD' && <ChevronsUp {...arrowProps} />}
        {direction === 'LEFT' && <ChevronsLeft {...arrowProps} />}
        {direction === 'RIGHT' && <ChevronsRight {...arrowProps} />}
        {direction === 'TURN_AROUND' && <RotateCcw {...arrowProps} />}
        {direction === 'ARRIVED' && <CheckCircle className="w-64 h-64 text-green-400 drop-shadow-[0_10px_30px_rgba(74,222,128,0.8)] animate-[pulse_1.5s_ease-in-out_infinite]" strokeWidth={2.5} />}

        <div className="bg-black/40 backdrop-blur-xl px-10 py-4 rounded-full border border-white/20 shadow-2xl">
          <span className="text-4xl font-black tracking-widest text-white uppercase text-center block">
            {direction.replace('_', ' ')}
          </span>
        </div>
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
    state: "System is ready",
    logs: [],
    lastAnswer: ""
  });
  const [isScouting, setIsScouting] = useState(false);
  const [userQuery, setUserQuery] = useState('');
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

    // Direct Web Speech API Synthesis (Fallback)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly faster for techy feel

      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Premium') ||
        v.name.includes('Daniel')
      );
      if (premiumVoice) utterance.voice = premiumVoice;

      // Start subtitle sync based on approximate reading duration
      const durationMs = (text.split(' ').length / 2.5) * 1000;
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
    if (cw === 0 || ch === 0) return null;
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
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const question = typeof e === 'string' ? e : userQuery || "Voice Audio attached.";
    if (typeof e !== 'string') setUserQuery('');

    addLog(`USER >> ${audioBase64 ? "[AUDIO SENT TO SWARM]" : question}`, "info");
    setActiveSubtitle('');
    setMemory(prev => ({ ...prev, state: "Processing your request...", lastAnswer: "" }));

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
      setMemory(prev => ({ ...prev, lastAnswer: finalMsg }));

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
    <div className="relative w-full h-screen bg-black overflow-hidden text-neutral-100 font-sans selection:bg-[#3898ec] selection:text-white">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Subtle UI Enhancements */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none z-0"></div>

      {/* Main UI Container */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between z-10 transition-all duration-500">

        {/* Top Header - User Friendly */}
        <div className="flex justify-between items-start pointer-events-none mt-2">
          <div className="bg-black/40 backdrop-blur-2xl px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/10 shadow-lg max-w-[65%]">
            <BrainCircuit className={`w-8 h-8 ${isScouting ? 'text-[#3898ec] animate-[pulse_2s_ease-in-out_infinite]' : 'text-neutral-500'}`} />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wide text-white flex items-center gap-2">
                {isScouting ? 'AI Guide Active' : 'AI Guide Offline'}
                {isScouting && <div className={`w-2.5 h-2.5 rounded-full ${isMoving ? 'bg-[#3898ec] animate-pulse shadow-[0_0_10px_rgba(56,152,236,0.8)]' : 'bg-yellow-500'}`} />}
              </span>
              {/* Show background AI task explicitly */}
              <span className="text-xs text-neutral-300 font-medium leading-tight mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {isScouting ? memory.state : "Ready to scan"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsScouting(!isScouting)}
            className={`pointer-events-auto px-5 py-3 flex items-center gap-2 rounded-full backdrop-blur-2xl transition-all shadow-lg text-sm font-bold tracking-wider
               ${isScouting
                ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30'
                : 'bg-[#3898ec] text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(56,152,236,0.5)]'}`}
          >
            <Power className="w-5 h-5" />
            {isScouting ? 'END TOUR' : 'START'}
          </button>
        </div>

        {/* Center Target AR HUD */}
        <div className="flex-1 flex items-center justify-center relative pointer-events-none">

          {/* Subtle Central Reticle when not directing */}
          {(!activeDirection || activeDirection === 'NONE') && isScouting && (
            <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white/50 rounded-full" />
            </div>
          )}

          {/* Massive AR Direction Overlay HUD */}
          <ARDirectionOverlay direction={activeDirection} instruction={memory.lastAnswer} />

          {/* AR Bounding Box Tracker - Refined */}
          {activeTargets.map((target, idx) => {
            const [ymin, xmin, ymax, xmax] = target.box;
            const top = `${(ymin / 1000) * 100}%`;
            const left = `${(xmin / 1000) * 100}%`;
            const height = `${((ymax - ymin) / 1000) * 100}%`;
            const width = `${((xmax - xmin) / 1000) * 100}%`;

            return (
              <div
                key={idx}
                className="absolute border-4 border-[#3898ec]/80 bg-[#3898ec]/10 shadow-[0_0_30px_rgba(56,152,236,0.3)] rounded-2xl transition-all duration-500 ease-out pointer-events-none z-30"
                style={{ top, left, width, height }}
              >
                {/* Clean Target Pill */}
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl border border-white/10 text-white text-base font-bold px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl whitespace-nowrap">
                  <Crosshair className="w-5 h-5 text-[#3898ec] animate-[spin_4s_linear_infinite]" />
                  {target.label}
                </div>
              </div>
            );
          })}

        </div>

        {/* Bottom Floating Command Bar */}
        <div className="w-full flex justify-center sticky bottom-0 z-40">
          <div className="w-full max-w-lg mb-8 pointer-events-auto">

            {/* Dynamic Subtitles floating directly above the input */}
            <div className="w-full flex justify-center mb-6 pointer-events-none">
              {activeSubtitle ? (
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 text-white font-medium text-2xl px-8 py-4 rounded-3xl text-center shadow-2xl">
                  {activeSubtitle}
                </div>
              ) : memory.lastAnswer ? (
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 text-white/90 font-medium text-lg px-6 py-3 rounded-2xl max-w-[85%] text-center opacity-80 transition-opacity">
                  "{memory.lastAnswer}"
                </div>
              ) : null}
            </div>

            {/* Search / Voice unified pill */}
            <div className="flex gap-3">
              <form onSubmit={handleAskSwarm} className="relative flex-1 flex items-center group">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={isListening ? "Actively listening..." : "Where would you like to go?"}
                  className={`w-full bg-black/50 backdrop-blur-3xl border border-white/20 focus:border-[#3898ec] focus:bg-black/80 rounded-full pl-6 pr-16 py-4 text-lg text-white placeholder-neutral-400 shadow-2xl outline-none transition-all duration-300 ${isListening ? 'bg-[#3898ec]/20 border-[#3898ec] placeholder-white' : ''}`}
                />
                <button type="submit" className="absolute right-2 p-2.5 bg-white hover:bg-gray-200 rounded-full transition-all duration-300 shadow-lg group-focus-within:bg-[#3898ec] group-focus-within:text-white text-black">
                  <ArrowUp className="w-6 h-6" strokeWidth={3} />
                </button>
              </form>

              <button
                type="button"
                onClick={toggleVoiceCommand}
                className={`p-4 rounded-full transition-all shadow-2xl flex items-center justify-center backdrop-blur-3xl ${isListening ? 'bg-red-500 text-white animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-black/50 border border-white/20 hover:bg-black/70 text-white'}`}
              >
                <Mic className="w-6 h-6" strokeWidth={isListening ? 3 : 2} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
