import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { GEMINI_API_KEY } from '@/lib/constants';

export const ai = genkit({
  plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  model: 'googleai/gemini-2.5-flash',
});
