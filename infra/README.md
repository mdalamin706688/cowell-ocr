# AWS Infrastructure — Cowell OCR

Phase 1 target: serverless AWS, no database, ~¥20,000/month.

## Planned Architecture

```
User (Browser)
    │
    ▼
CloudFront + S3 (Static / Next.js)
    │
    ▼
API Gateway → Lambda (OCR + Sheets + Auth)
    │
    ├── Gemini API (Google)
    └── Google Sheets API
```

## Environments

| Env | Purpose | Status |
|-----|---------|--------|
| `dev` | Development & testing | Not provisioned |
| `prod` | Production (~10 users) | Not provisioned |

## Next Steps for Dev Server

1. Create AWS account / use existing Cowell account
2. Set up IAM roles for Lambda
3. Store secrets in AWS Secrets Manager:
   - `GEMINI_API_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
4. Deploy Next.js app (Amplify or SST recommended)
5. Configure custom domain + HTTPS

## Recommended Tools

- **SST** or **AWS Amplify** — deploy Next.js with minimal config
- **AWS Secrets Manager** — API keys
- **CloudWatch** — logging & cost monitoring

## Cost Controls

- No RDS/database in Phase 1
- Lambda pay-per-use
- Gemini API billed separately (Cowell contract)
- Set CloudWatch billing alerts at ¥20,000/month
