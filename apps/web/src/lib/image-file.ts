const IMAGE_EXTENSION = /\.(avif|bmp|gif|heic|heif|ico|jfif|jpe?g|pjp(?:eg)?|png|svg|tiff?|webp)$/i;

/** True when the browser reports an image type or the filename looks like an image */
export function isImageFile(file: { name: string; type?: string }): boolean {
  const type = file.type?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return true;
  if (type === "application/octet-stream" || type === "") {
    return IMAGE_EXTENSION.test(file.name);
  }
  return false;
}

export function imageFileErrorMessage(fileName?: string): string {
  return fileName
    ? `${fileName} は画像として読み込めません。別の形式（JPEG · PNG など）をお試しください。`
    : "画像ファイルを選択してください";
}

/** Dropzone accept map — all image types, plus extension-only files from some cameras */
export const IMAGE_DROPZONE_ACCEPT = {
  "image/*": [],
  "application/octet-stream": [".heic", ".heif", ".jpg", ".jpeg", ".png"],
} as const;
