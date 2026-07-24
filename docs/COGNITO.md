# AWS Cognito (frontend email/password login)

## What FE needs

| Env | Example |
|-----|---------|
| `NEXT_PUBLIC_COGNITO_REGION` | `ap-south-1` (Mumbai — matches BE/dev server) |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `ap-south-1_xxxxx` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | app client id (public, no secret) |

Current Mumbai pool (FE):

- Region: `ap-south-1`
- User Pool ID: `ap-south-1_eahdXMkcm`
- App Client ID: `6v1fhhjdpv74n9skijfs41lfqm`

## App client setting (required)

User pool → App integration → App client → **Edit** → Authentication flows:

- Enable **`ALLOW_USER_PASSWORD_AUTH`**
- Keep **`ALLOW_REFRESH_TOKEN_AUTH`**

Without `USER_PASSWORD_AUTH`, the custom login form cannot sign in.

## GitHub Actions (CloudFront deploy)

Add repository secrets:

- `NEXT_PUBLIC_COGNITO_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`

## Behaviour

- If Cognito env is set → real email/password login (CloudFront included)
- If Cognito env is empty on static preview → demo login fallback
- Tokens stored in `localStorage`; session cookie kept for routing
- `getCognitoAccessToken()` ready for backend API calls later

## Create a test user

Cognito → Users → Create user → email + temporary password.  
First login may ask to set a new password (handled in the login UI).
