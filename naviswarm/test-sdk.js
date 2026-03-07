import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI('test');
console.log('Live property exists:', !!ai.live);
console.log('Available properties:', Object.keys(ai));
