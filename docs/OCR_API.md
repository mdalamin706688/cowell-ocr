# Backend OCR API

Live docs: https://4gzkbzzubqjzwcx7mf3xcjpb7i0rdssf.lambda-url.ap-northeast-1.on.aws/docs

## Frontend wiring

When `NEXT_PUBLIC_OCR_API_BASE_URL` is set **and** `NEXT_PUBLIC_OCR_API_ENABLED=true`, the FE calls:

`POST {base}/api/ocr` as `multipart/form-data`

| Field | Value |
|-------|--------|
| `survey_files` | one or more files |
| `instructions` | OCR prompt (optional) |

Response snake_case rows are mapped to FE `OcrRow` (camelCase).

If `NEXT_PUBLIC_OCR_API_ENABLED` is `false`, static FE uses **demo OCR**.

Auth is **not** required yet. When the backend enables Cognito, FE will send:

`Authorization: Bearer <accessToken>`

## Env

```text
NEXT_PUBLIC_OCR_API_BASE_URL=https://4gzkbzzubqjzwcx7mf3xcjpb7i0rdssf.lambda-url.ap-northeast-1.on.aws
NEXT_PUBLIC_OCR_API_ENABLED=true
```

Set `NEXT_PUBLIC_OCR_API_ENABLED=false` to force demo data again.
