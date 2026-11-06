import { GEMINI_PRICING, type OcrResult, type OcrRow } from "@cowell/shared";
import { getCognitoAccessToken } from "./cognito-auth";
import { isCognitoConfigured } from "./cognito-config";
import { copy } from "./copy";
import {
  estimateOcrBodyBytes,
  prepareOcrBatches,
  type OcrFilePart,
} from "./ocr-payload";
import { generateId } from "./utils";

/** Backend OCR API (Lambda). Sends Cognito `Authorization: Bearer <accessToken>` when Cognito is configured. */
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
  symbol?: string;
  fixture_type?: string;
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

const PREPARE_END = 10;
const READING_CAP = 94;

function formatProgressBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function chunkDetail(chunkIndex: number, chunkTotal: number, rest: string): string {
  if (chunkTotal <= 1) return rest;
  return `送信 ${chunkIndex}/${chunkTotal} · ${rest}`;
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
    accessToken?: string;
    onUploadProgress?: (loaded: number, total: number) => void;
    onUploadComplete?: () => void;
  }
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = options.timeoutMs;
    xhr.responseType = "text";
    if (options.accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.accessToken}`);
    }

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

function mapApiRow(row: ApiSurveyRow): OcrRow {
  return {
    id: generateId(),
    floor: row.floor ?? "",
    location: row.location ?? "",
    symbol: row.symbol ?? "",
    fixtureType: row.fixture_type ?? "",
    fixtureModel: row.fixture_model ?? "",
    existingProduct: row.existing_product ?? "",
    quantity: row.quantity ?? "",
    notes: row.notes ?? "",
    sourceFile: row.photo_id || undefined,
  };
}

function buildRawText(rows: OcrRow[], warnings: string[], fileErrors: ApiFileError[]): string {
  const header = "フロア\t設置場所\tシンボル\t器具種別\t既設品番\t既設商品名\t数量\t備考";
  const body = rows.map(
    (r) =>
      `${r.floor}\t${r.location}\t${r.symbol}\t${r.fixtureType}\t${r.fixtureModel}\t${r.existingProduct}\t${r.quantity}\t${r.notes}`
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
  if (status === 401 || status === 403) {
    return "セッションが切れています。再度ログインしてください。";
  }
  if (
    status === 413 ||
    text.includes("413") ||
    text.includes("request entity too large") ||
    text.includes("payload too large") ||
    text.includes("content too large")
  ) {
    return copy.errors.ocrPayloadTooLarge;
  }
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

async function resolveOcrAccessToken(): Promise<string | undefined> {
  if (!isCognitoConfigured()) return undefined;
  const accessToken = await getCognitoAccessToken();
  if (!accessToken) {
    throw new Error("セッションが切れています。再度ログインしてください。");
  }
  return accessToken;
}

function parseOcrResponse(
  status: number,
  text: string
): {
  rows: OcrRow[];
  fileErrors: ApiFileError[];
  warnings: string[];
  costUsd: number;
  elapsedMs: number;
  totalTokens: number;
} {
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

  const busyHint = [...warnings, ...fileErrors.map((e) => e.detail)].join(" ");
  if (!rows.length && /503|unavailable|high demand/i.test(busyHint)) {
    throw new Error(copy.errors.ocrBusy);
  }

  return {
    rows,
    fileErrors,
    warnings,
    costUsd: Number(data.estimated_cost_usd) || 0,
    elapsedMs: Math.round((Number(data.processing_time_sec) || 0) * 1000),
    totalTokens: Math.max(0, Math.round(Number(data.token_usage) || 0)),
  };
}

async function postOcrBatch(
  url: string,
  prompt: string,
  files: OcrFilePart[],
  accessToken: string | undefined,
  onProgress: OcrProgressCallback | undefined,
  rangeStart: number,
  rangeEnd: number,
  chunkIndex: number,
  chunkTotal: number
): Promise<ReturnType<typeof parseOcrResponse>> {
  const form = new FormData();
  const totalBytes = estimateOcrBodyBytes(files, prompt);
  for (const file of files) {
    form.append("survey_files", file.blob, file.name);
  }
  if (prompt.trim()) {
    form.append("instructions", prompt.trim());
  }

  const uploadEnd = rangeStart + (rangeEnd - rangeStart) * 0.28;
  const sizeLabel = (loaded: number, total: number) =>
    chunkDetail(chunkIndex, chunkTotal, `${formatProgressBytes(loaded)} / ${formatProgressBytes(total)}`);

  emitProgress(onProgress, rangeStart, "uploading", sizeLabel(0, totalBytes));

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
    emitProgress(
      onProgress,
      uploadEnd,
      "reading",
      chunkDetail(chunkIndex, chunkTotal, formatProgressBytes(totalBytes))
    );
    readingTimer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed > expectedMs * 0.85 && expectedMs < 160_000) {
        expectedMs *= 1.18;
      }
      const t = Math.min(0.992, elapsed / expectedMs);
      emitProgress(
        onProgress,
        easeReading(t, uploadEnd, rangeEnd),
        "reading",
        chunkDetail(chunkIndex, chunkTotal, formatProgressBytes(totalBytes))
      );
    }, 50);
  };

  let status = 0;
  let text = "";
  try {
    const result = await postOcrForm(url, form, {
      timeoutMs: 180_000,
      accessToken,
      onUploadProgress: (loaded, total) => {
        const absoluteTotal = total > 0 ? total : totalBytes || 1;
        const absoluteLoaded =
          total > 0 ? loaded : loaded <= 1 ? absoluteTotal * loaded : loaded;
        const ratio = Math.min(1, absoluteLoaded / absoluteTotal);
        const percent = rangeStart + (uploadEnd - rangeStart) * ratio;
        emitProgress(onProgress, percent, "uploading", sizeLabel(absoluteLoaded, absoluteTotal));
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

  return parseOcrResponse(status, text);
}

async function postOcrBatchWithSplit(
  url: string,
  prompt: string,
  files: OcrFilePart[],
  accessToken: string | undefined,
  onProgress: OcrProgressCallback | undefined,
  rangeStart: number,
  rangeEnd: number,
  chunkIndex: number,
  chunkTotal: number
): Promise<ReturnType<typeof parseOcrResponse>> {
  try {
    return await postOcrBatch(
      url,
      prompt,
      files,
      accessToken,
      onProgress,
      rangeStart,
      rangeEnd,
      chunkIndex,
      chunkTotal
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const tooLarge = message === copy.errors.ocrPayloadTooLarge;
    if (!tooLarge || files.length < 2) throw err;
    const mid = Math.ceil(files.length / 2);
    const split = rangeStart + (rangeEnd - rangeStart) / 2;
    const first = await postOcrBatchWithSplit(
      url,
      prompt,
      files.slice(0, mid),
      accessToken,
      onProgress,
      rangeStart,
      split,
      chunkIndex,
      chunkTotal
    );
    const second = await postOcrBatchWithSplit(
      url,
      prompt,
      files.slice(mid),
      accessToken,
      onProgress,
      split,
      rangeEnd,
      chunkIndex,
      chunkTotal
    );
    return {
      rows: [...first.rows, ...second.rows],
      fileErrors: [...first.fileErrors, ...second.fileErrors],
      warnings: [...first.warnings, ...second.warnings],
      costUsd: first.costUsd + second.costUsd,
      elapsedMs: first.elapsedMs + second.elapsedMs,
      totalTokens: first.totalTokens + second.totalTokens,
    };
  }
}

/**
 * Call remote COWELL OCR API with multipart upload.
 * Reports real upload % then eases through reading until the response arrives.
 * Large PDFs are converted to page JPEGs so the request stays under Lambda's ~6MB body limit.
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

  const accessToken = await resolveOcrAccessToken();
  const batches = await prepareOcrBatches(files, prompt, (percent, detail) => {
    emitProgress(onProgress, percent, "preparing", detail);
  });
  const usableBatches = batches.filter((batch) => batch.length > 0);
  if (!usableBatches.length) {
    throw new Error("アップロードするファイルがありません");
  }

  const merged = {
    rows: [] as OcrRow[],
    fileErrors: [] as ApiFileError[],
    warnings: [] as string[],
    costUsd: 0,
    elapsedMs: 0,
    totalTokens: 0,
  };

  const url = `${baseUrl}/api/ocr`;
  for (let i = 0; i < usableBatches.length; i++) {
    const rangeStart =
      PREPARE_END + ((READING_CAP - PREPARE_END) * i) / usableBatches.length;
    const rangeEnd =
      PREPARE_END + ((READING_CAP - PREPARE_END) * (i + 1)) / usableBatches.length;
    const part = await postOcrBatchWithSplit(
      url,
      prompt,
      usableBatches[i],
      accessToken,
      onProgress,
      rangeStart,
      rangeEnd,
      i + 1,
      usableBatches.length
    );
    merged.rows.push(...part.rows);
    merged.fileErrors.push(...part.fileErrors);
    merged.warnings.push(...part.warnings);
    merged.costUsd += part.costUsd;
    merged.elapsedMs += part.elapsedMs;
    merged.totalTokens += part.totalTokens;
  }

  if (!merged.rows.length && merged.fileErrors.length) {
    const joined = merged.fileErrors.map((e) => `${e.filename}: ${e.detail}`).join("\n");
    throw new Error(friendlyOcrError(joined || copy.errors.ocrFailed));
  }

  emitProgress(
    onProgress,
    97,
    "finishing",
    usableBatches.length > 1 ? `送信 ${usableBatches.length}/${usableBatches.length}` : undefined
  );
  emitProgress(onProgress, 100, "finishing");

  return {
    rawText: buildRawText(merged.rows, merged.warnings, merged.fileErrors),
    rows: merged.rows,
    usage: {
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: merged.totalTokens,
      elapsedMs: merged.elapsedMs,
      costUsd: merged.costUsd,
      costJpy: merged.costUsd * GEMINI_PRICING.usdToJpy,
    },
    finishReason: merged.fileErrors.length ? "PARTIAL" : "STOP",
  };
}
