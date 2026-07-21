# Google Sheets setup (FE-driven)

Cowell OCR exports reviewed OCR rows to a new Google Spreadsheet.  
Makara’s preferred path: **connect Google and write Sheets from the FE** (user OAuth).  
A service account remains available as a server-side fallback.

## Option A — FE Google OAuth (recommended)

User clicks export → Google account picker → spreadsheet is created in **their** Drive (or a shared folder).

### 1. Google Cloud Console

1. Create / select a project
2. Enable **Google Sheets API** and **Google Drive API**
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - production origin (e.g. `https://your-app.vercel.app`)
   - Authorized redirect URIs: not required for GIS token client
4. Copy the **Client ID**

### OAuth consent screen

- User type: Internal (Workspace) or External
- Scopes:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.file`
- Add test users if the app is in Testing mode

### 2. Env

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
# Optional: place new sheets in a shared folder the user can write to
NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID=
GOOGLE_SHEETS_FOLDER_ID=
```

Restart `npm run dev` after changing env.

### 3. Flow

1. Review OCR rows
2. Click **スプレッドシートに登録**
3. Approve Google access (once per session)
4. Open the created sheet from the success screen

---

## Option B — Service account (server fallback)

Use when you want unattended export into a company Drive folder (no user Google popup).

1. Create a **service account** + JSON key
2. Enable Sheets + Drive APIs
3. Share a Drive folder with the service account email (**Editor**)
4. Set:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_FOLDER_ID=folder_id_from_drive_url
```

If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set, FE OAuth is tried first; otherwise the API uses the service account.

---

## Local check

| Check | How |
|-------|-----|
| Status API | `GET /api/sheets/export` → `{ oauthClientConfigured, serviceAccountConfigured, folderConfigured }` |
| Export | Run a survey → export → open sheet URL |

## Security notes

- Never put a service account private key in `NEXT_PUBLIC_*` or client bundles
- OAuth client ID is public by design; restrict origins in Cloud Console
- `drive.file` only allows files the app creates (or that the user opens with the app)
