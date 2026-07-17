import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, accent, className }: StatCardProps) {
  return (
    <div className={cn("premium-stat", accent && "premium-stat-accent", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="icon-box icon-box-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-label mt-4">{label}</p>
      <p className="font-display mt-1 text-xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}
