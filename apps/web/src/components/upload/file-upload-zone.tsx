"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileImage, FileText, ImagePlus, X } from "lucide-react";
import {
  QUALITY_PRESETS,
  type QualityPreset,
  type UploadedFile,
} from "@cowell/shared";
import { cn, formatBytes, generateId } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { compressImage, fileToBase64 } from "@/lib/ocr";
import { IMAGE_DROPZONE_ACCEPT, isImageFile } from "@/lib/image-file";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  quality: QualityPreset;
  onQualityChange: (q: QualityPreset) => void;
}

export function FileUploadZone({
  files,
  onFilesChange,
  quality,
  onQualityChange,
}: FileUploadZoneProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(
    async (accepted: File[]) => {
      setLoading(true);
      setError(null);
      const preset = QUALITY_PRESETS[quality];
      const newFiles: UploadedFile[] = [];

      for (const file of accepted) {
        if (file.size > 20 * 1024 * 1024) {
          setError(`${file.name} が 20MB を超えています`);
          continue;
        }

        const originalSizeKB = file.size / 1024;

        if (file.type === "application/pdf") {
          const base64 = await fileToBase64(file);
          newFiles.push({
            id: generateId(),
            name: file.name,
            mimeType: "application/pdf",
            originalSizeKB,
            compressedSizeKB: originalSizeKB,
            base64,
          });
        } else if (isImageFile(file)) {
          try {
            const { blob, width, height, previewUrl } = await compressImage(
              file,
              preset.maxPx,
              preset.quality
            );
            const base64 = await fileToBase64(blob);
            newFiles.push({
              id: generateId(),
              name: file.name,
              mimeType: "image/jpeg",
              originalSizeKB,
              compressedSizeKB: blob.size / 1024,
              width,
              height,
              previewUrl,
              base64,
            });
          } catch {
            setError(`${file.name} の処理に失敗しました。別の画像形式をお試しください。`);
          }
        } else if (!file.type || file.type === "application/octet-stream") {
          setError(`${file.name} は対応していない形式です。画像または PDF を選択してください。`);
        }
      }

      onFilesChange([...files, ...newFiles]);
      setLoading(false);
    },
    [files, onFilesChange, quality]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: {
      ...IMAGE_DROPZONE_ACCEPT,
      "application/pdf": [".pdf"],
    },
    multiple: true,
    disabled: loading,
  });

  const removeFile = (id: string) => {
    const removed = files.find((f) => f.id === id);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "ui-upload cursor-pointer",
          isDragActive && "ui-upload-active",
          loading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/80 border border-lumen/15 shadow-sm">
          <ImagePlus className="h-5 w-5 text-lumen" />
        </div>
        <p className="font-display text-sm font-semibold">
          {isDragActive ? copy.upload.dropActive : copy.upload.drop}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {copy.upload.formats}
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-label">{copy.upload.quality}</span>
        <Select value={quality} onValueChange={(v) => onQualityChange(v as QualityPreset)}>
          <SelectTrigger className="h-10 w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS.minimal][]).map(
              ([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3"
            >
              {file.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {file.mimeType === "application/pdf" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <FileImage className="h-4 w-4" />
                  )}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(file.originalSizeKB)} → {formatBytes(file.compressedSizeKB)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
