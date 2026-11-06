import { compressImage } from "./ocr";
import { copy } from "./copy";
import { isPdfUpload, pdfToJpegPages } from "./pdf-pages";

/** Lambda Function URL / sync invoke body limit is 6MB. Leave room for headers + prompt. */
export const LAMBDA_SAFE_BODY_BYTES = 5_200_000;

/**
 * Dense 現調 sheets have many rows per page. Too many pages in one Gemini call
 * truncates output (the large-PDF "fewer rows" bug). Keep batches small.
 */
const MAX_FILES_PER_BATCH = 4;

/** Only used when a single page itself is still over the Lambda cap. */
const OVERSIZE_PAGE_JPEG = { maxPx: 1600, quality: 0.78 } as const;
const JPEG_SHRINK_PASSES = [
  { maxPx: 1600, quality: 0.78 },
  { maxPx: 1400, quality: 0.7 },
  { maxPx: 1200, quality: 0.6 },
] as const;

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

function pageFileName(original: string, page: number, total: number, ext: string): string {
  const pad = String(page).padStart(String(total).length, "0");
  return `${stemName(original)}_p${pad}.${ext}`;
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

async function rasterizeOnePdfPage(source: OcrFilePart, pageLabel: string): Promise<OcrFilePart> {
  const bytes = await source.blob.arrayBuffer();
  const pages = await pdfToJpegPages(bytes, OVERSIZE_PAGE_JPEG);
  const blob = pages[0];
  if (!blob) throw new Error(copy.errors.ocrPdfFailed);
  return { blob, name: pageLabel.replace(/\.pdf$/i, ".jpg"), mimeType: "image/jpeg" };
}

async function fitPartUnderLimit(part: OcrFilePart): Promise<OcrFilePart> {
  if (part.blob.size <= LAMBDA_SAFE_BODY_BYTES) return part;

  let current = isPdfUpload(part.mimeType, part.name)
    ? await rasterizeOnePdfPage(part, part.name)
    : part;

  for (const pass of JPEG_SHRINK_PASSES) {
    if (current.blob.size <= LAMBDA_SAFE_BODY_BYTES) return current;
    if (!current.mimeType.startsWith("image/")) break;
    current = await recompressImage(current.blob, current.name, pass.maxPx, pass.quality);
  }

  if (current.blob.size > LAMBDA_SAFE_BODY_BYTES) {
    throw new Error(copy.errors.ocrPayloadTooLarge);
  }
  return current;
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
    const overSize =
      current.length > 0 && estimateOcrBodyBytes(next, prompt) > LAMBDA_SAFE_BODY_BYTES;
    const overCount = current.length >= MAX_FILES_PER_BATCH;
    if (overSize || overCount) flush();
    current.push(file);
  }
  flush();
  return batches.length ? batches : [[]];
}

async function expandPdf(source: OcrFilePart, onPage?: (done: number, total: number) => void): Promise<OcrFilePart[]> {
  const bytes = await source.blob.arrayBuffer();
  const pageBlobs = await pdfToJpegPages(bytes, {
    maxPx: OVERSIZE_PAGE_JPEG.maxPx,
    quality: OVERSIZE_PAGE_JPEG.quality,
    onPage,
  });
  const parts: OcrFilePart[] = [];
  for (let i = 0; i < pageBlobs.length; i++) {
    const name = pageFileName(source.name, i + 1, pageBlobs.length, "jpg");
    parts.push(
      await fitPartUnderLimit({
        blob: pageBlobs[i],
        name,
        mimeType: "image/jpeg",
      })
    );
  }
  return parts;
}

/**
 * Fit survey files under the Lambda ~6MB request cap without crushing quality:
 * render large PDFs to sharp page JPEGs, then send several small OCR requests.
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

  onProgress?.(3, "PDF をページごとに分割しています");

  const expanded: OcrFilePart[] = [];
  for (const file of files) {
    if (!isPdfUpload(file.mimeType, file.name)) {
      expanded.push(await fitPartUnderLimit(file));
      continue;
    }
    expanded.push(
      ...(await expandPdf(file, (done, total) => {
        onProgress?.(
          3 + (5 * done) / Math.max(1, total),
          `PDF ${done} / ${total} ページ`
        );
      }))
    );
  }

  return packBatches(expanded, prompt);
}
