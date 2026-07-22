export type QualityPreset = "minimal" | "light" | "standard" | "high";

export interface QualityConfig {
  maxPx: number;
  quality: number;
  label: string;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  minimal: { maxPx: 640, quality: 0.68, label: "最軽量 640px" },
  light: { maxPx: 800, quality: 0.75, label: "軽量 800px" },
  standard: { maxPx: 1024, quality: 0.82, label: "標準 1024px" },
  high: { maxPx: 1400, quality: 0.9, label: "高品質 1400px" },
};

export const GEMINI_PRICING = {
  inputPer1M: 1.5,
  outputPer1M: 9.0,
  usdToJpy: 155,
} as const;

export const DEFAULT_OCR_PROMPT =
  "画像内の表をTSV形式（タブ区切り、1行目はヘッダー）で出力してください。表が複数ある場合は空行で区切ってください。表以外のテキストはそのまま出力してください。";

/** 現調スプレッドシート列定義 */
export const SURVEY_COLUMNS = [
  "フロア",
  "設置場所",
  "器具品番",
  "既設商品名",
  "写真",
  "数量",
  "備考",
] as const;

export type SurveyColumn = (typeof SURVEY_COLUMNS)[number];

export interface UploadedFile {
  id: string;
  name: string;
  mimeType: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width?: number;
  height?: number;
  previewUrl?: string;
  /** Base64 payload ready for Gemini API */
  base64: string;
}

export interface OcrRow {
  id: string;
  floor: string;
  location: string;
  fixtureModel: string;
  existingProduct: string;
  /** UI preview URL (blob/data); not persisted in draft */
  photoUrl?: string;
  /** Persisted photo bytes for spreadsheet export */
  photoBase64?: string;
  photoMimeType?: string;
  quantity: string;
  notes: string;
  confidence?: number;
  sourceFile?: string;
}

export interface OcrUsage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  elapsedMs: number;
  costUsd: number;
  costJpy: number;
}

export interface OcrResult {
  rawText: string;
  rows: OcrRow[];
  usage: OcrUsage;
  finishReason?: string;
}

export interface ExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
}

export type WorkflowStep = "upload" | "processing" | "review" | "export" | "complete";
