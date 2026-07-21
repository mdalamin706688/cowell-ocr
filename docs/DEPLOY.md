# Deployment

## GitHub Pages (UI preview)

1. Open **Settings → Pages → Build and deployment**
2. Under **Source**, select **GitHub Actions** (not “Deploy from a branch”)
3. Do **not** use the suggested “Next.js” workflow — the repo already has `pages.yml` (“Deploy GitHub Pages”)
4. Go to **Actions** → **Deploy GitHub Pages** → **Re-run all jobs**

After success, the site is live at:
   `https://mdalamin706688.github.io/cowell-ocr/`

> **Note:** GitHub Pages is static-only. Login, OCR, and Sheets export require a server. Use the Vercel deployment below for the full app.

## Full production (Vercel — recommended)

1. Create a project at [vercel.com](https://vercel.com) linked to `mdalamin706688/cowell-ocr`
2. Add these **GitHub repository secrets** (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `AUTH_SECRET` | Random string (32+ chars) |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Web client ID (FE Google connect) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sheets service account (fallback) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEETS_FOLDER_ID` | Optional Drive folder ID |
| `VERCEL_TOKEN` | From Vercel account settings |
| `VERCEL_ORG_ID` | From Vercel project settings |
| `VERCEL_PROJECT_ID` | From Vercel project settings |

3. Push to `main` — `deploy.yml` builds and deploys the full Next.js app.

## Local development

```bash
npm install
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local
npm run dev
```
