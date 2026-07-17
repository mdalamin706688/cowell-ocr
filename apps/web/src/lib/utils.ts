import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb.toFixed(1)} KB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ミリ秒`;
  return `${(ms / 1000).toFixed(1)}秒`;
}

export function formatCurrencyJpy(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId(): string {
  return crypto.randomUUID();
}
