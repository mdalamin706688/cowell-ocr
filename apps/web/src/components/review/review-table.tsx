"use client";

import { useRef, useState } from "react";
import type { OcrRow } from "@cowell/shared";
import { SURVEY_COLUMNS } from "@cowell/shared";
import { ImagePlus, Loader2, Trash2, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { countRowsWithPhotos, prepareRowPhoto } from "@/lib/row-photo";

interface ReviewTableProps {
  rows: OcrRow[];
  onRowsChange: (rows: OcrRow[]) => void;
}

const TEXT_FIELDS = [
  "floor",
  "location",
  "fixtureModel",
  "existingProduct",
  "quantity",
  "notes",
] as const;

export function ReviewTable({ rows, onRowsChange }: ReviewTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);

  const updateRow = (id: string, field: keyof OcrRow, value: string) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const deleteRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
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

      <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                {SURVEY_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "px-2 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                      col === "写真" && "w-28"
                    )}
                  >
                    {col}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="table-row-hover border-b border-border/50 last:border-0">
                  <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{idx + 1}</td>

                  {TEXT_FIELDS.slice(0, 4).map((field) => (
                    <td key={field} className="px-1 py-1">
                      <Input
                        value={row[field]}
                        onChange={(e) => updateRow(row.id, field, e.target.value)}
                        className="h-9 text-sm border-transparent bg-transparent shadow-none focus-visible:bg-background focus-visible:border-border"
                      />
                    </td>
                  ))}

                  <td className="px-1 py-1">
                    <div className="flex items-center gap-1.5 min-w-[7rem]">
                      {row.photoUrl ? (
                        <img
                          src={row.photoUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-md border border-border/60 object-cover"
                        />
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
                      onClick={() => deleteRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {copy.table.footerWithPhotos(countRowsWithPhotos(rows), rows.length)}
          </span>
        </div>
      </div>
    </>
  );
}
