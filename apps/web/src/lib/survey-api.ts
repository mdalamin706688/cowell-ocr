import type { OcrResult, OcrRow } from "@cowell/shared";
import { getBasePath, isPreviewEnvironment } from "./client-auth";
import { runMockOcr } from "./mock-ocr";
import { rowsToTsv } from "./ocr";
import { isOcrApiConfigured, runRemoteOcr, type OcrProgressCallback } from "./ocr-api";
import {
  getDirectDriveAccessToken,
  getDirectServiceAccountAccessToken,
  isDirectDriveConfigured,
} from "./google-direct";
import { isRemoteSheetsApi, sheetsApiAuthHeaders, sheetsApiUrl, surveyUsesCsvFallback } from "./sheets-api";
import { exportRowsWithAccessToken, type ExportProgressCallback } from "./sheets-export";
import { getFixedDriveRootFolderId } from "./drive-root-folder";

type ApiError = { error?: string };

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("サーバーから応答がありませんでした");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("読み取りサービスに接続できませんでした。しばらくしてから再度お試しください。");
  }
}

async function simulateOcrProgress(
  onProgress: OcrProgressCallback | undefined,
  durationMs: number
): Promise<void> {
  if (!onProgress) {
    await new Promise((r) => setTimeout(r, durationMs));
    return;
  }
  const started = Date.now();
  onProgress({ percent: 2, phase: "preparing" });
  await new Promise<void>((resolve) => {
    const id = window.setInterval(() => {
      const t = (Date.now() - started) / durationMs;
      if (t >= 1) {
        window.clearInterval(id);
        onProgress({ percent: 96, phase: "finishing" });
        resolve();
        return;
      }
      if (t < 0.08) {
        onProgress({ percent: 2 + 6 * (t / 0.08), phase: "preparing" });
      } else if (t < 0.28) {
        const u = (t - 0.08) / 0.2;
        onProgress({ percent: 8 + 28 * u, phase: "uploading" });
      } else {
        const readingT = (t - 0.28) / 0.72;
        const eased = 1 - Math.pow(1 - Math.min(1, readingT), 2.2);
        onProgress({
          percent: 36 + 58 * eased,
          phase: "reading",
        });
      }
    }, 50);
  });
}

/** Keep the bar moving while waiting on a non-streaming OCR response. */
function startLocalReadingTicker(
  onProgress: OcrProgressCallback | undefined,
  startPercent: number,
  capPercent: number,
  expectedMs: number
): () => void {
  if (!onProgress) return () => undefined;
  const started = Date.now();
  let expected = expectedMs;
  const id = window.setInterval(() => {
    const elapsed = Date.now() - started;
    if (elapsed > expected * 0.85 && expected < 120_000) expected *= 1.18;
    const t = Math.min(0.992, elapsed / expected);
    const eased = 1 - Math.pow(1 - t, 2.35);
    onProgress({
      percent: Math.round((startPercent + (capPercent - startPercent) * eased) * 10) / 10,
      phase: "reading",
    });
  }, 50);
  return () => window.clearInterval(id);
}

