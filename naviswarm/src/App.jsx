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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="max-w-xl w-full nav-panel p-12 rounded-[2.5rem] text-center border-none">
          <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-full shadow-xl">
              <img src="/logo.png" alt="NaviSwarm Logo" className="w-24 h-24 rounded-full object-cover" />
            </div>
          </div>

          <h1 className="text-5xl font-black mb-4 tracking-tight text-slate-900">Digital Assistant</h1>
          <p className="text-2xl text-slate-500 mb-12 font-medium">Helping you find your way, safely.</p>

          <form onSubmit={startSwarm} className="space-y-6">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-8 px-8 rounded-3xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-4 text-3xl"
            >
              Start Guide
              <Zap className="w-8 h-8" />
            </button>
          </form>

          <p className="mt-8 text-slate-400 font-medium">Click the button above to begin.</p>
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
// ------------------------------------------------------------------
// AR Directional Overlay Component - Redesigned for Elderly
// ------------------------------------------------------------------
function ARDirectionOverlay({ direction, instruction }) {
  if (!direction || direction === 'NONE') {
    if (instruction) {
      return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] z-20 pointer-events-none">
          <div className="direction-card p-10 rounded-[3rem] text-center border-8 border-white">
            <p className="text-4xl font-bold leading-tight">{instruction}</p>
          </div>
        </div>
      );
    }
    return null;
  }

  const iconProps = {
    className: "w-40 h-40 text-white mb-6",
    strokeWidth: 3
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none p-10">
      <div className="direction-card w-full max-w-2xl p-12 rounded-[4rem] flex flex-col items-center border-[10px] border-white">
        {direction === 'FORWARD' && <ChevronsUp {...iconProps} />}
        {direction === 'LEFT' && <ChevronsLeft {...iconProps} />}
        {direction === 'RIGHT' && <ChevronsRight {...iconProps} />}
        {direction === 'TURN_AROUND' && <RotateCcw {...iconProps} />}
        {direction === 'ARRIVED' && <CheckCircle className="w-40 h-40 text-green-300 mb-6" strokeWidth={3} />}

        <h2 className="text-6xl font-black mb-4 uppercase tracking-tighter">
          {direction === 'FORWARD' && "Go Forward"}
          {direction === 'LEFT' && "Turn Left"}
          {direction === 'RIGHT' && "Turn Right"}
          {direction === 'TURN_AROUND' && "Go Back"}
          {direction === 'ARRIVED' && "You Are Here!"}
        </h2>

        {instruction && <p className="text-3xl font-semibold opacity-90 text-center">{instruction}</p>}
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
    <div className="relative w-full h-screen bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {/* Video Feed Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Simplified AR Overlays */}
      <div className="soft-vignette absolute inset-0"></div>

      {/* Main UI Container */}
      <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-10">

        {/* Top Controls */}
        <div className="flex justify-between items-start">
          <div className="nav-panel px-8 py-5 rounded-[2rem] flex items-center gap-6 border-none">
            <div className={`p-4 rounded-full bg-blue-100 ${isScouting ? 'animate-pulse' : ''}`}>
              <BrainCircuit className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                {isScouting ? 'Guide is ON' : 'Guide is OFF'}
                {isScouting && <div className={`w-4 h-4 rounded-full ${isMoving ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} title={isMoving ? "Motion Detected" : "Stationary (Saving energy)"} />}
              </span>
              <span className="text-xl text-slate-500 font-bold">
                {isScouting && !isMoving ? 'Currently waiting for you to move...' : memory.state}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsScouting(!isScouting)}
            className={`pointer-events-auto px-10 py-6 rounded-[2rem] text-2xl font-black transition-all uppercase shadow-2xl
               ${isScouting
                ? 'bg-red-500 text-white'
                : 'bg-blue-600 text-white'}`}
          >
            {isScouting ? 'Stop' : 'Start'}
          </button>
        </div>

        {/* Center Directions (AR Overlays) */}
        <div className="flex-1 flex items-center justify-center relative">
          <ARDirectionOverlay direction={activeDirection} instruction={memory.lastAnswer} />

          {/* Subtle Reticle */}
          {(!activeDirection || activeDirection === 'NONE') && (
            <div className="w-64 h-64 border-8 border-white/30 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-white/20 rounded-full pulse-glow" />
            </div>
          )}

          {/* AR Bounding Box Tracker - Styled for Accessibility */}
          {activeTargets.map((target, idx) => {
            const [ymin, xmin, ymax, xmax] = target.box;
            const top = `${(ymin / 1000) * 100}%`;
            const left = `${(xmin / 1000) * 100}%`;
            const height = `${((ymax - ymin) / 1000) * 100}%`;
            const width = `${((xmax - xmin) / 1000) * 100}%`;

            return (
              <div
                key={idx}
                className="absolute border-8 border-blue-500 bg-blue-500/10 rounded-2xl shadow-2xl transition-all duration-700 ease-in-out pointer-events-none z-30"
                style={{ top, left, width, height }}
              >
                {/* Visual Label */}
                <div className="absolute -top-16 left-0 bg-blue-600 text-white text-2xl font-black px-6 py-2 rounded-full shadow-lg flex items-center gap-3 whitespace-nowrap">
                  <div className="w-4 h-4 bg-white rounded-full animate-ping" />
                  {target.label}
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

        {/* Bottom Control Bar */}
        <div className="flex flex-col gap-6 mt-auto pointer-events-auto">
          {/* Map Preview (Circle) */}
          <div className="flex justify-center">
            <div className="w-56 h-56 rounded-full bg-white/90 backdrop-blur-xl map-circle relative overflow-hidden flex items-center justify-center border-none">
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i18!2i132470!3i92750!2m3!1e0!2sm!3i667059784!3m17!2sen!3sUS!5e18!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m3!1e12!2m1!1s1!4m5!1e1!2swhite!5e0!5m1!1f2!6m8!1e1!2b1!3b1!4b1!5b1!6b1!7b1!8b1!9b1')] bg-cover scale-150 rotate-12"></div>
              <div className="relative z-10 flex flex-col items-center">
                <Navigation className="w-16 h-16 text-blue-600 drop-shadow-lg" fill="currentColor" />
                <span className="text-xs font-black uppercase mt-2 text-blue-800">Your Location</span>
              </div>
              {/* Pulse at bottom circle */}
              <div className="absolute bottom-4 w-4 h-4 bg-blue-600 rounded-full animate-ping"></div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-1">
              <form onSubmit={handleAskSwarm} className="relative flex items-center">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={isListening ? "Listening..." : "How can I help you today?"}
                  className={`w-full bg-white text-3xl font-bold py-10 px-12 rounded-[3.5rem] shadow-2xl border-none focus:ring-8 focus:ring-blue-200 outline-none transition-all ${isListening ? 'ring-8 ring-blue-500' : ''}`}
                />
                <button type="submit" className="absolute right-4 p-6 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-xl transition-all active:scale-95">
                  <Zap className="w-10 h-10" />
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={toggleVoiceCommand}
              className={`p-4 rounded-sm transition-all flex items-center justify-center border ${isListening ? 'bg-purple-500/20 border-purple-500 animate-[pulse_1s_infinite] shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
              title="Voice Control"
            >
              <Mic className="w-14 h-14" strokeWidth={3} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
