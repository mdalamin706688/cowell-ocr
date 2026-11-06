# Cognito custom email (reduce spam)

Verification codes are sent by **Amazon Cognito**, not the Next.js app.  
Default Cognito mail (`COGNITO_DEFAULT`) often lands in **spam**, especially on corporate inboxes.

## Fix (production)

### 1. Amazon SES (Tokyo `ap-northeast-1`)

1. SES → **Verified identities** → verify **`cowell.co.jp`** (or a subdomain like `mail.cowell.co.jp`).
2. Add DNS records SES gives you: **DKIM** (required), **SPF** (recommended), **DMARC** (recommended).
3. Request **production access** if the account is still in SES sandbox (sandbox can only send to verified addresses).

### 2. Cognito User Pool email

User pool → **Messaging** → **Email**:

| Setting | Value |
|--------|--------|
| Email provider | **Send email with Amazon SES** |
| FROM email | e.g. `noreply@mail.cowell.co.jp` (must be verified in SES) |
| FROM sender name | `COWELL OCR` |
| REPLY-TO | support address (optional) |

Save. New forgot-password codes use SES + your domain (much better inbox placement).

### 3. Custom message Lambda (optional, recommended)

Branded Japanese subject/body improves trust and reduces spam scoring.

1. Create Lambda from `handler.mjs` (Node.js 20, handler `handler.handler`).
2. Env vars (optional): `APP_NAME=COWELL OCR`, `SUPPORT_EMAIL=support@cowell.co.jp`
3. User pool → **Extensions** → **Triggers** → **Custom message** → attach this Lambda.
4. Grant Cognito permission to invoke the Lambda (console adds resource policy when you save the trigger).

### 4. App behaviour (already in FE)

| Flow | Email |
|------|--------|
| Forgot password | Cognito `ForgotPassword` → code email |
| Add user (admin) | `MessageAction: SUPPRESS` — **no email**; admin copies temp password in UI |

To email invites on user create, remove `SUPPRESS` in `createCognitoUser` **after** SES is configured.

## Verify

1. Reset password for a test user.
2. Check headers: mail should come from your SES domain, not generic Cognito default.
3. Use [mail-tester.com](https://www.mail-tester.com) once with a test address if needed.

## DNS checklist (IT)

- SPF includes Amazon SES for your sending domain
- DKIM CNAMEs from SES (3 records)
- DMARC policy e.g. `v=DMARC1; p=none; rua=mailto:...` (start with `none`, tighten later)
