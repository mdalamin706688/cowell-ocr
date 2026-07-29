import { GEMINI_PRICING, type OcrResult, type OcrRow } from "@cowell/shared";
import { copy } from "./copy";
import { generateId } from "./utils";

/** Backend OCR API (Lambda). No Cognito auth yet — add Bearer when BE enables it. */
export function getOcrApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_OCR_API_BASE_URL || "").replace(/\/$/, "").trim();
}

/**
 * Remote OCR when NEXT_PUBLIC_OCR_API_ENABLED=true and base URL is set.
 * Set ENABLED=false to force demo OCR on static hosts.
 */
export function isOcrApiConfigured(): boolean {
  const enabled = process.env.NEXT_PUBLIC_OCR_API_ENABLED === "true";
  return enabled && Boolean(getOcrApiBaseUrl());
}

/** Phases aligned with ProcessingPanel copy thresholds */
export type OcrProgressPhase = "preparing" | "uploading" | "reading" | "finishing";

export interface OcrProgressEvent {
  percent: number;
  phase: OcrProgressPhase;
  /** e.g. upload "1.2 MB / 3.4 MB" */
  detail?: string;
}

export type OcrProgressCallback = (event: OcrProgressEvent) => void;

export interface OcrRunOptions {
  onProgress?: OcrProgressCallback;
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
  /** Total tokens consumed (input + output) — available on current OCR API */
  token_usage?: number;
  file_errors?: ApiFileError[];
  warnings?: string[];
}

const PREPARE_END = 4;
const READING_CAP = 94;

function formatProgressBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Small payloads finish upload instantly — keep upload band short so reading owns the bar. */
function uploadBandEnd(totalBytes: number): number {
  if (totalBytes < 400_000) return 16;
  if (totalBytes < 1_500_000) return 28;
  return 38;
}

function emitProgress(
  onProgress: OcrProgressCallback | undefined,
  percent: number,
  phase: OcrProgressPhase,
  detail?: string
): void {
  onProgress?.({
    percent: Math.round(Math.min(100, Math.max(0, percent)) * 10) / 10,
    phase,
    detail,
  });
}

/** Expected server wait after upload — scales with payload size / file count. */
function estimateReadingMs(fileCount: number, totalBytes: number): number {
  const byCount = 8_000 + fileCount * 7_000;
  const bySize = Math.min(75_000, totalBytes / 5_000);
  return Math.min(110_000, Math.max(10_000, byCount + bySize));
}

/** Ease-out progress from start→cap (t in 0..1). */
function easeReading(t: number, start: number, cap: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = 1 - Math.pow(1 - clamped, 2.35);
  return start + (cap - start) * eased;
}

function postOcrForm(
  url: string,
  form: FormData,
  options: {
    timeoutMs: number;
    onUploadProgress?: (loaded: number, total: number) => void;
    onUploadComplete?: () => void;
  }
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = options.timeoutMs;
    xhr.responseType = "text";

    let uploadCompleted = false;
    const markUploadComplete = () => {
      if (uploadCompleted) return;
      uploadCompleted = true;
      options.onUploadComplete?.();
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      options.onUploadProgress?.(event.loaded, event.total);
      if (event.loaded >= event.total) markUploadComplete();
    };
    xhr.upload.onload = () => {
      options.onUploadProgress?.(1, 1);
      markUploadComplete();
    };

    xhr.onload = () => {
      markUploadComplete();
      resolve({ status: xhr.status, text: String(xhr.responseText ?? "") });
    };
    xhr.onerror = () => {
      reject(new Error(copy.errors.serviceUnavailable));
    };
    xhr.ontimeout = () => {
      reject(
        new Error(
          "読み取りがタイムアウトしました（180秒）。ファイル数を減らして再試行してください。"
        )
      );
    };
    xhr.onabort = () => {
      reject(
        new Error(
          "読み取りがタイムアウトしました（180秒）。ファイル数を減らして再試行してください。"
        )
      );
    };

    xhr.send(form);
  });
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
 * Reports real upload % then eases through reading until the response arrives.
 * Docs: https://4gzkbzzubqjzwcx7mf3xcjpb7i0rdssf.lambda-url.ap-northeast-1.on.aws/docs
 */
