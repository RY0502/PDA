/**
 * @fileoverview Service for fetching Medium articles.
 * In a production environment, this file would contain the logic
 * to connect to a service like the Gmail API to read emails
 * from Medium. For this prototype, it returns mock data.
 */

// NOTE: Integrating with the Gmail API requires setting up OAuth 2.0
// credentials in the Google Cloud Console and handling the authentication
// flow to get user consent. This is a complex process that is not
// fully implemented in this prototype.
//
// To learn more, see:
// https://developers.google.com/gmail/api/quickstart/nodejs

export type MediumArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
};

// This is a mock function that simulates fetching Medium articles.
// In a real application, you would replace this with a call to the Gmail API.
export async function getMediumArticles(): Promise<MediumArticle[]> {
  console.log(
    'Fetching mock Medium articles. To implement this for real, you would need to integrate with the Gmail API here.'
  );

  // This is where you would:
  // 1. Use the googleapis library.
  // 2. Authenticate the user with OAuth 2.0.
  // 3. Use the Gmail API to search for emails from "noreply@medium.com".
  // 4. Parse the email content to extract article titles and URLs.
  // 5. Return the list of articles.

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
