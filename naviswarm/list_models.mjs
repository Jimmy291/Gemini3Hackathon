import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: "AIzaSyAupyIL__n1kzspxvDJ4WyAyv-zLgdNbwQ" });

async function run() {
    const models = await ai.models.list();
    for await (const m of models) {
        if (m.name.includes("pro")) console.log(m.name);
    }
}
run();
