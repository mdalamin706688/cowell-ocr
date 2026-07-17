# Deploy Cowell OCR (GitHub Actions → Vercel)

## 1. Vercel project

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `apps/web`.
3. Framework: **Next.js** (auto-detected).
4. Add environment variables (Production):

| Variable | Required |
|----------|----------|
| `GEMINI_API_KEY` | Yes |
| `AUTH_SECRET` | Yes (32+ random chars) |
| `ADMIN_EMAIL` | Yes |
| `ADMIN_PASSWORD` | Yes |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | For Sheets export |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | For Sheets export |
| `GOOGLE_SHEETS_FOLDER_ID` | Optional |

5. Copy from Vercel → Project Settings → General:
   - **Project ID** → `VERCEL_PROJECT_ID`
   - **Team / Personal ID** → `VERCEL_ORG_ID`
6. Create a [Vercel token](https://vercel.com/account/tokens) → `VERCEL_TOKEN`

## 2. GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|--------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel team/user ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `GEMINI_API_KEY` | Gemini API key |
| `AUTH_SECRET` | Same as Vercel |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Optional |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Optional (use `\n` for newlines) |
| `GOOGLE_SHEETS_FOLDER_ID` | Optional |

Also add the same app secrets to the **production** environment (Settings → Environments → production).

## 3. Deploy

Push to `main`. The **Deploy** workflow builds and runs `vercel --prod`.

Live URL: Vercel project domain (e.g. `cowell-ocr.vercel.app`).
