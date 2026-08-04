"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { WorkflowStep } from "@cowell/shared";

const steps: { key: WorkflowStep; label: string }[] = [
  { key: "upload", label: "資料アップロード" },
  { key: "processing", label: "読み取り" },
  { key: "review", label: "結果確認" },
  { key: "export", label: "自動転記" },
  { key: "complete", label: "完了" },
];

const order: WorkflowStep[] = ["upload", "processing", "review", "export", "complete"];

export function StepIndicator({
  current,
  compact = false,
}: {
  current: WorkflowStep;
  compact?: boolean;
}) {
  const idx = order.indexOf(current);

  return (
    <div className={compact ? "mb-2 sm:mb-3" : "mb-5 sm:mb-8"}>
      <div className="-mx-0.5 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="timeline-track min-w-[19.5rem] sm:min-w-0">
          {steps.map((s, i) => {
            const done = i < idx;
            const active = s.key === current;
            return (
              <div
                key={s.key}
                className="flex flex-col items-center text-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                <div
                  className={cn(
                    "timeline-dot",
                    done && "timeline-dot-done",
                    active && !done && "timeline-dot-active"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "mt-1.5 line-clamp-2 max-w-full px-0.5 text-[9px] font-medium leading-tight break-keep sm:mt-2 sm:px-1 sm:text-xs",
                    active && "text-lumen font-semibold",
                    done && !active && "text-foreground",
                    !active && !done && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
