"use client";

import { cn } from "@/lib/utils";
import { useLocale, type Locale } from "@/lib/i18n/locale-context";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "light" | "dark";
}

const options: { locale: Locale; label: string }[] = [
  { locale: "ja", label: "日本語" },
  { locale: "en", label: "English" },
];

export function LanguageSwitcher({ className, variant = "dark" }: LanguageSwitcherProps) {
  const { locale, setLocale, copy } = useLocale();

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      translate="no"
      aria-label={copy.login.languageLabel}
    >
      <span
        className={cn(
          "text-xs font-medium tracking-wide",
          variant === "light" ? "text-white/45" : "text-muted-foreground"
        )}
      >
        {copy.login.languageLabel}
      </span>
      <div
        className={cn(
          "inline-flex rounded-lg border p-0.5 text-xs font-medium",
          variant === "light"
            ? "border-white/15 bg-white/5"
            : "border-border/60 bg-muted/30"
        )}
      >
        {options.map(({ locale: value, label }) => {
          const active = locale === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                active
                  ? variant === "light"
                    ? "bg-white/15 text-white"
                    : "bg-background text-foreground shadow-sm"
                  : variant === "light"
                    ? "text-white/55 hover:text-white/80"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
