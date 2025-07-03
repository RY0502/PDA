import { config } from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import * as readline from 'readline';

// Load environment variables from .env file
config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
// This must match one of the "Authorized redirect URIs" in your Google Cloud Console project.
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in your .env file.'
  );
  console.log('Please follow the instructions in the Google Cloud Console to create OAuth 2.0 credentials.');
  process.exit(1);
}

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' is required to get a refresh token
    scope: SCOPES,
  });

  console.log('Authorize this app by visiting this URL:');
  console.log(authUrl);
  console.log('\nAfter authorization, you will be redirected to a URL.');
  console.log('Copy the `code` parameter from that URL and paste it here.');

  rl.question('Enter the code from the redirect URL: ', async (code) => {
    rl.close();
    if (!code) {
        console.error('No code provided. Exiting.');
        return;
    }

    try {
      const { tokens } = await oAuth2Client.getToken(code);
      console.log('\nTokens received:');
      console.log(tokens);

      if (tokens.refresh_token) {
        console.log('\n✅ Successfully obtained refresh token!');
        console.log('Copy this refresh token and add it to your .env file as GMAIL_REFRESH_TOKEN:');
        console.log(`\nGMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      } else {
        console.warn(
          '\n⚠️ A refresh token was not returned. This can happen if you have already authorized this application.'
        );
        console.log('To get a new refresh token, you may need to revoke access for this app in your Google Account settings:');
        console.log('https://myaccount.google.com/permissions');
      }
    } catch (err: any) {
      console.error('\nError retrieving access token', err.response?.data || err.message);
    }
  });
}

main().catch(console.error);
