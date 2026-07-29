"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { copy } from "@/lib/copy";
import type { OcrProgressPhase } from "@/lib/ocr-api";
import { cn, formatDuration } from "@/lib/utils";

interface ProcessingPanelProps {
  fileCount: number;
  fileNames?: string[];
  /** 0–100 target from OCR pipeline */
  progress: number;
  phase?: OcrProgressPhase;
  detail?: string;
}

const WORK_STEPS: Array<{ id: OcrProgressPhase; label: string }> = [
  { id: "preparing", label: copy.survey.processingPhase.preparingShort },
  { id: "uploading", label: copy.survey.processingPhase.uploadingShort },
  { id: "reading", label: copy.survey.processingPhase.readingShort },
  { id: "finishing", label: copy.survey.processingPhase.finishingShort },
];

const WORK_ORDER: OcrProgressPhase[] = WORK_STEPS.map((s) => s.id);

function phaseMessage(phase: OcrProgressPhase, detail?: string): string {
  const base = copy.survey.processingPhase[phase];
  return detail ? `${base}（${detail}）` : base;
}

/** Smoothly chase target % so the bar never jumps (Drive-like feel). */
function useSmoothProgress(target: number): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = Math.max(0, Math.min(100, target));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const current = displayRef.current;
      const goal = targetRef.current;
      const delta = goal - current;
      // Snap when very close; faster chase near completion
      const alpha = goal >= 99.5 ? 0.35 : 0.16;
      const next = Math.abs(delta) < 0.08 ? goal : current + delta * alpha;
      displayRef.current = next;
      setDisplay(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return display;
}

export function ProcessingPanel({
  fileCount,
  fileNames = [],
  progress,
  phase = "preparing",
  detail,
}: ProcessingPanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const smooth = useSmoothProgress(progress);
  const clamped = Math.max(0, Math.min(100, Math.round(smooth)));
  const phaseIndex = Math.max(0, WORK_ORDER.indexOf(phase));

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - started), 200);
    return () => window.clearInterval(id);
  }, []);

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
          <p className="text-sm text-muted-foreground">{phaseMessage(phase, detail)}</p>
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
          <Progress value={smooth} className="h-2.5" />
          <ol className="flex justify-between gap-1 pt-1">
            {WORK_STEPS.map((step, index) => {
              const done = index < phaseIndex || clamped >= 100;
              const current = index === phaseIndex && clamped < 100;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 text-center text-[10px] sm:text-[11px]",
                    done && "text-lumen font-medium",
                    current && "text-foreground font-medium",
                    !done && !current && "text-muted-foreground/55"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                      done && "bg-lumen",
                      current && "bg-foreground scale-110",
                      !done && !current && "bg-border"
                    )}
                  />
                  {step.label}
                </li>
              );
            })}
          </ol>
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
