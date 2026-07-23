import type { OcrRow } from "@cowell/shared";
import { SURVEY_COLUMNS } from "@cowell/shared";
import { generateId } from "./utils";

/** Parse TSV OCR output into structured survey rows */
export function parseTsvToRows(text: string, sourceFile?: string): OcrRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const tabLines = lines.filter((l) => l.includes("\t"));
  if (tabLines.length < 2) return [];

  const header = tabLines[0].split("\t").map((h) => h.trim());
  const dataLines = tabLines.slice(1);

  const colMap: Record<string, keyof OcrRow> = {};
  header.forEach((h, i) => {
    const lower = h.toLowerCase();
    if (h.includes("フロア") || lower.includes("floor")) colMap[i] = "floor";
    else if (h.includes("設置") || h.includes("場所") || lower.includes("location"))
      colMap[i] = "location";
    else if (h.includes("器具") || h.includes("品番") || lower.includes("model"))
      colMap[i] = "fixtureModel";
    else if (h.includes("既設") || h.includes("商品") || lower.includes("product"))
      colMap[i] = "existingProduct";
    else if (h.includes("数量") || lower.includes("qty") || lower.includes("quantity"))
      colMap[i] = "quantity";
    else if (h.includes("備考") || lower.includes("note"))
      colMap[i] = "notes";
  });

  // Fallback column order if headers don't match
  type OcrCellKey = "floor" | "location" | "fixtureModel" | "existingProduct" | "quantity" | "notes";
  const fallbackKeys: OcrCellKey[] = [
    "floor",
    "location",
    "fixtureModel",
    "existingProduct",
    "quantity",
    "notes",
  ];

  return dataLines.map((line) => {
    const cells = line.split("\t");
    const row: OcrRow = {
      id: generateId(),
      floor: "",
      location: "",
      fixtureModel: "",
      existingProduct: "",
      quantity: "",
      notes: "",
      sourceFile,
    };

    if (Object.keys(colMap).length > 0) {
      cells.forEach((cell, i) => {
        const key = colMap[i];
        if (key && key !== "id" && key !== "photoUrl" && key !== "confidence" && key !== "sourceFile") {
          row[key] = cell.trim();
        }
      });
    } else {
      fallbackKeys.forEach((key, i) => {
        if (cells[i]) row[key] = cells[i].trim();
      });
    }

    return row;
  });
}

export function rowsToTsv(rows: OcrRow[]): string {
  const header = [...SURVEY_COLUMNS].join("\t");
  const body = rows
    .map((r) =>
      [
        r.floor,
        r.location,
        r.fixtureModel,
        r.existingProduct,
        r.photoBase64 ? "添付済み" : "",
        r.quantity,
        r.notes,
      ].join("\t")
    )
    .join("\n");
  return `${header}\n${body}`;
}

export async function compressImage(
  file: File,
  maxPx: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return await rasterizeBitmap(bitmap, maxPx, quality);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall back to <img> for formats createImageBitmap cannot decode in this browser
    }
  }

  return compressImageWithElement(file, maxPx, quality);
}

function scaleDimensions(
  width: number,
  height: number,
  maxPx: number
): { width: number; height: number } {
  let w = width;
  let h = height;
  if (w > maxPx || h > maxPx) {
    if (w >= h) {
      h = Math.round(h * (maxPx / w));
      w = maxPx;
    } else {
      w = Math.round(w * (maxPx / h));
      h = maxPx;
    }
  }
  return { width: w, height: h };
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/jpeg",
      quality
    );
  });
}

async function rasterizeBitmap(
  source: ImageBitmap,
  maxPx: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> {
  const { width: w, height: h } = scaleDimensions(source.width, source.height, maxPx);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(source, 0, 0, w, h);
  const blob = await canvasToJpegBlob(canvas, quality);
  return { blob, width: w, height: h, previewUrl: URL.createObjectURL(blob) };
}

function compressImageWithElement(
  file: File,
  maxPx: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width: w, height: h } = scaleDimensions(img.width, img.height, maxPx);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvasToJpegBlob(canvas, quality)
        .then((blob) => {
          URL.revokeObjectURL(url);
          resolve({
            blob,
            width: w,
            height: h,
            previewUrl: URL.createObjectURL(blob),
          });
        })
        .catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