export async function surveyRunOcr(
  prompt: string,
  files: Array<{ base64: string; mimeType: string; name: string }>,
  options?: { onProgress?: OcrProgressCallback }
): Promise<OcrResult> {
  if (isOcrApiConfigured()) {
    return runRemoteOcr(prompt, files, options);
  }

  if (isPreviewEnvironment()) {
    await simulateOcrProgress(options?.onProgress, 1_400);
    const result = runMockOcr(files);
    options?.onProgress?.({ percent: 100, phase: "finishing" });
    return result;
  }

  const onProgress = options?.onProgress;
  onProgress?.({ percent: 3, phase: "preparing" });
  onProgress?.({ percent: 12, phase: "uploading" });

  const stopTicker = startLocalReadingTicker(
    onProgress,
    18,
    94,
    Math.min(90_000, 10_000 + files.length * 8_000)
  );
  onProgress?.({ percent: 18, phase: "reading" });

  try {
    const res = await fetch(`${getBasePath()}/api/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, files }),
    });

    stopTicker();

    if (!res.ok) {
      const data = await parseJsonResponse<ApiError>(res);
      throw new Error(data.error || "読み取りに失敗しました");
    }

    onProgress?.({ percent: 97, phase: "finishing" });
    const result = await parseJsonResponse<OcrResult>(res);
    onProgress?.({ percent: 100, phase: "finishing" });
    return result;
  } catch (err) {
    stopTicker();
    throw err;
  }
}

export interface SurveyExportResult {
  spreadsheetUrl: string;
  processFolderUrl?: string;
  rowCount: number;
  photoCount?: number;
  downloadOnly?: boolean;
}

function downloadCsv(rows: OcrRow[], title: string): void {
  const tsv = rowsToTsv(rows);
  const blob = new Blob(["\uFEFF" + tsv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/[^\w\u3000-\u9fff-]/g, "_")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function triggerCsvDownload(rows: OcrRow[], title: string): void {
  downloadCsv(rows, title);
}

export interface SurveyExportOptions {
  projectName: string;
  sourceFiles?: Array<{ base64: string; mimeType: string; name: string }>;
  onProgress?: ExportProgressCallback;
}

/**
 * Export into the fixed root folder — no Google popup for the user.
 * Priority: NEXT_PUBLIC_SHEETS_API_BASE_URL (Lambda on static hosts) →
 * same-origin /api/sheets/export (server hosting) → browser-direct export
 * with embedded refresh-token creds (insecure, see google-direct.ts) →
 * CSV fallback.
 */
export async function surveyExport(
  rows: OcrRow[],
  options: SurveyExportOptions
): Promise<SurveyExportResult> {
  const { projectName, sourceFiles, onProgress } = options;
  const title = projectName.trim() || "現調";

  if (surveyUsesCsvFallback()) {
    onProgress?.({ percent: 10, phase: "folders" });
    onProgress?.({ percent: 25, phase: "sources" });
    onProgress?.({ percent: 45, phase: "photos" });
    onProgress?.({ percent: 70, phase: "spreadsheet" });
    downloadCsv(rows, title);
    onProgress?.({ percent: 100, phase: "finishing" });
    return { spreadsheetUrl: "", rowCount: rows.length, downloadOnly: true };
  }

  // Static host + embedded credential → run the export in the browser.
  // INSECURE: refresh token is public — see google-direct.ts.
  if (isPreviewEnvironment() && !isRemoteSheetsApi() && isDirectDriveConfigured()) {
    const accessToken = await getDirectDriveAccessToken();
    // SA creates the folder skeleton when configured → folders stay SA-owned
    // so the retention job can delete them. File bytes still use the user
    // token (service accounts have no storage quota).
    const folderAccessToken = await getDirectServiceAccountAccessToken();
    const result = await exportRowsWithAccessToken({
      accessToken,
      folderAccessToken: folderAccessToken ?? undefined,
      rows,
      projectName: title,
      sourceFiles,
      folderId: getFixedDriveRootFolderId(),
      onProgress,
    });
    return {
      spreadsheetUrl: result.spreadsheetUrl,
      processFolderUrl: result.processFolderUrl,
      rowCount: result.rowCount,
      photoCount: result.photoCount,
    };
  }

  onProgress?.({ percent: 10, phase: "folders" });
  const res = await fetch(sheetsApiUrl("export"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await sheetsApiAuthHeaders()),
    },
    body: JSON.stringify({
      rows,
      projectName: title,
      sourceFiles,
    }),
  });

  if (!res.ok) {
    const data = await parseJsonResponse<ApiError>(res);
    throw new Error(data.error || "スプレッドシートへの登録に失敗しました");
  }

  const data = await parseJsonResponse<{
    spreadsheetUrl: string;
    processFolderUrl?: string;
    rowCount: number;
    photoCount?: number;
  }>(res);
  onProgress?.({ percent: 100, phase: "finishing" });
  return {
    spreadsheetUrl: data.spreadsheetUrl,
    processFolderUrl: data.processFolderUrl,
    rowCount: data.rowCount,
    photoCount: data.photoCount,
  };
}
