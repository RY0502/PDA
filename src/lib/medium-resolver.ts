function firstN(input: string, n: number): string {
  if (input.length <= n) return input;
  return input.slice(0, n);
}

function extractHrefWithNoopener(html: string): string | null {
  const re = /<a[^>]*\brel=["']\s*noopener\s*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i;
  const m = html.match(re);
  if (!m) return null;
  let href = m[1] || '';
  if (!href) return null;
  href = href.replace(/`/g, '').trim();
  return href || null;
}

type WebshareProxy = {
  id?: string;
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  valid: boolean;
  country_code?: string;
  city_name?: string;
};

async function listWebshareProxies(): Promise<WebshareProxy[]> {
  const apiKey = process.env.WEBSHARE_API_KEY || process.env.WEBSHARE_TOKEN || '';
  if (!apiKey) {
    console.log('[resolver] WEBSHARE_API_KEY missing; skipping proxy list');
    return [];
  }
  try {
   // console.log('[resolver] fetching proxy list from Webshare');
    const url = 'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25';
    const r = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
      method: 'GET',
    });
    if (!r.ok) {
      console.log(`[resolver] proxy list failed status=${r.status}`);
      return [];
    }
    const j = await r.json().catch(() => null);
    const results = (j?.results ?? []) as WebshareProxy[];
    //console.log(`[resolver] proxy list count=${Array.isArray(results) ? results.length : 0}`);
    return results.filter((p) => !!p && p.valid);
  } catch {
    console.log('[resolver] proxy list error');
    return [];
  }
}

async function fetchWithProxyFallback(url: string, headers: Record<string, string>): Promise<Response | null> {
  try {
    const proxies = await listWebshareProxies();
    if (!proxies.length) {
      console.log('[resolver] no proxies available for fallback');
      return null;
    }
    // pick 2 random proxies
    const shuffled = proxies.sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(5, shuffled.length));
    const uas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    ];
    const { ProxyAgent } = await import('undici');
    for (const p of picks) {
      const proxyUrl = `http://${encodeURIComponent(p.username)}:${encodeURIComponent(p.password)}@${p.proxy_address}:${p.port}`;
      try {
        console.log(`[resolver] proxy trying id=${p.id || 'n/a'} addr=${p.proxy_address} port=${p.port}`);
        const agent = new ProxyAgent(proxyUrl);
        const ua = uas[Math.floor(Math.random() * uas.length)];
        const attemptHeaders = {
          ...headers,
          'User-Agent': ua,
          'sec-ch-ua': '"Chromium";v="120", "Not.A/Brand";v="24"',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-dest': 'document',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        };
        const r = await fetch(url, { method: 'GET', headers: attemptHeaders, dispatcher: agent as any });
        if (r.ok) {
          console.log(`[resolver] proxy succeeded id=${p.id || 'n/a'}`);
          return r;
        } else {
          console.log(`[resolver] proxy failed id=${p.id || 'n/a'} status=${r.status}`);
        }
      } catch {}
    }
  } catch {}
  return null;
}

export async function resolveMediumLink(url: string, headLimit: number, marker: string): Promise<string | null> {
  try {
    const safeUrl = url.replace(/`/g, '').trim();
    const proxied = await fetchWithProxyFallback(safeUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://medium.com/',
    });
    if (!proxied) return null;
    const r = proxied;
    const text = await r.text();
    const head = firstN(text, headLimit);
    if (!marker || !head.includes(marker)) {
      return url;
    }
    const href = extractHrefWithNoopener(head);
    if (!href) return null;
    const final = href.startsWith('/') ? `https://medium.com${href}` : href;
    return final;
  } catch {
    return null;
  }
}

export async function resolveMediumLinkDetailed(
  url: string,
  headLimit: number,
  marker: string
): Promise<{ value: string | null; memberDetected: boolean | null; statusCode: number }> {
  try {
    const safeUrl = url.replace(/`/g, '').trim();
    const proxied = await fetchWithProxyFallback(safeUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://medium.com/',
    });
    if (!proxied) {
      return { value: null, memberDetected: null, statusCode: 0 };
    }
    const r = proxied;
    const text = await r.text();
    const head = firstN(text, headLimit);
    const memberDetected = !!marker && head.includes(marker);
    if (!memberDetected) {
      return { value: url, memberDetected: false, statusCode: r.status || 200 };
    }
    const href = extractHrefWithNoopener(head);
    if (!href) return { value: null, memberDetected: true, statusCode: r.status || 200 };
    const final = href.startsWith('/') ? `https://medium.com${href}` : href;
    return { value: final, memberDetected: true, statusCode: r.status || 200 };
  } catch {
    return { value: null, memberDetected: null, statusCode: 0 };
  }
}
