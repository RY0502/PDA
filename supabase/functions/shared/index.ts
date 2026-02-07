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
export async function getWebsiteData(input: { url: string; prompt: string; useWatercrawl?: boolean }): Promise<WebsiteDataResult> {
  const { url, prompt, useWatercrawl = true } = input;
  let watercrawlRequestUuid: string | null = null;
  if (useWatercrawl && WATERCRAWL_API_KEY) {
    try {
      const watercrawlPostResponse = await fetch("https://app.watercrawl.dev/api/v1/core/crawl-requests/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WATERCRAWL_API_KEY
        },
        body: JSON.stringify({
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
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    high: { type: "string" },
                    low: { type: "string" }
                  },
                  required: ["name", "high", "low"]
                },
                prompt
              }
            }
          }
        })
      });
      if (watercrawlPostResponse.ok) {
        const responseData = await watercrawlPostResponse.json();
        watercrawlRequestUuid = responseData.uuid;
      }
    } catch (_error) {}
  }
  if (ANYCRAWL_API_KEY) {
    const anycrawlUrl = "https://api.anycrawl.dev/v1/scrape";
    const headers = {
      'Authorization': `Bearer ${ANYCRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    };
    const engines = ['playwright', 'puppeteer', 'cheerio'];
    for (const engine of engines) {
      try {
        const response = await fetch(anycrawlUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url,
            engine,
            formats: ['json', 'markdown'],
            json_options: {
              user_prompt: prompt,
              extract_source: 'markdown'
            }
          })
        });
        if (response.ok) {
          const result = await response.json();
          const payloadJson = result?.data?.json ?? result?.data?.output ?? null;
          const payloadMarkdown = result?.data?.markdown ?? null;
          if (payloadJson || payloadMarkdown) {
            return {
              url,
              source: 'anycrawl',
              markdown: payloadMarkdown,
              json: payloadJson
            };
          }
        }
      } catch (_error) {}
    }
  }
  if (useWatercrawl && watercrawlRequestUuid && WATERCRAWL_API_KEY) {
    try {
      const resultsUrl = `https://app.watercrawl.dev/api/v1/core/crawl-requests/${watercrawlRequestUuid}/results/`;
      const resultsResponse = await fetch(resultsUrl, {
        headers: {
          'X-API-Key': WATERCRAWL_API_KEY
        }
      });
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const resultUrl: string | undefined = resultsData.results?.[0]?.result;
        if (resultUrl) {
          const contentResponse = await fetch(resultUrl);
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const extractedJson: unknown = contentData?.json ?? contentData?.extraction ?? contentData?.output ?? null;
            if (extractedJson) {
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
    } catch (_error) {}
  }
  return {
    url,
    source: null,
    markdown: null,
    json: null
  };
}
