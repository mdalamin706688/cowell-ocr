import { compressImage } from "./ocr";
import { copy } from "./copy";
import { isPdfUpload, pdfToJpegPages } from "./pdf-pages";

/** Lambda Function URL / sync invoke body limit is 6MB. Leave room for headers + prompt. */
export const LAMBDA_SAFE_BODY_BYTES = 5_200_000;

export interface OcrFilePart {
  blob: Blob;
  name: string;
  mimeType: string;
}

interface SourceFile {
  base64: string;
  mimeType: string;
  name: string;
}

const RASTER_PASSES = [
  { maxPx: 1600, quality: 0.72 },
  { maxPx: 1280, quality: 0.58 },
  { maxPx: 1024, quality: 0.46 },
] as const;

export function estimateOcrBodyBytes(files: OcrFilePart[], prompt: string): number {
  const promptBytes = new TextEncoder().encode(prompt).length;
  const fileBytes = files.reduce(
    (sum, file) => sum + file.blob.size + file.name.length + 220,
    0
  );
  return 2048 + promptBytes + fileBytes;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function stemName(name: string): string {
  return name.replace(/\.pdf$/i, "") || "survey";
}

function pageFileName(original: string, page: number, total: number): string {
  const pad = String(page).padStart(String(total).length, "0");
  return `${stemName(original)}_p${pad}.jpg`;
}

async function recompressImage(
  blob: Blob,
  name: string,
  maxPx: number,
  quality: number
): Promise<OcrFilePart> {
  const file = new File([blob], name, { type: blob.type || "image/jpeg" });
  const { blob: next } = await compressImage(file, maxPx, quality);
  return { blob: next, name: name.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg" };
}

async function rasterizePdf(
  source: OcrFilePart,
  pass: (typeof RASTER_PASSES)[number],
  onPage?: (done: number, total: number) => void
): Promise<OcrFilePart[]> {
  const bytes = await source.blob.arrayBuffer();
  const pages = await pdfToJpegPages(bytes, { ...pass, onPage });
  return pages.map((blob, index) => ({
    blob,
    name: pageFileName(source.name, index + 1, pages.length),
    mimeType: "image/jpeg",
  }));
}

function packBatches(files: OcrFilePart[], prompt: string): OcrFilePart[][] {
  const batches: OcrFilePart[][] = [];
  let current: OcrFilePart[] = [];

  const flush = () => {
    if (current.length) batches.push(current);
    current = [];
  };

  for (const file of files) {
    if (file.blob.size > LAMBDA_SAFE_BODY_BYTES) {
      throw new Error(copy.errors.ocrPayloadTooLarge);
    }
    const next = [...current, file];
    if (current.length && estimateOcrBodyBytes(next, prompt) > LAMBDA_SAFE_BODY_BYTES) {
      flush();
    }
    current.push(file);
  }
  flush();
  return batches.length ? batches : [[]];
}

/**
 * Fit survey files under the Lambda ~6MB request cap:
 * rasterize oversized PDFs to JPEGs, recompress images if needed, then batch POSTs.
 * Original files in the survey state are unchanged (Drive still gets the source PDF).
 */
export async function prepareOcrBatches(
  sources: SourceFile[],
  prompt: string,
  onProgress?: (percent: number, detail?: string) => void
): Promise<OcrFilePart[][]> {
  let files: OcrFilePart[] = sources.map((file) => ({
    blob: base64ToBlob(file.base64, file.mimeType),
    name: file.name,
    mimeType: file.mimeType,
  }));

  if (estimateOcrBodyBytes(files, prompt) <= LAMBDA_SAFE_BODY_BYTES) {
    return [files];
  }

  onProgress?.(3, "PDF を読み取り用画像に変換しています");

  const expanded: OcrFilePart[] = [];
  for (const file of files) {
    if (!isPdfUpload(file.mimeType, file.name)) {
      expanded.push(file);
      continue;
    }
    expanded.push(
      ...(await rasterizePdf(file, RASTER_PASSES[0], (done, total) => {
        onProgress?.(
          3 + (5 * done) / Math.max(1, total),
          `PDF ${done} / ${total} ページ`
        );
      }))
    );
  }
  files = expanded;

  for (const pass of RASTER_PASSES) {
    if (estimateOcrBodyBytes(files, prompt) <= LAMBDA_SAFE_BODY_BYTES) break;
    const next: OcrFilePart[] = [];
    for (const file of files) {
      if (file.mimeType.startsWith("image/")) {
        next.push(await recompressImage(file.blob, file.name, pass.maxPx, pass.quality));
      } else {
        next.push(file);
      }
    }
    files = next;
  }

  const oversized = files.filter((file) => file.blob.size > LAMBDA_SAFE_BODY_BYTES);
  if (oversized.length) {
    throw new Error(copy.errors.ocrPayloadTooLarge);
  }

  return packBatches(files, prompt);
}
