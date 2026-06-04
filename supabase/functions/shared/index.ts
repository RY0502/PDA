import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const EXTRACTOR_ENDPOINT = Deno.env.get('EXTRACTOR_ENDPOINT') ?? 'https://scrape-agent.onrender.com/extract';
export type WebsiteDataResult = {
  url: string;
  source: 'extractor' | null;
  markdown: string | null;
  json: unknown | null;
};

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    let body: any = null;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const url = String(body?.url || '');
    const prompt = body?.prompt != null ? String(body.prompt) : undefined;
    const jsonOptions = typeof body?.json_options === 'object' ? body.json_options : undefined;

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await getExtractorData({ url, prompt, jsonOptions });
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function getExtractorData(input: {
  url: string;
  prompt: string;
  jsonOptions?: Record<string, unknown>;
}): Promise<WebsiteDataResult> {
  const { url, prompt, jsonOptions } = input;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log(`[shared] Waiting 15000ms before extractor retry ${attempt} for ${url}`);
      await sleep(15000);
    }

    try {
      const response = await fetch(EXTRACTOR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          prompt,
          ...(jsonOptions ? { json_options: jsonOptions } : {})
        })
      });

      if (response.status !== 200) {
        const bodyText = await response.text().catch(() => '');
        const errorMessage = `Extractor responded ${response.status}${bodyText ? `: ${bodyText}` : ''}`;
        console.log(`[shared] Extractor attempt ${attempt} failed: ${errorMessage}`);
        lastError = new Error(errorMessage);
        continue;
      }

      const text = await response.text();
      let payload: unknown = text;
      try {
        payload = JSON.parse(text);
      } catch {
        // keep raw text if not JSON
      }

      if (payload == null) {
        lastError = new Error('Extractor returned empty payload');
        continue;
      }

      return {
        url,
        source: 'extractor',
        markdown: null,
        json: payload
      };
    } catch (error) {
      lastError = error as Error;
      console.log(`[shared] Extractor attempt ${attempt} network error: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error('Extractor failed after retries');
}
