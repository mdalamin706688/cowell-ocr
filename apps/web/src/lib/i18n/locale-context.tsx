"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { copyJa, type Copy } from "./copy-ja";
import { copyEn } from "./copy-en";

export type Locale = "ja" | "en";

const LOCALE_STORAGE_KEY = "cowell_locale";

const copies: Record<Locale, Copy> = {
  ja: copyJa,
  en: copyEn,
};

function detectLocale(): Locale {
  if (typeof window === "undefined") return "ja";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ja" || stored === "en") return stored;
  } catch {
    /* private browsing */
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

interface LocaleContextValue {
  locale: Locale;
  copy: Copy;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      copy: copies[locale],
      setLocale,
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "ja" as Locale,
      copy: copyJa,
      setLocale: (_locale: Locale) => {},
    };
  }
  return ctx;
}

export function useCopy(): Copy {
  return useLocale().copy;
}