export async function runRemoteOcr(
  prompt: string,
  files: Array<{ base64: string; mimeType: string; name: string }>,
  options: OcrRunOptions = {}
): Promise<OcrResult> {
  const { onProgress } = options;
  const baseUrl = getOcrApiBaseUrl();
  if (!baseUrl) {
    throw new Error("OCR API が設定されていません");
  }
  if (!files.length) {
    throw new Error("アップロードするファイルがありません");
  }

  emitProgress(onProgress, 1, "preparing");

  const form = new FormData();
  let totalBytes = 0;
  for (const file of files) {
    const blob = base64ToBlob(file.base64, file.mimeType);
    totalBytes += blob.size;
    form.append("survey_files", blob, file.name);
  }
  if (prompt.trim()) {
    form.append("instructions", prompt.trim());
  }

  const uploadStart = PREPARE_END;
  const uploadEnd = uploadBandEnd(totalBytes);
  emitProgress(onProgress, uploadStart, "uploading", `0 / ${formatProgressBytes(totalBytes)}`);

  let readingTimer: number | null = null;
  let readingStarted = false;
  const clearReadingTicker = () => {
    if (readingTimer != null) {
      window.clearInterval(readingTimer);
      readingTimer = null;
    }
  };

  const startReadingTicker = () => {
    if (readingStarted) return;
    readingStarted = true;
    clearReadingTicker();
    const started = Date.now();
    let expectedMs = estimateReadingMs(files.length, totalBytes);
    emitProgress(onProgress, uploadEnd, "reading");
    readingTimer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed > expectedMs * 0.85 && expectedMs < 160_000) {
        expectedMs *= 1.18;
      }
      const t = Math.min(0.992, elapsed / expectedMs);
      emitProgress(onProgress, easeReading(t, uploadEnd, READING_CAP), "reading");
    }, 50);
  };

  let status = 0;
  let text = "";
  try {
    const result = await postOcrForm(`${baseUrl}/api/ocr`, form, {
      timeoutMs: 180_000,
      onUploadProgress: (loaded, total) => {
        const absoluteTotal = total > 0 ? total : totalBytes || 1;
        const absoluteLoaded =
          total > 0 ? loaded : loaded <= 1 ? absoluteTotal * loaded : loaded;
        const ratio = Math.min(1, absoluteLoaded / absoluteTotal);
        const percent = uploadStart + (uploadEnd - uploadStart) * ratio;
        emitProgress(
          onProgress,
          percent,
          "uploading",
          `${formatProgressBytes(absoluteLoaded)} / ${formatProgressBytes(absoluteTotal)}`
        );
      },
      onUploadComplete: startReadingTicker,
    });
    status = result.status;
    text = result.text;
  } catch (err) {
    clearReadingTicker();
    throw err;
  } finally {
    clearReadingTicker();
  }

  emitProgress(onProgress, 97, "finishing");

  let data: ApiOcrResponse & { detail?: unknown; message?: string } = {};
  try {
    data = text.trim() ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new Error(friendlyOcrError(text, status));
  }

  if (status < 200 || status >= 300) {
    if (Array.isArray(data.detail)) {
      const msg = data.detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: string }).msg) : String(d)))
        .join("; ");
      throw new Error(friendlyOcrError(msg, status));
    }
    const raw =
      (typeof data.detail === "string" && data.detail) ||
      data.message ||
      text ||
      `読み取りに失敗しました (${status})`;
    throw new Error(friendlyOcrError(String(raw), status));
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
  const totalTokens = Math.max(0, Math.round(Number(data.token_usage) || 0));

  emitProgress(onProgress, 100, "finishing");

  return {
    rawText: buildRawText(rows, warnings, fileErrors),
    rows,
    usage: {
      promptTokens: 0,
      outputTokens: 0,
      totalTokens,
      elapsedMs,
      costUsd,
      costJpy: costUsd * GEMINI_PRICING.usdToJpy,
    },
    finishReason: fileErrors.length ? "PARTIAL" : "STOP",
  };
}
