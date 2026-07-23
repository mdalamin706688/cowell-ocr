import type { OcrResult, OcrRow } from "@cowell/shared";
import { getBasePath, isPreviewEnvironment } from "./client-auth";
import { rowsToTsv } from "./ocr";
import { copy } from "./copy";
import {
  isGoogleClientConfigured,
  requestGoogleSheetsAccessToken,
} from "./google-auth-client";
import { runMockOcr } from "./mock-ocr";
import { exportRowsWithAccessToken } from "./sheets-export";

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

export async function surveyRunOcr(
  prompt: string,
  files: Array<{ base64: string; mimeType: string; name: string }>
): Promise<OcrResult> {
  // GitHub Pages is static — use demo OCR (no backend)
  if (isPreviewEnvironment()) {
    await new Promise((r) => setTimeout(r, 600));
    return runMockOcr(files);
  }

  const res = await fetch(`${getBasePath()}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, files }),
  });

  if (!res.ok) {
    const data = await parseJsonResponse<ApiError>(res);
    throw new Error(data.error || "読み取りに失敗しました");
  }

  return parseJsonResponse<OcrResult>(res);
}

export interface SurveyExportResult {
  spreadsheetUrl: string;
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

export async function surveyExport(
  rows: OcrRow[],
  title: string
): Promise<SurveyExportResult> {
  if (isPreviewEnvironment()) {
    // Static preview: prefer FE Google connect when client ID is set
    if (isGoogleClientConfigured()) {
      const accessToken = await requestGoogleSheetsAccessToken();
      const folderId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID || null;
      const result = await exportRowsWithAccessToken({
        accessToken,
        rows,
        title,
        folderId,
      });
      return {
        spreadsheetUrl: result.spreadsheetUrl,
        rowCount: result.rowCount,
        photoCount: result.photoCount,
      };
    }
    downloadCsv(rows, title);
    return { spreadsheetUrl: "", rowCount: rows.length, downloadOnly: true };
  }

  // Full app: FE Google OAuth first, then server (service account) fallback
  let accessToken: string | undefined;
  if (isGoogleClientConfigured()) {
    accessToken = await requestGoogleSheetsAccessToken();
  }

  const res = await fetch(`${getBasePath()}/api/sheets/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, title, accessToken }),
  });

  if (!res.ok) {
    const data = await parseJsonResponse<ApiError>(res);
    throw new Error(data.error || "スプレッドシートへの登録に失敗しました");
  }

  const data = await parseJsonResponse<{
    spreadsheetUrl: string;
    rowCount: number;
    photoCount?: number;
  }>(res);
  return {
    spreadsheetUrl: data.spreadsheetUrl,
    rowCount: data.rowCount,
    photoCount: data.photoCount,
  };
}
