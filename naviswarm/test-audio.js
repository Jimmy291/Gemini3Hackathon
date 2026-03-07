import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
    apiKey: "AIzaSyAl7iJv_mcARsmJtE10CpbRVrznftLWIYg",
    httpOptions: { apiVersion: 'v1alpha' }
});

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [{ role: 'user', parts: [{ text: 'Speak to me.' }] }],
            config: {
                responseModalities: ["AUDIO"],
            }
        });

        console.log("Success with v1alpha!");
        // console.log(response.candidates[0].content.parts);
    } catch (err) {
        console.error("Error with v1alpha:", err.message);
    }
}
run();
