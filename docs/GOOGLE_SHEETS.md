# Google Sheets export (service account)

Cowell OCR exports reviewed OCR rows to a new Google Spreadsheet under a **fixed
Drive root folder**. Users never sign in to Google — they only enter a project
name; the server does the rest with a service account.

## How it works

1. Review OCR rows and enter a project name (案件名)
2. Click **スプレッドシートに登録**
3. The server (`POST /api/sheets/export`) authenticates with the service
   account and writes into the fixed root:

   ```
   <fixed root folder>/            ← GOOGLE_SHEETS_FOLDER_ID
     └── <案件名>/                  ← one folder per survey (project name)
           ├── 元ファイル/          ← uploaded source images/PDFs
           ├── 画像/               ← one photo per row
           └── <案件名>_yyyymmdd    ← the result spreadsheet
   ```

4. Open the created folder from the success screen

The root folder is fixed — users cannot pick or create it. Project names must
be unique inside it; the form checks live (`GET /api/sheets/root`) and the
export re-checks server-side before creating the folder.

## Setup

1. Create a **service account** + JSON key in Google Cloud Console
2. Enable **Google Sheets API** and **Google Drive API**
3. Create the root folder in Drive (e.g. `JBC-COWELL`) and **share it with the
   service account email as Editor**
4. Set env:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_FOLDER_ID=folder_id_from_drive_url
```

If `GOOGLE_SHEETS_FOLDER_ID` is unset, the app finds or creates a folder named
`JBC-COWELL` **in the service account's own Drive** — that folder is not
visible to your users, so set the env in production.

`NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID` may also be set as a fallback for the
root id (e.g. when only build-time env is available).

Restart `npm run dev` after changing env.

## Hosting requirement

`/api/sheets/*` needs a running Next.js server (local dev, Vercel, Amplify,
ECS, …). On static hosts (S3 + CloudFront, GitHub Pages) there is no `/api/*`
— deploy the bundled **sheets-export Lambda** instead and set
`NEXT_PUBLIC_SHEETS_API_BASE_URL` on the frontend:

```bash
cd apps/web
npm run build:sheets-lambda          # → dist/sheets-export/index.mjs
cd dist/sheets-export && zip function.zip index.mjs

aws lambda create-function \
  --function-name cowell-sheets-export \
  --runtime nodejs20.x --handler index.handler \
  --zip-file fileb://function.zip \
  --role <lambda-exec-role-arn> \
  --timeout 300 --memory-size 512

aws lambda create-function-url-config \
  --function-name cowell-sheets-export --auth-type NONE
# Do NOT configure Function URL CORS — the handler sets CORS headers itself.
```

Lambda env vars:

| Var | Notes |
|-----|-------|
| `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET` / `GOOGLE_DRIVE_REFRESH_TOKEN` | Preferred — exports as the folder owner (real quota) |
| `GOOGLE_SERVICE_ACCOUNT_*` / `GOOGLE_SERVICE_ACCOUNT_JSON` | Fallback — only works with a Shared Drive root |
| `GOOGLE_SHEETS_FOLDER_ID` | Fixed root folder id |
| `GOOGLE_DRIVE_SHARE_WITH` | Optional emails granted writer on the root |
| `COGNITO_REGION` / `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | Enables Cognito JWT verification (recommended) |
| `ALLOWED_ORIGINS` | e.g. `https://d1xs8fe440jh05.cloudfront.net` |

Endpoints: `GET /root` (fixed root + children for the duplicate check),
`POST /export` (rows + projectName + sourceFiles). Function URL payloads are
capped ~6 MB — large source PDFs may exceed it; then export with photos only.

Then add the GitHub secret `NEXT_PUBLIC_SHEETS_API_BASE_URL=<function url>`
and redeploy the frontend.

## Local check

| Check | How |
|-------|-----|
| Status API | `GET /api/sheets/export` → `{ serviceAccountConfigured, folderConfigured }` |
| Fixed root | `GET /api/sheets/root` → `{ ok, id, name, children }` |
| Export | Run a survey → export → open sheet URL |

## Security notes

- Never put a service account private key in `NEXT_PUBLIC_*` or client bundles
- `drive.file` scope lets the service account see its own files plus anything
  shared with it (like the fixed root folder)
