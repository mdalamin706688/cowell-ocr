"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import {
  getStoredGeminiApiKey,
  isGeminiKeyConfigured,
  setStoredGeminiApiKey,
  showGeminiKeyPanel,
} from "@/lib/gemini-key";

interface GeminiKeyPanelProps {
  onConfiguredChange?: (configured: boolean) => void;
}

export function GeminiKeyPanel({ onConfiguredChange }: GeminiKeyPanelProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [configured, setConfigured] = useState(false);

  const sync = useCallback(() => {
    const ok = isGeminiKeyConfigured();
    setConfigured(ok);
    onConfiguredChange?.(ok);
  }, [onConfiguredChange]);

  useEffect(() => {
    if (!showGeminiKeyPanel()) return;
    setDraft(getStoredGeminiApiKey());
    sync();
  }, [sync]);

  if (!showGeminiKeyPanel()) return null;

  const save = () => {
    setStoredGeminiApiKey(draft);
    sync();
  };

  return (
    <div className="ui-card border-lumen/20">
      <div className="ui-card-header">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lumen/10 text-lumen">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{copy.survey.apiKeyTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{copy.survey.apiKeyHint}</p>
          </div>
        </div>
        {configured && (
          <span className="text-[10px] font-semibold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-1">
            {copy.survey.apiKeyReady}
          </span>
        )}
      </div>
      <div className="ui-card-body space-y-3">
        <div className="flex gap-2">
          <Input
            type={visible ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
            translate="no"
            className="notranslate font-mono text-xs"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? copy.survey.apiKeyHide : copy.survey.apiKeyShow}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" onClick={save} disabled={!draft.trim()} className="shrink-0">
            {copy.survey.apiKeySave}
          </Button>
        </div>
        {!configured && (
          <p className="text-xs text-muted-foreground leading-relaxed">{copy.survey.apiKeyRequired}</p>
        )}
      </div>
    </div>
  );
}
