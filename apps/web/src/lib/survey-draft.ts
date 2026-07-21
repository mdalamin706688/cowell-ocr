import type {
  OcrResult,
  OcrRow,
  QualityPreset,
  UploadedFile,
  WorkflowStep,
} from "@cowell/shared";
import { DEFAULT_OCR_PROMPT } from "@cowell/shared";

const DB_NAME = "cowell-ocr";
const DB_VERSION = 1;
const STORE = "survey-draft";
const DRAFT_KEY = "current";

export interface SurveyDraft {
  step: WorkflowStep;
  files: UploadedFile[];
  quality: QualityPreset;
  prompt: string;
  ocrResult: OcrResult | null;
  rows: OcrRow[];
  exportUrl: string | null;
  savedAt: number;
}

export const emptySurveyDraft = (): Omit<SurveyDraft, "savedAt"> => ({
  step: "upload",
  files: [],
  quality: "standard",
  prompt: DEFAULT_OCR_PROMPT,
  ocrResult: null,
  rows: [],
  exportUrl: null,
});

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

function previewFromBase64(base64: string, mimeType: string): string | undefined {
  if (!mimeType.startsWith("image/")) return undefined;
  return `data:${mimeType};base64,${base64}`;
}

/** Restore blob preview URLs lost after refresh. */
export function reviveDraftFiles(files: UploadedFile[]): UploadedFile[] {
  return files.map((file) => ({
    ...file,
    previewUrl: file.previewUrl || previewFromBase64(file.base64, file.mimeType),
  }));
}

/** Mid-flight steps are not safe to resume; snap to a stable step. */
export function stabilizeStep(
  step: WorkflowStep,
  hasResult: boolean
): WorkflowStep {
  if (step === "processing") return hasResult ? "review" : "upload";
  if (step === "export") return hasResult ? "review" : "upload";
  return step;
}

export async function loadSurveyDraft(): Promise<SurveyDraft | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(DRAFT_KEY);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
      req.onsuccess = () => {
        const draft = (req.result as SurveyDraft | undefined) ?? null;
        resolve(draft);
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function saveSurveyDraft(
  draft: Omit<SurveyDraft, "savedAt">
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const payload: SurveyDraft = {
    ...draft,
    // Drop ephemeral blob: URLs — rebuilt from base64 on restore
    files: draft.files.map(({ previewUrl: _p, ...file }) => file),
    savedAt: Date.now(),
  };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload, DRAFT_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    });
  } catch {
    // Quota / private mode — keep in-memory only
  }
}

export async function clearSurveyDraft(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(DRAFT_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
    });
  } catch {
    // ignore
  }
}
