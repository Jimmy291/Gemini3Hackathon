import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: "AIzaSyAupyIL__n1kzspxvDJ4WyAyv-zLgdNbwQ" });

async function run() {
    try {
        const models = await ai.models.list();
        for await (const m of models) {
            console.log(m.name);
        }
    } catch (e) {
        console.error("COULD NOT LIST MODELS:", e.message);
    }
}
run();
