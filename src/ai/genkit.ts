import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: 'NO_KEY' })],
  model: 'googleai/gemini-2.5-flash',
});
