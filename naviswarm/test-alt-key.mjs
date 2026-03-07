import { GoogleGenAI } from '@google/genai';

const API_KEY = "AIzaSyAupyIL__n1kzspxvDJ4WyAyv-zLgdNbwQ"; // Key from test-gemini.mjs
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Hello world"
        });
        console.log("SUCCESS:", response.text);
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
run();
