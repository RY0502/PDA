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

// Helper to extract a readable title from a URL slug
function createTitleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const slug = path.substring(path.lastIndexOf('/') + 1);
    // Take the part before the hash/query params if they exist
    const cleanSlug = slug.split('?')[0].split('#')[0];
    // Remove the trailing unique ID if present
    const titleSlug = cleanSlug.substring(0, cleanSlug.lastIndexOf('-'));
    const title = titleSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
    return title.length > 10 ? title : 'Medium Article'; // Basic validation
  } catch {
    return 'Medium Article';
  }
}

export async function getMediumArticles(): Promise<MediumArticleResponse> {
  if (!REFRESH_TOKEN || !CLIENT_ID || !CLIENT_SECRET) {
    console.log('Gmail API credentials are not set in .env file. Returning mock data.');
    return { articles: getMockMediumArticles(), isMock: true };
  }

  try {
    // 1. Find the latest email from Medium
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

    // 2. Fetch the full message content
    const messageRes = await gmail.users.messages.get({
      userId: 'me',
      id: latestMessageId,
      format: 'full', // We need 'full' to get the payload and parts
    });

    const { payload } = messageRes.data;
    const subjectHeader = payload?.headers?.find((h) => h.name === 'Subject');
    const source = subjectHeader?.value || 'Medium';

    // 3. Find and decode the HTML body
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

    // 4. Extract all Medium article URLs from the HTML
    // This regex looks for URLs within href attributes to be more specific
    const urlRegex = /href="([^"]*medium\.com\/[^"]+)"/g;
    let matches;
    const urls = new Set<string>();
    while ((matches = urlRegex.exec(emailBodyHtml)) !== null) {
      urls.add(matches[1]);
    }

    // 5. Format into Article objects
    const articles: MediumArticle[] = Array.from(urls)
      .filter((url) => url.length > 40 && !url.includes('source=email')) // Filter out unsubscribe/other links
      .map((url, index) => ({
        id: `${latestMessageId}-${index}`,
        title: createTitleFromUrl(url),
        url: url,
        source: source,
      }));

    if (articles.length === 0) {
      console.log('No article links found in the latest Medium email.');
    }

    return { articles, isMock: false };
  } catch (error) {
    console.error('Error fetching from Gmail API:', error);
    console.log('Falling back to mock data.');
    return { articles: getMockMediumArticles(), isMock: true };
  }
}

// Keep mock function as a fallback for missing credentials or API errors
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
    },
    {
      id: '2',
      title: 'How to Build a Design System in 2024',
      url: 'https://medium.com/ux-design-weekly/how-to-build-a-design-system-in-2024-b0a3c20c0a9e',
      source: 'UX Design Weekly',
    },
    {
      id: '3',
      title: 'The Art of Clean Code',
      url: 'https://medium.com/swlh/the-art-of-clean-code-8b67548239c5',
      source: 'The Startup',
    },
    {
      id: '4',
      title: 'Mastering React Hooks: A Deep Dive into useEffect',
      url: 'https://medium.com/javascript-in-plain-english/mastering-react-hooks-a-deep-dive-into-useeffect-3453b3424692',
      source: 'JavaScript in Plain English',
    },
  ];
}
