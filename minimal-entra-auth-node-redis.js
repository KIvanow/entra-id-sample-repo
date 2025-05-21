const { DEFAULT_TOKEN_MANAGER_CONFIG, EntraIdCredentialsProviderFactory } = require('@redis/entraid/dist/lib/entra-id-credentials-provider-factory')
const express = require('express')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Check for required environment variables
if (!process.env.MSAL_CLIENT_ID || !process.env.MSAL_TENANT_ID) {
  throw new Error('MSAL_CLIENT_ID and MSAL_TENANT_ID environment variables must be set')
}

const app = express()

let pkceCodes;

// Initialize MSAL provider with authorization code PKCE flow
const {
  getPKCECodes,
  createCredentialsProvider,
  getAuthCodeUrl
} = EntraIdCredentialsProviderFactory.createForAuthorizationCodeWithPKCE({
  clientId: process.env.MSAL_CLIENT_ID,
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback',
  // authorityConfig: { type: 'multi-tenant', tenantId: process.env.MSAL_TENANT_ID },
  authorityConfig: { type: 'custom', authorityUrl: process.env.MSAL_AUTHORITY },
  tokenManagerConfig: DEFAULT_TOKEN_MANAGER_CONFIG,
  scopes: [
    'offline_access',
    'openid',
    'email',
    'profile',
    'https://management.azure.com/user_impersonation',
    'https://redis.azure.com'
  ]
})
app.get('/auth/login', async (req, res) => {
  try {
    pkceCodes = await getPKCECodes()

    const authUrl = await getAuthCodeUrl({
      challenge: pkceCodes.challenge,
      challengeMethod: pkceCodes.challengeMethod
    })

    res.redirect(authUrl)
  } catch (error) {
    console.error('Login flow failed:', error)
    res.status(500).send('Authentication failed')
  }
})
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, error, client_info, error_description } = req.query
    console.log('req.query', req.query)

    if (error) {
      console.error('OAuth error:', error, error_description)
      return res.status(400).send(`OAuth error: ${error_description || error}`)
    }

    if (!code) {
      console.error('Missing authorization code. Query parameters:', req.query)
      return res.status(400).send('Authorization code not found in request')
    }

    const entraidCredentialsProvider = createCredentialsProvider(
      {
        code,
        verifier: pkceCodes.verifier,
        clientInfo: client_info
      },
    );

    const initialCredentials = entraidCredentialsProvider.subscribe({
      onNext: (token) => {
        console.log('Token acquired successfully', token)
      },
      onError: (tokenError) => {
        console.error('Token acquisition failed:', tokenError)
      }
    })

    const [credentials] = await initialCredentials

    res.send(`
      <h1>Authentication Successful!</h1>
      <p>Token acquired successfully!</p>
      <pre>${JSON.stringify({
        userId: credentials?.username,
        token: credentials?.password,
      }, null, 2)}</pre>
      <p><a href="/auth/login">Try Again</a></p>
    `)

    return credentials
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
  console.log('- MSAL_TENANT_ID: Your Entra ID tenant ID')
  console.log('- REDIRECT_URI (optional): Redirect URI (defaults to http://localhost:3000/auth/callback)')
  console.log('='.repeat(50))
})