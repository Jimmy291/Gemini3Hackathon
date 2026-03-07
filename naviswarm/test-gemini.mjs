import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: "AIzaSyAupyIL__n1kzspxvDJ4WyAyv-zLgdNbwQ" });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: "Hello world"
    });
    console.log("SUCCESS:", response.text);
  } catch (e) {
    console.error("ERROR 1:", e.message);
    try {
      const response2 = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: "Hello world"
      });
      console.log("Fallback SUCCESS:", response2.text);
    } catch (e2) {
      console.error("ERROR 2:", e2.message);
    }
  }
}
run();
