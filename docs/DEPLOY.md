# Deployment

## AWS S3 + CloudFront (static frontend)

Live URL (after deploy): `https://d1xs8fe440jh05.cloudfront.net`

### Required GitHub Actions secrets

| Secret | Example |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_REGION` | `ap-northeast-1` |
| `S3_BUCKET_NAME` | `cowell-ocr-frontend` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E310HKOK8I8549` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth Web client ID |
| `NEXT_PUBLIC_COGNITO_REGION` | `ap-south-1` |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID (public) |
| `NEXT_PUBLIC_APP_URL` | `https://d1xs8fe440jh05.cloudfront.net` (optional) |

Push to `main` runs **Deploy AWS (S3 + CloudFront)**.

> Static only (same as GitHub Pages): mock OCR demo, FE Google Sheets OAuth. No server Gemini API.

### CloudFront checklist

1. **Default root object** = `index.html` (Settings → Edit)
2. Google OAuth **Authorized JavaScript origins** add:
   `https://d1xs8fe440jh05.cloudfront.net`

## GitHub Pages (UI preview)

1. Open **Settings → Pages → Build and deployment**
2. Under **Source**, select **GitHub Actions**
3. Use existing `pages.yml` (“Deploy GitHub Pages”)

Live: `https://mdalamin706688.github.io/cowell-ocr/`

## Full production (Vercel / Amplify — real OCR API)

Needed for server-side Gemini OCR. S3 + CloudFront cannot host `/api/ocr`.

See previous Vercel secrets (`GEMINI_API_KEY`, auth, etc.) in `deploy.yml`.

## Local development

```bash
npm install
cp .env.example apps/web/.env.local
npm run dev
```
