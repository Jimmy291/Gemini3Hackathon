const API_KEY = "AIzaSyAl7iJv_mcARsmJtE10CpbRVrznftLWIYg";

async function run() {
    try {
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: "Hello, this is a test of the Google Cloud TTS API." },
                voice: { languageCode: "en-US", name: "en-US-Journey-F" }, // Journey voices sound amazingly natural (very Gemini-like)
                audioConfig: { audioEncoding: "MP3" }
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        console.log("Success! Audio content length:", data.audioContent.length);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
