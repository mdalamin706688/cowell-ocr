import type { OcrRow } from "@cowell/shared";
import { compressImage, fileToBase64 } from "./ocr";
import { imageFileErrorMessage, isImageFile } from "./image-file";

/** Stronger compression — one process can exceed 100 row photos */
const ROW_PHOTO_MAX_PX = 720;
const ROW_PHOTO_QUALITY = 0.65;

export interface RowPhotoPayload {
  photoBase64: string;
  photoMimeType: string;
  photoUrl: string;
}

export function countRowsWithPhotos(rows: OcrRow[]): number {
  return rows.filter((row) => row.photoBase64 && row.photoMimeType).length;
}

/** Compress a user-selected row photo for draft storage and Sheets export */
export async function prepareRowPhoto(file: File): Promise<RowPhotoPayload> {
  if (!isImageFile(file)) {
    throw new Error(imageFileErrorMessage(file.name));
  }

  try {
    const { blob, previewUrl } = await compressImage(file, ROW_PHOTO_MAX_PX, ROW_PHOTO_QUALITY);
    const photoBase64 = await fileToBase64(blob);

    return {
      photoBase64,
      photoMimeType: "image/jpeg",
      photoUrl: previewUrl,
    };
  } catch {
    throw new Error(imageFileErrorMessage(file.name));
  }
}
