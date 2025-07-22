'use server';

/**
 * @fileoverview Service for fetching Medium articles from a Gmail account.
 * This service uses the Gmail API to find the latest email from Medium
 * and extracts article links from it.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// These should be stored in your .env file
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
// This refresh token needs to be obtained through a one-time OAuth2 flow.
// You can run a script locally to get this token.
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

export type MediumArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  description: string;
};

export type MediumArticleResponse = {
  articles: MediumArticle[];
  isMock: boolean;
};

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
if (REFRESH_TOKEN) {
  oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
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
  if (!REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
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
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const articleUrls = new Set<string>(); // To prevent duplicates

    let match;
    while ((match = linkRegex.exec(emailBodyHtml)) !== null) {
      const rawUrl = match[1];
      const innerHtml = match[2];

      const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/;
      const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/;

      const h2Match = innerHtml.match(h2Regex);
      const h3Match = innerHtml.match(h3Regex);

      if (h2Match && h2Match[1] && h3Match && h3Match[1]) {
        let title = h2Match[1].replace(/<[^>]+>/g, ' ').trim();
        let description = h3Match[1].replace(/<[^>]+>/g, ' ').trim();

        let url = rawUrl.replace(/&amp;/g, '&');
        if (url.startsWith('https://medium.r.axd.email/')) {
          try {
            const urlObj = new URL(url);
            const targetUrl = urlObj.searchParams.get('url');
            if (targetUrl) {
              url = decodeURIComponent(targetUrl);
            }
          } catch (e) {
            // Ignore if URL parsing fails
          }
        }
        const cleanUrl = url.split('?')[0].split('#')[0];

        // Decode HTML entities
        const decode = (str: string) =>
          str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/—/g, '—')
             .replace(/\s+/g, ' ')
            .trim();

        title = decode(title);
        description = decode(description);

        if (title && description && !articleUrls.has(cleanUrl)) {
          articles.push({
            id: `${latestMessageId}-${articles.length}`,
            title,
            description,
            url: cleanUrl,
            source,
          });
          articleUrls.add(cleanUrl);
        }
      }
    }

    if (articles.length === 0) {
      console.log('No articles found with h2 (title) and h3 (summary) tags.');
    }

    return { articles, isMock: false };
  } catch (error: any) {
    if (error.message && error.message.includes('invalid_grant')) {
      console.log(
        'Gmail API Error: The refresh token is invalid or has been revoked. ' +
          'Please generate a new one by running `npm run get-token` and update your .env file. ' +
          'You may need to revoke app access in your Google Account settings first. ' +
          'Falling back to mock data.'
      );
    } else {
      console.log('An error occurred while fetching from Gmail API:', error.message || error);
      console.log('Falling back to mock data.');
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
      description: 'An overview of the recent breakthroughs in generative AI and what they mean for the future.',
    },
    {
      id: '2',
      title: 'How to Build a Design System in 2024',
      url: 'https://medium.com/ux-design-weekly/how-to-build-a-design-system-in-2024-b0a3c20c0a9e',
      source: 'UX Design Weekly',
      description: 'A step-by-step guide to creating and maintaining a design system for your team.',
    },
    {
      id: '3',
      title: 'The Art of Clean Code',
      url: 'https://medium.com/swlh/the-art-of-clean-code-8b67548239c5',
      source: 'The Startup',
      description: 'Principles and practices for writing readable, maintainable, and robust code.',
    },
    {
      id: '4',
      title: 'Mastering React Hooks: A Deep Dive into useEffect',
      url: 'https://medium.com/javascript-in-plain-english/mastering-react-hooks-a-deep-dive-into-useeffect-3453b3424692',
      source: 'JavaScript in Plain English',
      description: 'Explore advanced patterns and common pitfalls of the useEffect hook in React.',
    },
  ];
}
