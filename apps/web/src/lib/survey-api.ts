import type { OcrResult, OcrRow } from "@cowell/shared";
import { getBasePath, isPreviewEnvironment } from "./client-auth";
import { writeLastRootFolder } from "./drive-root-folder";
import {
  isGoogleClientConfigured,
  requireConnectedGoogleDrive,
} from "./google-auth-client";
import { runMockOcr } from "./mock-ocr";
import { rowsToTsv } from "./ocr";
import { isOcrApiConfigured, runRemoteOcr } from "./ocr-api";
import {
  exportRowsWithAccessToken,
  type ExportProgressCallback,
} from "./sheets-export";

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
  if (isOcrApiConfigured()) {
    return runRemoteOcr(prompt, files);
  }

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

export interface SurveyExportOptions {
  projectName: string;
  rootFolderName?: string;
  rootFolderId?: string | null;
  googleAccountEmail?: string | null;
  sourceFiles?: Array<{ base64: string; mimeType: string; name: string }>;
  onProgress?: ExportProgressCallback;
}

/**
 * Export uses the already-connected Google session only.
 * Account picker runs once in Drive保存先 — never again on export.
 */
export async function surveyExport(
  rows: OcrRow[],
  options: SurveyExportOptions
): Promise<SurveyExportResult> {
  const {
    projectName,
    sourceFiles,
    rootFolderName,
    rootFolderId,
    googleAccountEmail,
    onProgress,
  } = options;
  const title = projectName.trim() || "現調";

  if (isGoogleClientConfigured()) {
    // No account picker here — session must already exist
    const account = requireConnectedGoogleDrive();

    const sameAccount =
      Boolean(googleAccountEmail) &&
      googleAccountEmail!.trim().toLowerCase() === account.email.toLowerCase();
    const safeFolderId = sameAccount ? rootFolderId ?? null : null;

    if (rootFolderName) {
      writeLastRootFolder(
        { name: rootFolderName, id: safeFolderId || undefined },
        account.email
      );
    }

    onProgress?.({ percent: 0, phase: "folders" });
    const result = await exportRowsWithAccessToken({
      accessToken: account.accessToken,
      rows,
      projectName: title,
      rootFolderName,
      sourceFiles,
      folderId: safeFolderId,
      onProgress,
    });
    return {
      spreadsheetUrl: result.spreadsheetUrl,
      rowCount: result.rowCount,
      photoCount: result.photoCount,
    };
  }

  if (isPreviewEnvironment()) {
    onProgress?.({ percent: 40, phase: "spreadsheet" });
    downloadCsv(rows, title);
    onProgress?.({ percent: 100, phase: "finishing" });
    return { spreadsheetUrl: "", rowCount: rows.length, downloadOnly: true };
  }

  onProgress?.({ percent: 20, phase: "spreadsheet" });
  const res = await fetch(`${getBasePath()}/api/sheets/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows,
      projectName: title,
      rootFolderName,
      folderId: rootFolderId,
      sourceFiles,
    }),
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
  onProgress?.({ percent: 100, phase: "finishing" });
  return {
    spreadsheetUrl: data.spreadsheetUrl,
    rowCount: data.rowCount,
    photoCount: data.photoCount,
  };
}
