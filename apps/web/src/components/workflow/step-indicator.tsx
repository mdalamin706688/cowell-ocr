"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { WorkflowStep } from "@cowell/shared";

const steps: { key: WorkflowStep; label: string }[] = [
  { key: "upload", label: "アップロード" },
  { key: "processing", label: "読み取り" },
  { key: "review", label: "確認" },
  { key: "export", label: "登録" },
  { key: "complete", label: "完了" },
];

const order: WorkflowStep[] = ["upload", "processing", "review", "export", "complete"];

export function StepIndicator({ current }: { current: WorkflowStep }) {
  const idx = order.indexOf(current);

  return (
    <div className="mb-8">
      <div className="timeline-track">
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
                  active && "timeline-dot-active"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-2 text-[11px] font-medium hidden sm:block",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
