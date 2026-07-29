"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OcrRow } from "@cowell/shared";
import { SURVEY_COLUMNS } from "@cowell/shared";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Trash2,
  Table2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { prepareRowPhoto } from "@/lib/row-photo";

interface ReviewTableProps {
  rows: OcrRow[];
  onRowsChange: (rows: OcrRow[]) => void;
  query: string;
}

const TEXT_FIELDS = [
  "floor",
  "location",
  "fixtureModel",
  "existingProduct",
  "quantity",
  "notes",
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

function rowDisplayName(row: OcrRow, rowNumber: number): string {
  const product = row.existingProduct?.trim();
  if (product) return product;
  const model = row.fixtureModel?.trim();
  if (model) return model;
  const location = row.location?.trim();
  if (location) return location;
  return copy.table.rowFallback(rowNumber);
}

export function ReviewTable({ rows, onRowsChange, query }: ReviewTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; label: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.floor, r.location, r.fixtureModel, r.existingProduct, r.quantity, r.notes]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = filtered.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(filtered.length, (safePage + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [query, pageSize]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  useEffect(() => {
    if (!previewPhoto && !deleteTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPreviewPhoto(null);
      setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewPhoto, deleteTarget]);

  const updateRow = (id: string, field: keyof OcrRow, value: string) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const confirmDeleteRow = () => {
    if (!deleteTarget) return;
    onRowsChange(rows.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const clearRowPhoto = (id: string) => {
    onRowsChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        if (r.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(r.photoUrl);
        return {
          ...r,
          photoUrl: undefined,
          photoBase64: undefined,
          photoMimeType: undefined,
        };
      })
    );
  };

  const openPhotoPicker = (rowId: string) => {
    setActiveRowId(rowId);
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (file: File | undefined) => {
    const rowId = activeRowId;
    setActiveRowId(null);
    if (!file || !rowId) return;

    setUploadingRowId(rowId);
    try {
      const photo = await prepareRowPhoto(file);
      onRowsChange(
        rows.map((r) => {
          if (r.id !== rowId) return r;
          if (r.photoUrl?.startsWith("blob:")) URL.revokeObjectURL(r.photoUrl);
          return { ...r, ...photo };
        })
      );
    } finally {
      setUploadingRowId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
        <Table2 className="h-6 w-6 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">{copy.table.empty}</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handlePhotoSelected(e.target.files?.[0])}
      />

      <div className="space-y-3">
        <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
          <div className="max-h-[min(28rem,60vh)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">
                    #
                  </th>
                  {SURVEY_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className={cn(
                        "px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                        col === "写真" && "w-36",
                        col === "数量" && "w-16"
                      )}
                    >
                      {col}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={SURVEY_COLUMNS.length + 2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {copy.table.noMatches}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const absoluteIndex = safePage * pageSize + idx;
                    const displayName = rowDisplayName(row, absoluteIndex + 1);
                    return (
                      <tr
                        key={row.id}
                        className="table-row-hover border-b border-border/50 last:border-0"
                      >
                        <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
                          {absoluteIndex + 1}
                        </td>

                        {TEXT_FIELDS.slice(0, 4).map((field) => (
                          <td key={field} className="px-1 py-1">
                            <Input
                              value={row[field]}
                              onChange={(e) => updateRow(row.id, field, e.target.value)}
                              className="h-9 text-sm border-transparent bg-transparent shadow-none focus-visible:bg-background focus-visible:border-border"
                            />
                          </td>
                        ))}

                        <td className="px-1 py-1 align-middle">
                          <div className="flex items-center gap-1 min-w-[8.5rem]">
                            {row.photoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    src: row.photoUrl!,
                                    label: displayName,
                                  })
                                }
                                className="shrink-0 rounded-md border border-border/60 hover:border-lumen/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen/30"
                                aria-label={`${copy.table.photoAttached}: ${displayName}`}
                              >
                                <img
                                  src={row.photoUrl}
                                  alt={displayName}
                                  className="h-9 w-9 rounded-md object-cover"
                                />
                              </button>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 shrink-0 px-2 text-xs"
                              disabled={uploadingRowId === row.id}
                              onClick={() => openPhotoPicker(row.id)}
                            >
                              {uploadingRowId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ImagePlus className="h-3.5 w-3.5" />
                              )}
                              <span className="sr-only sm:not-sr-only">
                                {row.photoUrl ? copy.table.changePhoto : copy.table.attachPhoto}
                              </span>
                            </Button>
                            {row.photoUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-muted-foreground/50 hover:text-destructive"
                                onClick={() => clearRowPhoto(row.id)}
                                aria-label={copy.table.removePhoto}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </td>

                        {TEXT_FIELDS.slice(4).map((field) => (
                          <td key={field} className="px-1 py-1">
                            <Input
                              value={row[field]}
                              onChange={(e) => updateRow(row.id, field, e.target.value)}
                              className={cn(
                                "h-9 text-sm border-transparent bg-transparent shadow-none focus-visible:bg-background focus-visible:border-border",
                                field === "quantity" && "w-16 tabular-nums"
                              )}
                            />
                          </td>
                        ))}

                        <td className="px-1 py-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground/40 hover:text-destructive"
                            aria-label={copy.table.deleteRow}
                            onClick={() =>
                              setDeleteTarget({ id: row.id, label: displayName })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-h-8 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="text-xs leading-none text-muted-foreground">
                  {copy.table.range(from, to, filtered.length)}
                  {query.trim() && filtered.length !== rows.length
                    ? ` · ${copy.table.filteredOf(rows.length)}`
                    : ""}
                </span>
                <span className="leading-none">{copy.table.pageSize}</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {copy.table.prev}
                </Button>
                <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  {copy.table.next}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={previewPhoto.label}
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {previewPhoto.label}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 px-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setPreviewPhoto(null)}
              >
                <X className="h-3.5 w-3.5" />
                {copy.table.close}
              </Button>
            </div>
            <div className="max-h-[calc(90vh-2.75rem)] overflow-auto bg-black/20">
              <img
                src={previewPhoto.src}
                alt={previewPhoto.label}
                className="h-auto max-h-[calc(90vh-3rem)] w-auto max-w-[90vw] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-row-title"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border border-destructive/25 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-destructive/15 bg-destructive/[0.06] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p id="delete-row-title" className="text-base font-semibold text-foreground">
                    {copy.table.deleteRowTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.table.deleteRowBody}</p>
                  <p className="mt-2 truncate text-sm font-medium text-destructive/90">
                    {deleteTarget.label}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                {copy.table.deleteRowCancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteRow}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {copy.table.deleteRowConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
