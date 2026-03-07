# NaviSwarm - Semantic Spatial Intelligence System

NaviSwarm is an AI-powered indoor navigation and spatial intelligence assistant. It uses the `gemini-2.5-flash` multimodal model to autonomously scan and map your visible environment (landmarks, hazards) through your device's camera, and provides natural-language guidance and AR overlays to help you navigate indoor spaces and find objects.

## Prerequisites
- Node.js (v20.19+ or v22.12+)
- A valid **Gemini API Key** from Google AI Studio.

## 1. Setup & Installation

1. Install all dependencies:
   ```bash
   npm install
   ```

2. Open `src/App.jsx` and configure your API Key.
   Locate the `API_KEY` constant at the top of the file and insert your development key:
   ```javascript
   const API_KEY = "AIzaSy...";
   ```

## 2. Running the App Locally (Laptop)

To start the Vite development server:
```bash
npm run dev
```
Open your browser and navigate to `https://localhost:5173`. 
*Note: Your browser will display a "Your connection is not private" warning because the local HTTPS certificate is self-signed. Click **Advanced** -> **Proceed to localhost (unsafe)**.*

## 3. Testing on a Mobile Device (Using Phone Camera)

Modern mobile browsers strictly block access to the camera hardware unless the connection is secure (`https://`). This project uses the `@vitejs/plugin-basic-ssl` plugin to automatically generate this secure connection on your local network.

To use the app on your phone:
1. Ensure your laptop and phone are connected to the **same Wi-Fi network**.
2. Run the dev server on your laptop:
   ```bash
   npm run dev
   ```
3. Look at your terminal output for the **Network** URL. It will look like this: `https://192.168.x.x:5173/` or `https://10.x.x.x:5173/`.
4. Open your phone's browser (Safari/Chrome) and enter that exact URL.
5. Bypass the browser security warning (Advance -> Proceed).
6. Give the browser permission to access your camera and microphone.

*(Troubleshooting: If the link on your phone spins forever and fails to load, your Windows Firewall is blocking inbound connections to port `5173`. Open an Administrator PowerShell and run: `New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow`)*

## Features
- **Scout Agent**: Periodically pings the environment mapping landmarks and identifying hazards.
- **Voice Commands**: Press the microphone button to dictate where you want to go.
- **Cinematic Feedback**: Synced subtitles and natural text-to-speech audio guidance.
- **AR Overlays**: Dynamic visual indicators instructing you when to turn, go forward, or turn around.
