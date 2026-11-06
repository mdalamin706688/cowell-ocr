# Cowell OCR — Production Codebase

LED field survey (現地調査) digitization platform. Upload handwritten survey sheets, run Gemini OCR, review results, and export to Google Spreadsheet.

## Project Structure

```
cowell/
├── apps/web/                  # Next.js 15 production frontend + API
│   ├── src/app/
│   │   ├── login/             # Authentication
│   │   ├── dashboard/         # Admin dashboard
│   │   ├── survey/new/        # Full OCR workflow
│   │   └── api/               # Secure backend routes
│   └── src/components/        # Premium UI components
├── packages/shared/           # Shared types & constants
├── infra/                     # AWS deployment configs (placeholder)
├── docs/                      # Additional documentation
├── ocr_prototype.html         # Original HTML spike (reference)
├── Cowell_OCR_phase1.pdf      # Phase 1 specification
└── 2026.05.07.150643/         # Sample survey data
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| UI | Tailwind CSS, Radix UI, shadcn-style components |
| Animation | Framer Motion |
| OCR | Google Gemini Flash (server-side) |
| Export | Google Sheets API (stub ready) |
| Auth | Cookie session (upgrade to Cognito/Google) |
| Hosting | AWS (serverless target) |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Gemini API key

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your GEMINI_API_KEY

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login** (change in `.env.local`):
- Email: `admin@cowell.local`
- Password: `change-me`

## Phase 1 Workflow

1. **Login** — Admin authentication
2. **Upload** — Multi-file image/PDF with compression
3. **OCR** — Gemini Flash reads handwritten tables
4. **Review** — Edit extracted rows inline
5. **Export** — Write to Google Spreadsheet

## Environment Variables

See `.env.example` for all variables. Required for OCR:

```
GEMINI_API_KEY=your_key_here
```

For Google Sheets export, see [docs/GOOGLE_SHEETS.md](docs/GOOGLE_SHEETS.md). Preferred (FE):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_web_client_id
```

Optional service account fallback:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SHEETS_FOLDER_ID=
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/login` | POST | Admin login |
| `/api/auth/logout` | POST | Clear session |
| `/api/ocr` | POST | Run Gemini OCR (key stays server-side) |
| `/api/sheets/export` | POST | Export rows to Google Sheets |

## Deployment (AWS)

Target architecture per Phase 1 spec:

- **Frontend**: S3 + CloudFront or Amplify
- **API**: Lambda + API Gateway (or Next.js on Lambda)
- **No database** in Phase 1
- **Cost target**: ~¥20,000/month

See `infra/README.md` for deployment steps.

## Sample Data

Test with real field survey data in `2026.05.07.150643/`:
- 23-page handwritten PDF
- 686-row Excel reference (学校法人郁文館夢学園)

## Development vs Prototype

| Feature | `ocr_prototype.html` | `apps/web` |
|---------|---------------------|------------|
| Gemini OCR | Client-side (key exposed) | Server-side (secure) |
| UI | Basic HTML | Premium Next.js UI |
| Auth | None | Session login |
| Sheets | None | API stub ready |
| Mobile | Basic | Responsive |

## License

Proprietary — Cowell Phase 1 project.
