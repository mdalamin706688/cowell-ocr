"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OcrRow } from "@cowell/shared";
import { SURVEY_COLUMNS } from "@cowell/shared";
import {
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
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { prepareRowPhoto } from "@/lib/row-photo";

interface ReviewTableProps {
  rows: OcrRow[];
  onRowsChange: (rows: OcrRow[]) => void;
  query: string;
  /** Taller scroll area when review focus/maximize is on */
  expanded?: boolean;
}

const TEXT_FIELDS = [
  "floor",
  "location",
  "fixtureModel",
  "existingProduct",
  "quantity",
  "notes",
] as const;

type DataColKey =
  | "floor"
  | "location"
  | "fixtureModel"
  | "existingProduct"
  | "photo"
  | "quantity"
  | "notes";

const DATA_COLUMNS: Array<{
  key: DataColKey;
  label: (typeof SURVEY_COLUMNS)[number];
  field?: (typeof TEXT_FIELDS)[number];
}> = [
  { key: "floor", label: "フロア", field: "floor" },
  { key: "location", label: "設置場所", field: "location" },
  { key: "fixtureModel", label: "器具品番", field: "fixtureModel" },
  { key: "existingProduct", label: "既設商品名", field: "existingProduct" },
  { key: "photo", label: "写真" },
  { key: "quantity", label: "数量", field: "quantity" },
  { key: "notes", label: "備考", field: "notes" },
];

const INDEX_COL_WIDTH = 44;
const ACTION_COL_WIDTH = 44;
const COL_WIDTH_STORAGE_KEY = "cowell_review_col_widths_v2";

/** Floor stays compact; product name + notes get room so text is not clipped. */
const DEFAULT_COL_WIDTHS: Record<DataColKey, number> = {
  floor: 48,
  location: 128,
  fixtureModel: 180,
  existingProduct: 280,
  photo: 148,
  quantity: 56,
  notes: 300,
};

const MIN_COL_WIDTHS: Record<DataColKey, number> = {
  floor: 40,
  location: 80,
  fixtureModel: 100,
  existingProduct: 140,
  photo: 132,
  quantity: 48,
  notes: 160,
};

function readStoredColWidths(): Record<DataColKey, number> {
  if (typeof window === "undefined") return DEFAULT_COL_WIDTHS;
  try {
    const raw = window.localStorage.getItem(COL_WIDTH_STORAGE_KEY);
    if (!raw) return DEFAULT_COL_WIDTHS;
    const parsed = JSON.parse(raw) as Partial<Record<DataColKey, number>>;
    return DATA_COLUMNS.reduce(
      (acc, { key }) => {
        const next = Number(parsed[key]);
        acc[key] = Number.isFinite(next)
          ? Math.max(MIN_COL_WIDTHS[key], Math.round(next))
          : DEFAULT_COL_WIDTHS[key];
        return acc;
      },
      { ...DEFAULT_COL_WIDTHS }
    );
  } catch {
    return DEFAULT_COL_WIDTHS;
  }
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

function rowDisplayName(row: OcrRow, rowNumber: number): string {
  const product = row.existingProduct?.trim();
  if (product) return product;
  const model = row.fixtureModel?.trim();
  if (model) return model;
  const location = row.location?.trim();
  if (location) return location;
  return copy.table.rowFallback(rowNumber);
}

export function ReviewTable({ rows, onRowsChange, query, expanded = false }: ReviewTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; label: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(100);
  const [colWidths, setColWidths] = useState<Record<DataColKey, number>>(DEFAULT_COL_WIDTHS);
  const [resizingCol, setResizingCol] = useState<DataColKey | null>(null);
  const colWidthsReady = useRef(false);

  useEffect(() => {
    setColWidths(readStoredColWidths());
    colWidthsReady.current = true;
  }, []);

  useEffect(() => {
    if (!colWidthsReady.current) return;
    window.localStorage.setItem(COL_WIDTH_STORAGE_KEY, JSON.stringify(colWidths));
  }, [colWidths]);

  useEffect(() => {
    if (!resizingCol) return;
    const onMove = (event: PointerEvent) => {
      setColWidths((prev) => ({
        ...prev,
        [resizingCol]: Math.max(
          MIN_COL_WIDTHS[resizingCol],
          prev[resizingCol] + event.movementX
        ),
      }));
    };
    const onUp = () => setResizingCol(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingCol]);

  const tableMinWidth =
    INDEX_COL_WIDTH + ACTION_COL_WIDTH + DATA_COLUMNS.reduce((sum, col) => sum + colWidths[col.key], 0);

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

      <div
        className={cn(expanded ? "review-table-root" : "space-y-3")}
        data-resizing={resizingCol ? "on" : "off"}
      >
        <div
          className={cn(
            "rounded-lg border border-border/80 overflow-hidden bg-card",
            expanded && "review-table-frame"
          )}
        >
          <div
            className={cn(
              "overflow-auto",
              expanded ? "review-table-scroll" : "max-h-[min(28rem,60vh)]"
            )}
          >
            <table
              className="text-sm"
              style={{ tableLayout: "fixed", width: tableMinWidth, minWidth: tableMinWidth }}
            >
              <colgroup>
                <col style={{ width: INDEX_COL_WIDTH }} />
                {DATA_COLUMNS.map((col) => (
                  <col key={col.key} style={{ width: colWidths[col.key] }} />
                ))}
                <col style={{ width: ACTION_COL_WIDTH }} />
              </colgroup>
              <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="px-2 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    #
                  </th>
                  {DATA_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="relative px-2 py-2.5 text-left text-xs font-medium text-muted-foreground"
                    >
                      <span className="block truncate pr-2">{col.label}</span>
                      <button
                        type="button"
                        className="review-col-resize"
                        data-active={resizingCol === col.key ? "on" : "off"}
                        aria-label={`${copy.table.resizeColumn}: ${col.label}`}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                          setResizingCol(col.key);
                        }}
                      />
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={DATA_COLUMNS.length + 2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {copy.table.noMatches}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const absoluteIndex = safePage * pageSize + idx;
                    const displayName = rowDisplayName(row, absoluteIndex + 1);
                    return (
                      <tr
                        key={`${row.id}-${absoluteIndex}`}
                        className="table-row-hover border-b border-border/50 last:border-0"
                      >
                        <td className="px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
                          {absoluteIndex + 1}
                        </td>

                        {DATA_COLUMNS.map((col) => {
                          if (col.key === "photo") {
                            return (
                              <td key={col.key} className="px-1 py-1 align-middle">
                                <div className="flex items-center gap-1 min-w-0">
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
                                    className="h-9 min-w-0 shrink px-2 text-xs"
                                    disabled={uploadingRowId === row.id}
                                    onClick={() => openPhotoPicker(row.id)}
                                  >
                                    {uploadingRowId === row.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ImagePlus className="h-3.5 w-3.5" />
                                    )}
                                    <span className="sr-only sm:not-sr-only truncate">
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
                            );
                          }

                          const field = col.field!;
                          const wrap = col.key === "existingProduct" || col.key === "notes" || col.key === "fixtureModel";
                          return (
                            <td key={col.key} className="px-1 py-1 align-top">
                              {wrap ? (
                                <textarea
                                  value={row[field]}
                                  title={row[field]}
                                  rows={2}
                                  onChange={(e) => updateRow(row.id, field, e.target.value)}
                                  className="min-h-9 w-full min-w-0 resize-none rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm leading-snug shadow-none outline-none focus-visible:border-border focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-lumen/12"
                                />
                              ) : (
                                <Input
                                  value={row[field]}
                                  title={row[field]}
                                  onChange={(e) => updateRow(row.id, field, e.target.value)}
                                  className={cn(
                                    "h-9 min-w-0 text-sm border-transparent bg-transparent shadow-none focus-visible:bg-background focus-visible:border-border",
                                    col.key === "floor" && "px-1",
                                    col.key === "quantity" && "tabular-nums px-1.5"
                                  )}
                                />
                              )}
                            </td>
                          );
                        })}

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

          <div className="shrink-0 border-t border-border px-4 py-2.5">
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

      <OverlayDialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        label={previewPhoto?.label}
        tone="media"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-eyebrow text-lumen">{copy.table.photoPreview}</p>
            <p className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
              {previewPhoto?.label}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-full px-3.5 text-sm font-semibold"
            onClick={() => setPreviewPhoto(null)}
          >
            <X className="h-3.5 w-3.5" />
            {copy.table.close}
          </Button>
        </div>
        <div
          className="relative flex min-h-[min(48vh,26rem)] max-h-[min(70vh,40rem)] items-center justify-center overflow-hidden p-5 sm:p-7"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, hsl(var(--lumen) / 0.06) 0%, transparent 62%), linear-gradient(180deg, hsl(var(--muted) / 0.55) 0%, hsl(var(--card)) 100%)",
          }}
        >
          {previewPhoto ? (
            <div className="relative rounded-xl border border-border/70 bg-card p-2 shadow-[0_12px_40px_-16px_rgba(21,26,74,0.35)] sm:p-2.5">
              <img
                src={previewPhoto.src}
                alt={previewPhoto.label}
                className="h-auto max-h-[min(60vh,34rem)] w-auto max-w-[min(86vw,48rem)] rounded-lg object-contain"
              />
            </div>
          ) : null}
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        labelledBy="delete-row-title"
      >
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/70 via-destructive to-destructive/60"
            aria-hidden
          />
          <div className="px-6 pb-2 pt-7 text-center sm:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/[0.08] text-destructive ring-1 ring-inset ring-destructive/15">
              <Trash2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2
              id="delete-row-title"
              className="mt-4 text-lg font-semibold tracking-tight text-foreground"
            >
              {copy.table.deleteRowTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
              {copy.table.deleteRowBody}
            </p>
          </div>

          {deleteTarget?.label ? (
            <div className="px-6 pt-2 sm:px-8">
              <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-muted/60 to-card px-5 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
                  {copy.table.deleteRowTarget}
                </p>
                <div
                  className="mx-auto mt-3 h-px w-10 bg-gradient-to-r from-transparent via-destructive/50 to-transparent"
                  aria-hidden
                />
                <p className="mt-3 break-words text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                  {deleteTarget.label}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2.5 px-6 py-6 sm:flex-row sm:justify-center sm:px-8">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 sm:flex-none sm:min-w-[8rem]"
              onClick={() => setDeleteTarget(null)}
            >
              {copy.table.deleteRowCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 flex-1 sm:flex-none sm:min-w-[8rem]"
              onClick={confirmDeleteRow}
              autoFocus
            >
              <Trash2 className="h-4 w-4" />
              {copy.table.deleteRowConfirm}
            </Button>
          </div>
        </div>
      </OverlayDialog>
    </>
  );
}
