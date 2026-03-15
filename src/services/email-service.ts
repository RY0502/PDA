
'use server';

/**
 * @fileoverview Service for fetching Medium articles from a Gmail account.
 * This service uses the Gmail API to find the latest email from Medium
 * and extracts article links from it.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
} from '@/lib/constants';
import { registerKey } from '@/lib/global-cache';
// No background resolution here; scheduler /populate will process blanks

export type MediumArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  description: string;
  imageUrl?: string;
  author?: string;
};

export type MediumArticleResponse = {
  articles: MediumArticle[];
  isMock: boolean;
};

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oAuth2Client = new OAuth2Client(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  REDIRECT_URI
);
if (GMAIL_REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Helper to decode base64url encoding
function base64UrlDecode(input: string): string {
  try {
    // Replace non-url-safe chars and add padding
    input = input.replace(/-/g, '+').replace(/_/g, '/');
    while (input.length % 4) {
      input += '=';
    }
    return Buffer.from(input, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Failed to decode base64url string:', e);
    return '';
  }
}

// Helper to recursively find the HTML part of a message
function findHtmlPart(parts: any[]): any | null {
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return part;
    }
    if (part.parts) {
      const found = findHtmlPart(part.parts);
      if (found) return found;
    }
  }
  return null;
}

export async function getMediumArticles(): Promise<MediumArticleResponse> {
  if (!GMAIL_REFRESH_TOKEN || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
    console.log('Gmail API credentials are not set in .env file. Returning mock data.');
    return { articles: getMockMediumArticles(), isMock: true };
  }

  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:noreply@medium.com',
      maxResults: 1,
    });

    const messages = listRes.data.messages;
    if (!messages || messages.length === 0) {
      console.log('No Medium emails found.');
      return { articles: [], isMock: false };
    }

    const latestMessageId = messages[0].id;
    if (!latestMessageId) {
      console.log('Could not retrieve message ID.');
      return { articles: [], isMock: false };
    }

    const messageRes = await gmail.users.messages.get({
      userId: 'me',
      id: latestMessageId,
      format: 'full',
    });

    const { payload } = messageRes.data;
    const subjectHeader = payload?.headers?.find((h) => h.name === 'Subject');
    const source = subjectHeader?.value || 'Medium';

    const htmlPart = payload?.parts
      ? findHtmlPart(payload.parts)
      : payload?.body?.data
        ? payload
        : null;
    if (!htmlPart || !htmlPart.body?.data) {
      console.log('No HTML part found in the email.');
      return { articles: [], isMock: false };
    }
    const emailBodyHtml = base64UrlDecode(htmlPart.body.data);
    const articles: MediumArticle[] = [];
    const articleUrls = new Set<string>();

    const decode = (str: string) =>
      str
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/—/g, '—')
        .replace(/\s+/g, ' ')
        .trim();

    // Use a more universal approach: Find all <h2> tags as titles
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let titleMatch: RegExpExecArray | null;

    while ((titleMatch = h2Regex.exec(emailBodyHtml)) !== null) {
      const h2Start = titleMatch.index;
      const h2End = h2Regex.lastIndex;
      const rawTitle = titleMatch[1];

      // Block vicinity: look back 2000 chars for URL/Image and forward 1000 for Description
      const beforeH2 = emailBodyHtml.substring(Math.max(0, h2Start - 1500), h2Start);
      const afterH2 = emailBodyHtml.substring(h2End, h2End + 1000);

      // Article URL: The last <a href> before <h2> that hasn't been closed
      const urlRegex = /<a[^>]+href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?$/i;
      // Article Image: miro.medium.com link in the vicinity before title
      const imgRegex = /<img[^>]+src="[^"]*?(https:\/\/miro\.medium\.com\/[^"]+)"/i;
      // Description: Either <h3> or a <div> with specific styles (handles both formats)
      const descRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/i;
      const fallbackDescRegex = /<(?:div|h3)[^>]*style="[^"]*?(?:font-size:\s*14px|line-height:\s*20px|color:rgba\(117,117,117,1\))[^"]*"[^>]*>([\s\S]*?)<\/(?:div|h3)>/i;

      const urlMatch = urlRegex.exec(beforeH2);
      const imgMatch = imgRegex.exec(beforeH2);
      const descMatch = descRegex.exec(afterH2) || fallbackDescRegex.exec(afterH2);

      if (urlMatch && rawTitle) {
        let rawUrl = urlMatch[1];
        if (rawUrl.startsWith('https://medium.r.axd.email/')) {
          try {
            const urlObj = new URL(rawUrl);
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) {
              rawUrl = decodeURIComponent(targetUrl);
            }
          } catch (e) { }
        }

        const cleanUrl = rawUrl.split('?')[0].split('#')[0];
        if (articleUrls.has(cleanUrl)) continue;

        try {
          await registerKey(cleanUrl);
        } catch { }

        // Author Extraction logic: handles both linked handles and plain text names
        let author: string | undefined = undefined;
        const vicinity = beforeH2 + afterH2;

        // 1. Try finding linked author handle (Format 1)
        const authorLinkRegex = /<a[^>]+href="[^"]*?\/@([^"/?]+)(?:\?[^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi;
        let authM;
        while ((authM = authorLinkRegex.exec(vicinity)) !== null) {
          const text = decode(authM[2]);
          if (text && !authM[2].includes('<img') && !/become a member|upgrade|follow/i.test(text)) {
            author = text;
            break;
          }
        }

        // 2. Fallback: Search for author name in alt text of small profile images (Format 2)
        if (!author) {
          const authorImgRegex = /<img[^>]+alt="([^"]+)"[^>]+width="20"[^>]+height="20"/i;
          const imgM = authorImgRegex.exec(vicinity);
          if (imgM && !/member|clap|response|arrow/i.test(imgM[1])) {
            author = imgM[1];
          }

          // 3. Last fallback: Look for a span that likely contains the author name near an image
          if (!author) {
            const authorSpanRegex = /<span[^>]*style="[^"]*?rgba\(41,41,41,1\)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
            let spanM;
            while ((spanM = authorSpanRegex.exec(afterH2)) !== null) {
              const text = decode(spanM[1]);
              if (text && text.length > 2 && text.length < 50 && !/min read|member|upgrade/i.test(text)) {
                author = text;
                break;
              }
            }
          }
        }

        articles.push({
          id: `${latestMessageId}-${articles.length}`,
          title: decode(rawTitle),
          description: descMatch ? decode(descMatch[1]) : '',
          url: cleanUrl,
          source,
          imageUrl: imgMatch ? imgMatch[1] : undefined,
          author
        });
        articleUrls.add(cleanUrl);
      }
    }


    if (articles.length === 0) {
      console.log('No articles found matching the pattern.');
    }

    return { articles: articles.reverse(), isMock: false };
  } catch (error: any) {
    if (error.message && error.message.includes('invalid_grant')) {
      console.error(
        'Gmail API Error: The refresh token is invalid or has been revoked. ' +
        'Please generate a new one by running `npm run get-token` and update your .env file. ' +
        'You may need to revoke app access in your Google Account settings first. ' +
        'Falling back to mock data.'
      );
    } else {
      console.error(
        'An error occurred while fetching from Gmail API:',
        error.message || error
      );
    }
    return { articles: getMockMediumArticles(), isMock: true };
  }
}

function getMockMediumArticles(): MediumArticle[] {
  console.log(
    'Using mock Medium articles. To use the Gmail API, set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN in your .env file.'
  );
  return [
    {
      id: '1',
      title: 'The Generative AI Revolution Is Just Getting Started',
      url: 'https://medium.com/towards-data-science/the-generative-ai-revolution-is-just-getting-started-b16f2434411def',
      source: 'Towards Data Science',
      description:
        'An overview of the recent breakthroughs in generative AI and what they mean for the future.',
      imageUrl: 'https://placehold.co/600x400.png',
      author: 'John Doe',
    },
    {
      id: '2',
      title: 'How to Build a Design System in 2024',
      url: 'https://medium.com/ux-design-weekly/how-to-build-a-design-system-in-2024-b0a3c20c0a9e',
      source: 'UX Design Weekly',
      description:
        'A step-by-step guide to creating and maintaining a design system for your team.',
      imageUrl: 'https://placehold.co/600x400.png',
      author: 'Jane Smith',
    },
    {
      id: '3',
      title: 'The Art of Clean Code',
      url: 'https://medium.com/swlh/the-art-of-clean-code-8b67548239c5',
      source: 'The Startup',
      description:
        'Principles and practices for writing readable, maintainable, and robust code.',
      imageUrl: 'https://placehold.co/600x400.png',
      author: 'Al Coder',
    },
    {
      id: '4',
      title: 'Mastering React Hooks: A Deep Dive into useEffect',
      url: 'https://medium.com/javascript-in-plain-english/mastering-react-hooks-a-deep-dive-into-useeffect-3453b3424692',
      source: 'JavaScript in Plain English',
      description:
        'Explore advanced patterns and common pitfalls of the useEffect hook in React.',
      imageUrl: 'https://placehold.co/600x400.png',
      author: 'React Dev',
    },
  ];
}
