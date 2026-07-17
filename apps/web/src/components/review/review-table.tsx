"use client";

import type { OcrRow } from "@cowell/shared";
import { SURVEY_COLUMNS } from "@cowell/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface ReviewTableProps {
  rows: OcrRow[];
  onRowsChange: (rows: OcrRow[]) => void;
}

export function ReviewTable({ rows, onRowsChange }: ReviewTableProps) {
  const updateRow = (id: string, field: keyof OcrRow, value: string) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const deleteRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
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
    <div className="rounded-lg border border-border/80 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground w-8">#</th>
              {SURVEY_COLUMNS.filter((c) => c !== "写真").map((col) => (
                <th key={col} className="px-2 py-2 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="table-row-hover border-b border-border/50 last:border-0">
                <td className="px-3 py-1 text-[10px] text-muted-foreground tabular-nums">{idx + 1}</td>
                {(["floor", "location", "fixtureModel", "existingProduct", "quantity", "notes"] as const).map(
                  (field) => (
                    <td key={field} className="px-1 py-0.5">
                      <Input
                        value={row[field]}
                        onChange={(e) => updateRow(row.id, field, e.target.value)}
                        className={cn(
                          "h-7 text-xs border-transparent bg-transparent shadow-none",
                          "focus-visible:bg-background focus-visible:border-border",
                          field === "quantity" && "w-14 tabular-nums"
                        )}
                      />
                    </td>
                  )
                )}
                <td className="px-1 py-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                    onClick={() => deleteRow(row.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">{copy.table.footer(rows.length)}</span>
      </div>
    </div>
  );
}
