# Minimal Entra ID Authentication Example

This is a minimal example of implementing Entra ID (formerly Azure AD) authentication with PKCE (Proof Key for Code Exchange) flow.

## Features

- Simple Express server with two main endpoints:
  - `/auth/login`: Redirects to Microsoft Entra ID login page
  - `/auth/callback`: Handles the redirect after successful authentication
- Uses PKCE (Proof Key for Code Exchange) flow for enhanced security
- Pure implementation using standard libraries

## Prerequisites

- Node.js 14 or higher
- An Entra ID (Azure AD) application with a configured redirect URI
- The following environment variables:
  - `ENTRAID_CLIENT_ID`: Your Entra ID application's client ID
  - `ENTRAID_AUTHORITY` (optional): Authority URL (default: 'https://login.microsoftonline.com/common')
  - `ENTRAID_REDIRECT_URI` (optional): Redirect URI (default: 'http://localhost:3000/auth/callback')

## Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   export ENTRAID_CLIENT_ID="your-client-id-here"
   export ENTRAID_AUTHORITY="https://login.microsoftonline.com/your-tenant-id"
   ```

3. Run the application:
   ```bash
   npm start
   ```

The server will start at http://localhost:3000. Visit this URL in a browser and click the "Sign in" link to begin the authentication flow.

## Creating an Entra ID App Registration

1. Go to the Azure Portal and navigate to "Azure Active Directory" > "App registrations"
2. Click "New registration"
3. Enter a name for your application
4. Under "Supported account types", select the appropriate option for your needs
5. Add a Redirect URI of type "Web" with the value "http://localhost:3000/auth/callback"
6. Click "Register"
7. Once created, copy the "Application (client) ID" from the overview page
8. Use this value as your ENTRAID_CLIENT_ID

## How It Works

1. When you click "Sign in", the application generates PKCE codes (challenge and verifier).
2. The application redirects you to the Microsoft login page with the PKCE challenge.
3. After successfully signing in, Microsoft redirects back to the callback URL with an authorization code.
4. The application uses this code along with the PKCE verifier to obtain access tokens.
5. The tokens are used to extract the user information, which is displayed on the success page.

## Technical Details

This implementation uses:
- `@azure/msal-node` - Microsoft Authentication Library for Node.js
- PKCE flow for secure authorization code exchange
- Stateless token handling with in-memory storage of PKCE codes

## Security Considerations

- This example uses simple in-memory storage for authentication requests. In a production environment, use a more secure and persistent storage solution.
- Always validate the state parameter in the callback to prevent CSRF attacks.
- Consider adding additional security measures like rate limiting and HTTPS for production use.

## Libraries Used

- `@azure/msal-node`: Microsoft Authentication Library for Node.js
- `base64url`: URL-safe base64 encoding/decoding
- `express`: Web server framework