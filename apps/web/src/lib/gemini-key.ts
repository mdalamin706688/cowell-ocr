import { isPreviewEnvironment } from "./client-auth";

const STORAGE_KEY = "cowell_gemini_key";

export function getEnvGeminiApiKey(): string {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ?? "";
}

export function getStoredGeminiApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setStoredGeminiApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing */
  }
}

/** Built-in deploy key, or key entered for this browser session */
export function getGeminiApiKey(): string {
  const envKey = getEnvGeminiApiKey();
  if (envKey) return envKey;
  return getStoredGeminiApiKey();
}

export function isGeminiKeyConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

export function showGeminiKeyPanel(): boolean {
  return isPreviewEnvironment() && !getEnvGeminiApiKey();
}
