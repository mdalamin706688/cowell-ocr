"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { copy } from "@/lib/copy";
import type { ExportProgressPhase } from "@/lib/sheets-export";
import { cn, formatDuration } from "@/lib/utils";

interface ExportProgressPanelProps {
  progress: number;
  phase: ExportProgressPhase;
  detail?: string;
  destinationPath?: string;
}

/** Work phases only — auth is shown separately before % starts */
const WORK_STEPS: Array<{ id: ExportProgressPhase; label: string }> = [
  { id: "folders", label: copy.survey.exportPhase.foldersShort },
  { id: "spreadsheet", label: copy.survey.exportPhase.spreadsheetShort },
  { id: "photos", label: copy.survey.exportPhase.photosShort },
  { id: "sources", label: copy.survey.exportPhase.sourcesShort },
  { id: "finishing", label: copy.survey.exportPhase.finishingShort },
];

const WORK_ORDER: ExportProgressPhase[] = WORK_STEPS.map((s) => s.id);

function phaseLabel(phase: ExportProgressPhase, detail?: string): string {
  const base = copy.survey.exportPhase[phase];
  return detail ? `${base}（${detail}）` : base;
}

export function ExportProgressPanel({
  progress,
  phase,
  detail,
  destinationPath,
}: ExportProgressPanelProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const waitingForAuth = phase === "connecting";
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const phaseIndex = Math.max(0, WORK_ORDER.indexOf(phase === "connecting" ? "folders" : phase));

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsedMs(Date.now() - started), 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="ui-card">
      <div className="ui-card-body flex flex-col items-center gap-5 py-14 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-lumen" />
        </div>

        <div className="space-y-1.5 max-w-sm">
          <p className="font-display text-lg font-semibold tracking-tight">
            {waitingForAuth ? copy.survey.connectingGoogle : copy.survey.exportingTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {waitingForAuth
              ? copy.survey.exportPhase.connecting
              : phaseLabel(phase, detail)}
          </p>
          {!waitingForAuth && destinationPath && (
            <p className="text-xs font-mono text-muted-foreground/80 truncate">
              {destinationPath}
            </p>
          )}
        </div>

        <div className="w-full max-w-md space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(elapsedMs)}
            </span>
            {waitingForAuth ? (
              <span className="text-sm font-medium text-muted-foreground">
                {copy.survey.exportWaitingAuth}
              </span>
            ) : (
              <span className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                {clamped}
                <span className="ml-0.5 text-base font-medium text-muted-foreground">%</span>
              </span>
            )}
          </div>

          {waitingForAuth ? (
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-border/60">
              <div className="absolute inset-y-0 w-1/3 rounded-full bg-lumen/70 animate-[export-indeterminate_1.2s_ease-in-out_infinite]" />
            </div>
          ) : (
            <Progress value={clamped} className="h-2.5" />
          )}

          {!waitingForAuth && (
            <ol className="flex justify-between gap-1 pt-0.5">
              {WORK_STEPS.map((step, index) => {
                const done = index < phaseIndex || clamped >= 100;
                const current = index === phaseIndex && clamped < 100;
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex-1 text-center text-[10px] sm:text-[11px]",
                      done && "text-lumen font-medium",
                      current && "text-foreground font-medium",
                      !done && !current && "text-muted-foreground/55"
                    )}
                  >
                    {step.label}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="text-xs text-muted-foreground/80 max-w-sm">
          {waitingForAuth
            ? copy.survey.exportAuthHint
            : copy.survey.exportProgressHint}
        </p>
      </div>
    </div>
  );
}
