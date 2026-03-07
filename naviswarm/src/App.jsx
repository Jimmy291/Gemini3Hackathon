import { useState, useRef, useEffect } from 'react';
import { Camera, Map, Compass, Mic, Navigation, Zap, ShieldAlert, KeyRound, BrainCircuit, Activity, ChevronsUp, ChevronsDown, ChevronsRight, ChevronsLeft, RotateCcw, CheckCircle, Crosshair, Power, ArrowUp, ZapOff } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AudioRecorder, AudioPlayer } from './lib/audio-utils.js';

// ------------------------------------------------------------------
// API KEY CONFIGURATION
// Paste your Gemini API key directly here.
const API_KEY = "AIzaSyBGLosDsHIRQBsFT2JV3FUlGmlPUS2mvac";
// ------------------------------------------------------------------

export default function App() {
  const [isReady, setIsReady] = useState(true);

  // The startSwarm function and the conditional rendering for the initial screen
  // are removed as per the instruction to set isReady to true by default.

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
    className: "w-64 h-64 text-white drop-shadow-[0_15px_40px_rgba(56,152,236,1)] ar-float",
    strokeWidth: 2.5
  };

  return (
    <div className="absolute top-[12%] left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
      <div className="flex flex-col items-center justify-center gap-10">
        {direction === 'FORWARD' && <ChevronsUp {...arrowProps} />}
        {direction === 'LEFT' && <ChevronsLeft {...arrowProps} />}
        {direction === 'RIGHT' && <ChevronsRight {...arrowProps} />}
        {direction === 'TURN_AROUND' && <RotateCcw {...arrowProps} />}
        {direction === 'ARRIVED' && <CheckCircle className="w-64 h-64 text-green-400 drop-shadow-[0_15px_40px_rgba(74,222,128,0.8)] animate-[pulse_1.5s_ease-in-out_infinite]" strokeWidth={2.5} />}

        <div className="bg-black/60 backdrop-blur-2xl px-12 py-5 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <span className="text-5xl font-black tracking-[0.2em] text-[#3898ec] animate-pulse uppercase text-center block">
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
  // mediaRecorderRef and audioChunksRef are no longer needed as toggleVoiceCommand is removed
  // const mediaRecorderRef = useRef(null);
  // const audioChunksRef = useRef([]);

  // Motion Detection Refs
  const lastOrientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });
  const lastMotionRef = useRef(Date.now());

  // Gemini Live State
  const [liveMode, setLiveMode] = useState(false);
  const liveSessionRef = useRef(null);
  const liveRecorderRef = useRef(new AudioRecorder(16000));
  const livePlayerRef = useRef(new AudioPlayer(24000));
  const liveVisionIntervalRef = useRef(null);

  const [memory, setMemory] = useState({
    landmarks: [],
    hazards: [],
    state: "System is ready",
    logs: [],
    lastAnswer: ""
  });
  const [isScouting, setIsScouting] = useState(true); // Set to true by default
  const [userQuery, setUserQuery] = useState('');
  const [activeDirection, setActiveDirection] = useState('NONE');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTargets, setActiveTargets] = useState([]); // [{ label, box: [y1, x1, y2, x2] }]
  const [isMoving, setIsMoving] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState('');

  // Camera State
  const currentCameraIdRef = useRef(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

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

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      const voices = window.speechSynthesis.getVoices();
      // Prioritize Samantha for that Siri feel on Mac
      const siriVoice = voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Google')) ||
        voices.find(v => v.name.includes('Premium')) ||
        voices.find(v => v.name.includes('Daniel'));

      if (siriVoice) utterance.voice = siriVoice;

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
    let isMounted = true;

    async function setupCamera() {
      try {
        const constraints = selectedCameraId
          ? { video: { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 } } }
          : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } };

        const _stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          _stream.getTracks().forEach(t => t.stop());
          return;
        }

        activeStream = _stream;
        if (videoRef.current) {
          videoRef.current.srcObject = _stream;
        }

        // Once permission is granted, list out available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);

        // Track active camera internally without triggering re-render
        const activeTrack = _stream.getVideoTracks()[0];
        const currDev = videoDevices.find(d => d.label === activeTrack.label);
        if (currDev) {
          currentCameraIdRef.current = currDev.deviceId;
        } else if (videoDevices.length > 0) {
          currentCameraIdRef.current = videoDevices[0].deviceId;
        }

      } catch (err) {
        console.error("Camera error:", err);
        addLog("System: Camera access denied or unavailable.", "error");
      }
    }
    setupCamera();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [selectedCameraId]);

  // Handle Cycle Cameras
  const cycleCamera = () => {
    if (availableCameras.length <= 1) {
      addLog("No other cameras found.", "warning");
      return;
    }
    const currentIndex = availableCameras.findIndex(d => d.deviceId === currentCameraIdRef.current);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCam = availableCameras[nextIndex];
    setSelectedCameraId(nextCam.deviceId);
    addLog(`Switched camera to: ${nextCam.label || 'Camera ' + (nextIndex + 1)}`, "info");
  };

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
        addLog(`Scout Error: ${err.message || 'Check Console'}`, "error");
      }

      setTimeout(() => { isProcessing = false; }, 2000);
    };

    intervalId = setInterval(pingScout, 2500); // Increased frequency for "Live" feel
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
                1. Provide ONLY concrete actions as the MESSAGE (e.g., "Walk straight", "Turn left", "Stop"). Do NOT provide explanations or conversational text.
                2. If the goal is NOT in the LIVE view but IS in memory:
                   - Identify a visible landmark as a waypoint.
                   - Suggest a movement action to get closer to that memory location.
                3. If the goal is NOT in memory at all:
                   - Suggest exploratory actions (e.g., "Scan the area", "Walk forward").
                4. ALWAYS return the DIRECTION (FORWARD, LEFT, RIGHT, TURN_AROUND, ARRIVED) that best helps the user move towards the goal or explore new areas.
                5. If a landmark waypoint is used, return its TARGET_LABEL and TARGET_BOX.

                YOU MUST STRICTLY USE THIS EXACT MULTI-LINE FORMAT (Do not use JSON or Markdown, and do not include thoughts):
                MESSAGE: <Concrete action command ONLY>
                DIRECTION: <FORWARD|LEFT|RIGHT|TURN_AROUND|ARRIVED|NONE>
                TARGET_LABEL: <The name of the visible landmark/waypoint or NONE>
                TARGET_BOX: <ymin,xmin,ymax,xmax values 0-1000 for the visible TARGET_LABEL or NONE>
                `
              }
            ]
          }
        ]
      });

      let fullResponseString = '';
      let spokenMessage = '';
      let sentenceBuffer = '';
      let thoughtLogged = false;

      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        fullResponseString += chunkText;

        // Extract and log THOUGHT as soon as it's available
        if (!thoughtLogged) {
          const thoughtMatch = fullResponseString.match(/THOUGHT:\s*(.*?)(?=\n[A-Z_]+:|$)/s);
          if (thoughtMatch && thoughtMatch[1].trim() !== '') {
            addLog(`Logic Trace: ${thoughtMatch[1].trim()}`, "info");
            thoughtLogged = true;
          }
        }

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
      const labelMatch = fullResponseString.match(/TARGET_LABEL:\s*(.*?)(?=\n[A-Z_]+:|$)/s);
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
      console.error("Gemini Swarm Error:", err);
      const detail = err.message || JSON.stringify(err);
      addLog(`Coordinator Error: ${detail.substring(0, 100)}...`, "error");
    }
  };

  // The toggleVoiceCommand function is removed as per the instruction.

  /**
   * ------------------------------------------------------------------
   * NEW: GEMINI MULTIMODAL LIVE API INTEGRATION
   * ------------------------------------------------------------------
   */
  const toggleLiveMode = async () => {
    if (liveMode) {
      // Shutdown Live Session
      addLog("System: Shutting down Gemini Live session...", "info");
      if (liveSessionRef.current) {
        // Handle cleanup
        liveSessionRef.current = null;
      }
      liveRecorderRef.current.stop();
      livePlayerRef.current.stop();
      clearInterval(liveVisionIntervalRef.current);
      setLiveMode(false);
      setIsListening(false);
      return;
    }

    // Start Live Session
    addLog("System: Launching Low-Latency Gemini Live Session...", "info");
    setLiveMode(true);
    setIsListening(true);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      // specific live model name from docs
      const model = 'gemini-2.0-flash-exp';

      const config = {
        responseModalities: ["audio"],
        tools: [{
          functionDeclarations: [
            {
              name: "update_direction",
              description: "Update the directional overlay on the user interface screen based on your movement command.",
              parameters: {
                type: "OBJECT",
                properties: {
                  direction: {
                    type: "STRING",
                    description: "The movement direction",
                    enum: ["FORWARD", "LEFT", "RIGHT", "TURN_AROUND", "ARRIVED", "NONE"]
                  }
                },
                required: ["direction"]
              }
            }
          ]
        }],
        systemInstruction: `You are the NaviSwarm LIVE Coordinator. 
        Your goal is to guide the user in real-time. 
        Use the spatial memory database provided below to think about where things are.
        
        INSTRUCTIONS:
        1. Speak ONLY concrete actions (e.g., "Walk straight", "Turn left"). Do NOT provide explanations, logic, or conversational filler.
        2. Once you determine the action, you MUST ALSO call the 'update_direction' tool to update the on-screen AR directional overlay.
        3. If the target is NOT VISIBLE but IS in memory: Suggest specific movement to get closer.
        4. If the target is NOT in memory at all: Suggest exploratory actions.
        
        Spatial Memory Database: ${JSON.stringify({ landmarks: memory.landmarks, hazards: memory.hazards })}`,
      };

      const session = await ai.live.connect({
        model: model,
        config: config,
      });

      liveSessionRef.current = session;

      // Handle server messages
      session.onmessage = (message) => {
        // Handle audio data
        if (message.serverContent?.modelTurn?.parts) {
          for (const part of message.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              livePlayerRef.current.playChunk(part.inlineData.data);
            } else if (part.text) {
              // Show text subtitle too
              setActiveSubtitle(part.text);
              setTimeout(() => setActiveSubtitle(''), 3000);
            } else if (part.functionCall) {
              if (part.functionCall.name === 'update_direction') {
                const args = part.functionCall.args;
                if (args && args.direction) {
                  setActiveDirection(args.direction);
                }

                // Optional: send tool response to avoid session stalling
                if (liveSessionRef.current) {
                  liveSessionRef.current.send({
                    toolResponse: {
                      functionResponses: [{
                        id: part.functionCall.id,
                        name: part.functionCall.name,
                        response: { result: "ok" }
                      }]
                    }
                  }).catch(e => { /* ignore */ });
                }
              }
            }
          }
        }

        // Handle interruptions
        if (message.serverContent?.interrupted) {
          addLog("Live: User interruption detected. Stopping playback.", "warning");
          // Clear any pending audio playback if implemented in AudioPlayer
        }
      };

      session.onerror = (e) => {
        addLog(`Live Error: ${e.message}`, "error");
        toggleLiveMode();
      };

      session.onclose = () => {
        addLog("Live: Session closed.", "info");
      };

      // Start Microphone stream
      await liveRecorderRef.current.start((base64) => {
        if (liveSessionRef.current) {
          liveSessionRef.current.sendRealtimeInput({
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        }
      });

      // Start Vision stream (Send frame every 1s)
      liveVisionIntervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame && liveSessionRef.current) {
          liveSessionRef.current.sendRealtimeInput({
            video: {
              data: frame,
              mimeType: "image/jpeg"
            }
          });
        }
      }, 1000);

      addLog("Live: Session Active. Just speak to start navigating!", "success");

    } catch (err) {
      console.error("Live Startup Error:", err);
      addLog(`Live Startup Failed: ${err.message}`, "error");
      setLiveMode(false);
      setIsListening(false);
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
          <div className="bg-black/40 backdrop-blur-2xl px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/10 shadow-lg max-w-[85%]">
            <BrainCircuit className={`w-8 h-8 ${isScouting ? 'text-[#3898ec] animate-[pulse_2s_ease-in-out_infinite]' : 'text-neutral-500'}`} />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wide text-white flex items-center gap-2 leading-none">
                {isScouting ? 'AI Guide Active' : 'AI Guide Inactive'}
                {isScouting && <div className={`w-2.5 h-2.5 rounded-full ${isMoving ? 'bg-[#3898ec] animate-pulse shadow-[0_0_10px_rgba(56,152,236,0.8)]' : 'bg-yellow-500'}`} />}
              </span>
              <span className="text-[10px] text-[#3898ec]/80 font-mono tracking-widest mt-1 uppercase leading-none">
                {isScouting ? (liveMode ? 'Live Vision Uplink Active' : 'Background Swarm Uplink: Monitoring') : 'Ready to scan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {availableCameras.length > 1 && (
              <button
                onClick={cycleCamera}
                className="pointer-events-auto p-3 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 text-white hover:bg-white/10 transition-all shadow-lg"
                title="Switch Camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}

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
        </div>

        <div className="flex-1 flex items-center justify-center relative pointer-events-none">

          {/* Subtle Central Reticle when not directing */}
          {(!activeDirection || activeDirection === 'NONE') && isScouting && (
            <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white/50 rounded-full" />
            </div>
          )}

          {/* AR Direction Overlay HUD */}
          <ARDirectionOverlay direction={activeDirection} instruction={memory.lastAnswer} />

          {/* Live Mode Indicator Overlay */}
          {liveMode && (
            <div className="absolute top-10 flex flex-col items-center gap-2 animate-pulse pointer-events-none">
              <div className="bg-[#3898ec] text-white px-6 py-2 rounded-full font-black tracking-widest text-lg shadow-[0_0_30px_rgba(56,152,236,0.6)] border border-white/20">
                LIVE CONNECTION
              </div>
              <div className="text-[#3898ec] font-mono text-sm tracking-[0.3em] uppercase">VLM VISION UPLINK ACTIVE</div>
            </div>
          )}

          {/* Gemini Live Visual Orb */}
          {(isListening || isSpeaking) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-all duration-700">
              <div className={`w-48 h-48 rounded-full blur-3xl ${isListening ? 'orb-listening' : 'orb-glow'}`} />
              <div className="absolute text-white/40 text-xs font-black tracking-widest uppercase animate-pulse">
                {isListening ? "Listening..." : "Processing..."}
              </div>
            </div>
          )}
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
                className="absolute border-2 border-[#3898ec] bg-[#3898ec]/5 shadow-[0_0_40px_rgba(56,152,236,0.4)] rounded-xl transition-all duration-700 ease-out pointer-events-none z-30 overflow-hidden"
                style={{ top, left, width, height }}
              >
                {/* Real-time Target Scanner Bar */}
                <div className="target-scanner" />

                {/* Pulsating Waypoint Ring */}
                <div className="waypoint-ring" />

                {/* Clean Target Pill */}
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-2xl border border-[#3898ec]/30 text-white text-base font-bold px-6 py-2 rounded-full flex items-center gap-3 shadow-2xl whitespace-nowrap">
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
                onClick={toggleLiveMode}
                className={`p-5 rounded-full transition-all shadow-2xl flex items-center justify-center gap-3 backdrop-blur-3xl border
                    ${liveMode ? 'bg-[#3898ec] text-white border-white/40 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_30px_rgba(56,152,236,0.6)]' :
                    'bg-black/50 border border-white/20 hover:bg-black/70 text-white'}`}
                title={liveMode ? "Gemini Live Active" : "Start Gemini Live Session"}
              >
                <Mic className="w-7 h-7" strokeWidth={liveMode ? 3 : 2} />
                {liveMode && <span className="text-xs font-black tracking-widest hidden md:block">LIVE</span>}
              </button>
            </div>

            {/* Compact Console Overlay (Under input) */}
            <div className="mt-4 flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center gap-2 px-3">
                <Activity className="w-3 h-3 text-[#3898ec] animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.2em] text-[#3898ec]/80 uppercase">Telemetry Feed</span>
              </div>
              <div className="w-full glass-panel rounded-xl border border-white/5 overflow-hidden max-h-24 pointer-events-auto shadow-2xl">
                <div className="overflow-y-auto p-2 max-h-24 custom-scrollbar">
                  <div className="space-y-1">
                    {!memory.logs || memory.logs.length === 0 ? (
                      <div className="text-[9px] text-zinc-500 font-mono italic px-2">Awaiting telemetry...</div>
                    ) : (
                      memory.logs.map((log, i) => (
                        <div key={i} className={`flex items-start gap-3 py-1 px-2 rounded-md transition-all duration-300 ${log.type === 'success' ? 'bg-green-500/5' :
                          log.type === 'warning' ? 'bg-yellow-500/5' :
                            log.type === 'error' ? 'bg-red-500/5' : 'bg-blue-500/10'
                          }`}>
                          <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${log.type === 'success' ? 'bg-green-400' :
                            log.type === 'warning' ? 'bg-yellow-400' :
                              log.type === 'error' ? 'bg-red-400' : 'bg-[#3898ec]'
                            }`} />
                          <p className="text-[9px] text-white/70 font-mono leading-tight flex-1 min-w-0 break-words">{log.msg}</p>
                          <span className="text-[7px] text-white/20 font-mono shrink-0">{log.time}</span>
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
