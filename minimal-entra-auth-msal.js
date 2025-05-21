const express = require('express')
const dotenv = require('dotenv')
const { PublicClientApplication, LogLevel } = require('@azure/msal-node')
const crypto = require('crypto')
const base64url = require('base64url')

// Load environment variables
dotenv.config()

// Check for required environment variables
if (!process.env.MSAL_CLIENT_ID) {
  throw new Error('MSAL_CLIENT_ID environment variable must be set')
}

const app = express()

let pkceCodes

const msalConfig = {
  auth: {
    clientId: process.env.MSAL_CLIENT_ID,
    authority: process.env.MSAL_AUTHORITY || `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID || 'common'}`
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
}

const msalClient = new PublicClientApplication(msalConfig)

/*
These are the scopes that we'd normally need. redis.azure.com/.default can not be used with the specific scopes.

redis.azure.com returns the following error:
AADSTS70011: The provided request must include a 'scope' input parameter. The provided value for the input parameter 'scope' is not valid. The scope offline_access openid email profile https://management.azure.com/user_impersonation https://redis.azure.com/ is not valid. The scope format is invalid. Scope must be in a valid URI form <https://example/scope> or a valid Guid <guid/scope>.

if we skip all scopes and use only redis.azure.com/.default, we get the following error:
OAuth error: AADSTS650057: Invalid resource. The client has requested access to a resource which is not listed in the requested permissions in the client's application registration. Client app ID: 946433ce-f709-4a25-86a4-861fb13f344a(TEST-RedisInsight). Resource value from request: https://redis.azure.com. Resource app ID: acca5fbb-b7e4-4009-81f1-37e38fd66d78. List of valid resources from app registration: 00000003-0000-0000-c000-000000000000. Trace ID: 17cfa6f1-afcc-404b-a1ba-4f69362c2c00 Correlation ID: bfdb1d4b-9264-4b99-83ff-54d8676f219d Timestamp: 2025-05-21 15:06:22Z
*/
const scopes = [
  'offline_access',
  'openid',
  'email',
  'profile',
  'https://management.azure.com/user_impersonation',
//   'https://redis.azure.com/'
]


async function generatePKCECodes() {
  const verifier = base64url.encode(crypto.randomBytes(32))

  const challenge = base64url.encode(
    crypto.createHash('sha256').update(verifier).digest()
  )

  return {
    verifier,
    challenge,
    challengeMethod: 'S256'
  }
}

app.get('/auth/login', async (req, res) => {
  try {
    pkceCodes = await generatePKCECodes()

    const authUrlParams = {
      scopes,
      redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback',
      codeChallenge: pkceCodes.challenge,
      codeChallengeMethod: pkceCodes.challengeMethod,
      responseMode: 'query',
      prompt: 'select_account'
    }

    const authUrl = await msalClient.getAuthCodeUrl(authUrlParams)

    res.redirect(authUrl)
  } catch (error) {
    console.error('Login flow failed:', error)
    res.status(500).send('Authentication failed')
  }
})

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, error, error_description: errorDescription } = req.query
    console.log('req.query', req.query)

    if (error) {
      console.error('OAuth error:', error, errorDescription)
      return res.status(400).send(`OAuth error: ${errorDescription || error}`)
    }

    if (!code) {
      console.error('Missing authorization code. Query parameters:', req.query)
      return res.status(400).send('Authorization code not found in request')
    }

    const tokenRequest = {
      code,
      scopes,
      redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback',
      codeVerifier: pkceCodes.verifier
    }

    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest)
    console.log('Token acquired successfully')

    const username = tokenResponse.account?.username || 'unknown'

    res.send(`
      <h1>Authentication Successful!</h1>
      <p>Token acquired successfully!</p>
      <pre>${JSON.stringify({
    userId: username,
    token: tokenResponse.accessToken ? `${tokenResponse.accessToken.substring(0, 10)}...` : 'N/A'
  }, null, 2)}</pre>
      <p><a href="/auth/login">Try Again</a></p>
    `)

    return tokenResponse
  } catch (error) {
    console.error('Token acquisition failed:', error)
    res.status(500).send('Failed to acquire token')
    return null
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Home URL: http://localhost:${PORT}/`)
  console.log(`Login URL: http://localhost:${PORT}/auth/login`)
  console.log('='.repeat(50))
  console.log('ENVIRONMENT VARIABLES NEEDED:')
  console.log('- MSAL_CLIENT_ID: Your Entra ID application client ID')
  console.log('- MSAL_TENANT_ID (optional): Your Entra ID tenant ID')
  console.log('- MSAL_AUTHORITY (optional): Override authority URL')
  console.log('- REDIRECT_URI (optional): Redirect URI (defaults to http://localhost:3000/auth/callback)')
  console.log('='.repeat(50))
})