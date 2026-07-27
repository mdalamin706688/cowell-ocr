"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { copy } from "@/lib/copy";
import { formatDuration } from "@/lib/utils";

interface ProcessingPanelProps {
  fileCount: number;
  fileNames?: string[];
  /** 0–100 from parent; parent drives simulated + completion jumps */
  progress: number;
}

export function ProcessingPanel({ fileCount, fileNames = [], progress }: ProcessingPanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - started), 250);
    return () => window.clearInterval(id);
  }, []);

  const phase = useMemo(() => {
    if (clamped >= 95) return copy.survey.processingPhase.finishing;
    if (clamped >= 55) return copy.survey.processingPhase.reading;
    if (clamped >= 25) return copy.survey.processingPhase.uploading;
    return copy.survey.processingPhase.preparing;
  }, [clamped]);

  const previewNames = fileNames.slice(0, 2);
  const extra = Math.max(0, fileNames.length - previewNames.length);

  return (
    <div className="ui-card overflow-hidden">
      <div className="relative ui-card-body flex flex-col items-center gap-6 py-12 sm:py-16 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--lumen) / 0.10) 0%, transparent 65%)",
          }}
        />

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-lumen/25 blur-2xl scale-150" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-lumen/20 bg-card shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-lumen" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-lumen-glow" />
          </div>
        </div>

        <div className="relative space-y-1.5 max-w-sm">
          <p className="font-display text-lg font-semibold tracking-tight">{copy.survey.processing}</p>
          <p className="text-sm text-muted-foreground">{phase}</p>
          <p className="text-xs text-muted-foreground/80">{copy.survey.processingFiles(fileCount)}</p>
        </div>

        <div className="relative w-full max-w-md space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {formatDuration(elapsedMs)}
            </span>
            <span className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {clamped}
              <span className="ml-0.5 text-base font-medium text-muted-foreground">%</span>
            </span>
          </div>
          <Progress value={clamped} className="h-2.5" />
          <div className="flex justify-between text-[11px] text-muted-foreground/70">
            <span>{copy.survey.processingPhase.preparingShort}</span>
            <span>{copy.survey.processingPhase.readingShort}</span>
            <span>{copy.survey.processingPhase.finishingShort}</span>
          </div>
        </div>

        {previewNames.length > 0 && (
          <div className="relative flex flex-wrap items-center justify-center gap-2 max-w-md">
            {previewNames.map((name) => (
              <span
                key={name}
                className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground"
              >
                <FileText className="h-3 w-3 shrink-0 text-lumen" />
                <span className="truncate">{name}</span>
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs text-muted-foreground">+{extra}</span>
            )}
          </div>
        )}

        <p className="relative text-[11px] text-muted-foreground/60 max-w-xs leading-relaxed">
          {copy.survey.processingHint}
        </p>
      </div>
    </div>
  );
}
