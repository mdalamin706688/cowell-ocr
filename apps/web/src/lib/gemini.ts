import { GEMINI_PRICING } from "@cowell/shared";
import type { OcrResult, OcrRow } from "@cowell/shared";
import { parseTsvToRows } from "./ocr";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiOcrRequest {
  prompt: string;
  files: Array<{ base64: string; mimeType: string; name: string }>;
}

export interface GeminiOcrOptions {
  model?: string;
}

export async function runGeminiOcr(
  request: GeminiOcrRequest,
  options: GeminiOcrOptions = {}
): Promise<OcrResult> {
  // Server-only: never accept keys from the client. Env only.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = options.model ?? process.env.GEMINI_MODEL?.trim() ?? "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("読み取り機能の設定が完了していません");
  }

  const start = Date.now();

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: request.prompt },
  ];

  for (const file of request.files) {
    parts.push({
      inline_data: {
        mime_type: file.mimeType,
        data: file.base64,
      },
    });
  }

  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 32768,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  const elapsedMs = Date.now() - start;
  const candidate = data?.candidates?.[0];
  const rawText = candidate?.content?.parts?.[0]?.text ?? "";
  const finishReason = candidate?.finishReason;
  const usage = data?.usageMetadata ?? {};

  const promptTokens = usage.promptTokenCount ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? 0;
  const totalTokens = usage.totalTokenCount ?? promptTokens + outputTokens;

  const costUsd =
    (promptTokens / 1e6) * GEMINI_PRICING.inputPer1M +
    (outputTokens / 1e6) * GEMINI_PRICING.outputPer1M;
  const costJpy = costUsd * GEMINI_PRICING.usdToJpy;

  const allRows: OcrRow[] = [];
  for (const file of request.files) {
    const rows = parseTsvToRows(rawText, file.name);
    allRows.push(...rows);
  }

  // If parsing failed, still return empty rows but keep raw text
  if (allRows.length === 0) {
    const fallbackRows = parseTsvToRows(rawText);
    allRows.push(...fallbackRows);
  }

  return {
    rawText,
    rows: allRows,
    usage: {
      promptTokens,
      outputTokens,
      totalTokens,
      elapsedMs,
      costUsd,
      costJpy,
    },
    finishReason,
  };
}

export { exportToGoogleSheets } from "./sheets";
