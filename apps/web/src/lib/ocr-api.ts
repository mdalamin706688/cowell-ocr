import { GEMINI_PRICING, type OcrResult, type OcrRow } from "@cowell/shared";
import { copy } from "./copy";
import { generateId } from "./utils";

/** Backend OCR API (Lambda). No Cognito auth yet — add Bearer when BE enables it. */
export function getOcrApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_OCR_API_BASE_URL || "").replace(/\/$/, "").trim();
}

export function isOcrApiConfigured(): boolean {
  return Boolean(getOcrApiBaseUrl());
}

interface ApiSurveyRow {
  id?: number;
  floor?: string;
  location?: string;
  fixture_model?: string;
  existing_product?: string;
  photo_id?: string;
  quantity?: string;
  notes?: string;
}

interface ApiFileError {
  filename: string;
  error_code: string;
  detail: string;
}

interface ApiOcrResponse {
  rows?: ApiSurveyRow[];
  total_pages?: number;
  estimated_cost_usd?: number;
  processing_time_sec?: number;
  file_errors?: ApiFileError[];
  warnings?: string[];
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function mapApiRow(row: ApiSurveyRow): OcrRow {
  return {
    id: row.id != null && row.id > 0 ? String(row.id) : generateId(),
    floor: row.floor ?? "",
    location: row.location ?? "",
    fixtureModel: row.fixture_model ?? "",
    existingProduct: row.existing_product ?? "",
    quantity: row.quantity ?? "",
    notes: row.notes ?? "",
    sourceFile: row.photo_id || undefined,
  };
}

function buildRawText(rows: OcrRow[], warnings: string[], fileErrors: ApiFileError[]): string {
  const header = "フロア\t設置場所\t器具品番\t既設商品名\t数量\t備考";
  const body = rows.map(
    (r) =>
      `${r.floor}\t${r.location}\t${r.fixtureModel}\t${r.existingProduct}\t${r.quantity}\t${r.notes}`
  );
  const extras: string[] = [];
  if (warnings.length) extras.push("", "Warnings:", ...warnings.map((w) => `- ${w}`));
  if (fileErrors.length) {
    extras.push(
      "",
      "File errors:",
      ...fileErrors.map((e) => `- ${e.filename}: ${e.detail} (${e.error_code})`)
    );
  }
  return [header, ...body, ...extras].join("\n");
}

/** Map Gemini / gateway overload messages into a clear Japanese UI error. */
function friendlyOcrError(raw: string, status?: number): string {
  const text = raw.toLowerCase();
  if (
    status === 503 ||
    text.includes("503") ||
    text.includes("unavailable") ||
    text.includes("high demand") ||
    text.includes("resource_exhausted") ||
    text.includes("resource exhausted")
  ) {
    return copy.errors.ocrBusy;
  }
  return raw || copy.errors.ocrFailed;
}

/**
 * Call remote Cowell OCR API with multipart upload.
 * Docs: https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws/docs
 */
export async function runRemoteOcr(
  prompt: string,
  files: Array<{ base64: string; mimeType: string; name: string }>
): Promise<OcrResult> {
  const baseUrl = getOcrApiBaseUrl();
  if (!baseUrl) {
    throw new Error("OCR API が設定されていません");
  }
  if (!files.length) {
    throw new Error("アップロードするファイルがありません");
  }

  const form = new FormData();
  for (const file of files) {
    form.append("survey_files", base64ToBlob(file.base64, file.mimeType), file.name);
  }
  if (prompt.trim()) {
    form.append("instructions", prompt.trim());
  }

  const controller = new AbortController();
  const timeoutMs = 180_000;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/ocr`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("読み取りがタイムアウトしました（180秒）。ファイル数を減らして再試行してください。");
    }
    throw new Error(copy.errors.serviceUnavailable);
  } finally {
    window.clearTimeout(timer);
  }

  const text = await res.text();
  let data: ApiOcrResponse & { detail?: unknown; message?: string } = {};
  try {
    data = text.trim() ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new Error(friendlyOcrError(text, res.status));
  }

  if (!res.ok) {
    if (Array.isArray(data.detail)) {
      const msg = data.detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: string }).msg) : String(d)))
        .join("; ");
      throw new Error(friendlyOcrError(msg, res.status));
    }
    const raw =
      (typeof data.detail === "string" && data.detail) ||
      data.message ||
      text ||
      `読み取りに失敗しました (${res.status})`;
    throw new Error(friendlyOcrError(String(raw), res.status));
  }

  const apiRows = Array.isArray(data.rows) ? data.rows : [];
  const fileErrors = Array.isArray(data.file_errors) ? data.file_errors : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  const rows = apiRows.map(mapApiRow);

  if (!rows.length && fileErrors.length) {
    const joined = fileErrors.map((e) => `${e.filename}: ${e.detail}`).join("\n");
    throw new Error(friendlyOcrError(joined || copy.errors.ocrFailed));
  }

  // Some backends return 200 with Gemini 503 text in warnings only
  const busyHint = [...warnings, ...fileErrors.map((e) => e.detail)].join(" ");
  if (!rows.length && /503|unavailable|high demand/i.test(busyHint)) {
    throw new Error(copy.errors.ocrBusy);
  }

  const costUsd = Number(data.estimated_cost_usd) || 0;
  const elapsedMs = Math.round((Number(data.processing_time_sec) || 0) * 1000);

  return {
    rawText: buildRawText(rows, warnings, fileErrors),
    rows,
    usage: {
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      elapsedMs,
      costUsd,
      costJpy: costUsd * GEMINI_PRICING.usdToJpy,
    },
    finishReason: fileErrors.length ? "PARTIAL" : "STOP",
  };
}
