import { compressImage, fileToBase64 } from "./ocr";

const ROW_PHOTO_MAX_PX = 1024;
const ROW_PHOTO_QUALITY = 0.82;

export interface RowPhotoPayload {
  photoBase64: string;
  photoMimeType: string;
  photoUrl: string;
}

/** Compress a user-selected row photo for draft storage and Sheets export */
export async function prepareRowPhoto(file: File): Promise<RowPhotoPayload> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }

  const { blob, previewUrl } = await compressImage(file, ROW_PHOTO_MAX_PX, ROW_PHOTO_QUALITY);
  const photoBase64 = await fileToBase64(blob);

  return {
    photoBase64,
    photoMimeType: "image/jpeg",
    photoUrl: previewUrl,
  };
}
