# Backend OCR API

Live docs: https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws/docs

## Frontend wiring

When `NEXT_PUBLIC_OCR_API_BASE_URL` is set, the FE calls:

`POST {base}/api/ocr` as `multipart/form-data`

| Field | Value |
|-------|--------|
| `survey_files` | one or more files |
| `instructions` | OCR prompt (optional) |

Response snake_case rows are mapped to FE `OcrRow` (camelCase).

Auth is **not** required yet. When the backend enables Cognito, FE will send:

`Authorization: Bearer <accessToken>`

## Env

```text
NEXT_PUBLIC_OCR_API_BASE_URL=https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws
```

AWS static build defaults to this URL if the GitHub secret is empty.
