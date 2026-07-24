# Backend OCR API

Live docs: https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws/docs

## Frontend wiring

When `NEXT_PUBLIC_OCR_API_BASE_URL` is set **and** `NEXT_PUBLIC_OCR_API_ENABLED=true`, the FE calls:

`POST {base}/api/ocr` as `multipart/form-data`

| Field | Value |
|-------|--------|
| `survey_files` | one or more files |
| `instructions` | OCR prompt (optional) |

Response snake_case rows are mapped to FE `OcrRow` (camelCase).

If `NEXT_PUBLIC_OCR_API_ENABLED` is not `true` (default), static FE uses **demo OCR** until backend confirms Gemini is stable.

Auth is **not** required yet. When the backend enables Cognito, FE will send:

`Authorization: Bearer <accessToken>`

## Env

```text
NEXT_PUBLIC_OCR_API_BASE_URL=https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws
NEXT_PUBLIC_OCR_API_ENABLED=false
```

Set `NEXT_PUBLIC_OCR_API_ENABLED=true` (GitHub secret or local env) to use the live API again.
