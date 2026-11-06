import type { PDFDocumentProxy } from "pdfjs-dist";
import { getBasePath } from "./client-auth";
import { copy } from "./copy";

export interface PdfRasterOptions {
  maxPx: number;
  quality: number;
  onPage?: (done: number, total: number) => void;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    );
  });
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${getBasePath()}/pdf.worker.min.mjs`;
  return pdfjs;
}

function isPasswordError(err: unknown): boolean {
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  const message = err instanceof Error ? err.message : String(err);
  return name === "PasswordException" || /password/i.test(message);
}

/** Rasterize each PDF page to a JPEG that Gemini OCR can read under the Lambda body limit. */
export async function pdfToJpegPages(
  pdfBytes: ArrayBuffer,
  options: PdfRasterOptions
): Promise<Blob[]> {
  const { maxPx, quality, onPage } = options;
  const pdfjs = await loadPdfjs();
  let pdf: PDFDocumentProxy | null = null;

  try {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
    pdf = await loadingTask.promise;
  } catch (err) {
    if (isPasswordError(err)) {
      throw new Error(copy.errors.ocrPdfProtected);
    }
    throw new Error(copy.errors.ocrPdfFailed);
  }

  try {
    const pages: Blob[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(maxPx / unscaled.width, maxPx / unscaled.height, 2.2);
      const viewport = page.getViewport({ scale: Math.max(scale, 0.5) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error(copy.errors.ocrPdfFailed);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      pages.push(await canvasToJpegBlob(canvas, quality));
      canvas.width = 0;
      canvas.height = 0;
      onPage?.(i, pdf.numPages);
    }
    return pages;
  } catch (err) {
    if (err instanceof Error && err.message === copy.errors.ocrPdfProtected) throw err;
    if (err instanceof Error && err.message === copy.errors.ocrPdfFailed) throw err;
    throw new Error(copy.errors.ocrPdfFailed);
  } finally {
    await pdf?.destroy();
  }
}

export function isPdfUpload(mimeType: string, name: string): boolean {
  return mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}
