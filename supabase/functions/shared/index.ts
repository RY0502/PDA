import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const ANYCRAWL_API_KEY = Deno.env.get('ANYCRAWL_API_KEY');
const WATERCRAWL_API_KEY = Deno.env.get('WATERCRAWL_API_KEY');
export type WebsiteDataResult = {
  url: string;
  source: 'anycrawl' | 'watercrawl' | null;
  markdown: string | null;
  json: unknown | null;
  watercrawl?: {
    uuid: string;
    resultUrl: string;
  };
};

serve(async (req) => {
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
    const watercrawlSchema = body?.watercrawlSchema;
    const useWatercrawl = body?.useWatercrawl !== false;
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (useWatercrawl && (!prompt || !watercrawlSchema)) {
      return new Response(JSON.stringify({ error: 'Missing prompt or watercrawlSchema' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const result = await getWebsiteData({ url, prompt, useWatercrawl, watercrawlSchema });
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

 async function getWebsiteData(input: { url: string; prompt?: string; useWatercrawl?: boolean; watercrawlSchema?: unknown }): Promise<WebsiteDataResult> {
  const { url, prompt, useWatercrawl = true, watercrawlSchema } = input;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  if (useWatercrawl) {
    if (!WATERCRAWL_API_KEY) {
      throw new Error('Watercrawl is selected but API key is missing');
    }
    if (!prompt || !watercrawlSchema) {
      throw new Error('Watercrawl requires prompt and watercrawlSchema');
    }
    console.log(`[shared] Hitting Watercrawl for ${url}`);
    let watercrawlRequestUuid: string | null = null;
    const postBody = {
      url,
      options: {
        spider_options: {
          max_depth: 1,
          page_limit: 1
        },
        page_options: {
          wait_time: 1000,
          only_main_content: true,
          timeout: 15000
        },
        plugin_options: {
          openai_extract: {
            is_active: true,
            llm_model: "gpt-4o",
            extractor_schema: {
              ...(watercrawlSchema as Record<string, unknown>)
            },
            prompt
          }
        }
      }
    };
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': WATERCRAWL_API_KEY
    };
    try {
      const watercrawlPostResponse = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers,
        body: JSON.stringify(postBody)
      });
      if (!watercrawlPostResponse.ok) {
        throw new Error(`Watercrawl init failed with status ${watercrawlPostResponse.status}`);
      }
      const responseData = await watercrawlPostResponse.json();
      watercrawlRequestUuid = responseData.uuid;
      if (!watercrawlRequestUuid) {
        throw new Error('Watercrawl request did not return uuid');
      }
      console.log(`[shared] Watercrawl request initiated: ${watercrawlRequestUuid}`);
    } catch (_error) {
      console.log(`[shared] Watercrawl init network error; retrying after 5s`);
      await sleep(5000);
      const retryResp = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers,
        body: JSON.stringify(postBody)
      });
      if (!retryResp.ok) {
        throw new Error(`Watercrawl init failed after retry with status ${retryResp.status}`);
      }
      const retryData = await retryResp.json();
      watercrawlRequestUuid = retryData.uuid;
      if (!watercrawlRequestUuid) {
        throw new Error('Watercrawl request did not return uuid after retry');
      }
      console.log(`[shared] Watercrawl request initiated: ${watercrawlRequestUuid}`);
    }
    const resultsUrl = `https://app.watercrawl.dev/api/v1/core/crawl-requests/${watercrawlRequestUuid}/results/`;
    const checkpoints = [15000, 30000, 60000];
    for (const waitMs of checkpoints) {
      console.log(`[shared] Waiting ${waitMs}ms before checking Watercrawl results for ${watercrawlRequestUuid}`);
      await sleep(waitMs);
      let resultsResponse: Response | null = null;
      try {
        resultsResponse = await fetch(resultsUrl, { headers });
      } catch (_err) {
        console.log(`[shared] Watercrawl results network error; retrying after 5s`);
        await sleep(5000);
        resultsResponse = await fetch(resultsUrl, { headers });
      }
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultUrl: string | undefined = resultsData.results?.[0]?.result;
        if (resultUrl) {
          console.log(`[shared] Fetching Watercrawl result content from ${resultUrl}`);
          let contentResponse: Response | null = null;
          try {
            contentResponse = await fetch(resultUrl);
          } catch (_err) {
            console.log(`[shared] Watercrawl content network error; retrying after 5s`);
            await sleep(5000);
            contentResponse = await fetch(resultUrl);
          }
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const extractedJson: unknown = contentData?.json ?? contentData?.extraction ?? contentData?.output ?? null;
            if (extractedJson) {
              console.log(`[shared] Watercrawl returned JSON; returning`);
              return {
                url,
                source: 'watercrawl',
                markdown: null,
                json: extractedJson,
                watercrawl: {
                  uuid: watercrawlRequestUuid,
                  resultUrl
                }
              };
            }
          }
        }
      }
    }
    throw new Error('Watercrawl timed out after 60s without available results');
  } else {
    if (!ANYCRAWL_API_KEY) {
      throw new Error('AnyCrawl is selected but API key is missing');
    }
    const anycrawlUrl = "https://api.anycrawl.dev/v1/scrape";
    const headers = {
      'Authorization': `Bearer ${ANYCRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const engines = ['playwright', 'puppeteer', 'cheerio'];
    for (const engine of engines) {
      try {
        console.log(`[shared] Hitting AnyCrawl (${engine}) for ${url}`);
        const requestBody = {
          url,
          engine,
          formats: ['markdown', 'json'],
          proxy: 'auto',
          wait_for: 5000,
          ...(prompt
            ? {
                json_options: {
                  user_prompt: prompt,
                  extract_source: 'markdown'
                }
              }
            : {})
        };
        console.log(`[shared] AnyCrawl request (${engine})`, JSON.stringify({
          method: 'POST',
          url: anycrawlUrl,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'REDACTED' },
          body: requestBody
        }));
        const response = await fetch(anycrawlUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
        if (response.ok) {
          const result = await response.json();
          const payloadJson = result?.data?.json ?? result?.data?.output ?? null;
          const payloadMarkdown = result?.data?.markdown ?? null;
          if (payloadJson || payloadMarkdown) {
            console.log(`[shared] AnyCrawl (${engine}) returned data; returning`);
            return {
              url,
              source: 'anycrawl',
              markdown: payloadMarkdown,
              json: payloadJson
            };
          }
        } else {
          const text = await response.text().catch(() => '');
          console.log(`[shared] AnyCrawl (${engine}) non-OK status=${response.status} body=${text}`);
        }
      } catch (_error) {}
    }
    throw new Error('AnyCrawl did not return data');
  }
}
