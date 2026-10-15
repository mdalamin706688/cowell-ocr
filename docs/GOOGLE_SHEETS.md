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
ECS, …). On static hosts (S3 + CloudFront, GitHub Pages) there is no `/api/*`,
so export falls back to CSV download.

To use Drive export from a static frontend, host this app somewhere
server-capable and point the FE at it:

```bash
NEXT_PUBLIC_SHEETS_API_BASE_URL=https://your-api-host.example.com
```

The static build then calls `{base}/api/sheets/export` and
`{base}/api/sheets/root` cross-origin (CORS is enabled on those routes).
Google credentials (`GOOGLE_DRIVE_REFRESH_TOKEN` / `GOOGLE_SERVICE_ACCOUNT_*`
and `GOOGLE_SHEETS_FOLDER_ID`) are configured on the API host, never on the
static site.

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
