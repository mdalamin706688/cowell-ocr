"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  OcrResult,
  OcrRow,
  QualityPreset,
  UploadedFile,
  WorkflowStep,
} from "@cowell/shared";
import { DEFAULT_OCR_PROMPT } from "@cowell/shared";
import {
  clearSurveyDraft,
  emptySurveyDraft,
  loadSurveyDraft,
  reviveDraftFiles,
  saveSurveyDraft,
  stabilizeStep,
} from "@/lib/survey-draft";

interface SurveyState {
  step: WorkflowStep;
  files: UploadedFile[];
  quality: QualityPreset;
  prompt: string;
  ocrResult: OcrResult | null;
  rows: OcrRow[];
  exportUrl: string | null;
  error: string | null;
}

interface SurveyContextValue extends SurveyState {
  hydrated: boolean;
  setStep: (step: WorkflowStep) => void;
  setFiles: (files: UploadedFile[]) => void;
  setQuality: (q: QualityPreset) => void;
  setPrompt: (p: string) => void;
  setOcrResult: (result: OcrResult | null) => void;
  setRows: (rows: OcrRow[]) => void;
  setExportUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: SurveyState = {
  ...emptySurveyDraft(),
  error: null,
};

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SurveyState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await loadSurveyDraft();
      if (cancelled) return;
      if (draft) {
        const files = reviveDraftFiles(draft.files);
        setState({
          step: stabilizeStep(draft.step, Boolean(draft.ocrResult || draft.rows.length)),
          files,
          quality: draft.quality,
          prompt: draft.prompt || DEFAULT_OCR_PROMPT,
          ocrResult: draft.ocrResult,
          rows: draft.rows,
          exportUrl: draft.exportUrl,
          error: null,
        });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSurveyDraft({
        step: state.step,
        files: state.files,
        quality: state.quality,
        prompt: state.prompt,
        ocrResult: state.ocrResult,
        rows: state.rows,
        exportUrl: state.exportUrl,
      });
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, state]);

  const setStep = useCallback((step: WorkflowStep) => setState((s) => ({ ...s, step })), []);
  const setFiles = useCallback((files: UploadedFile[]) => setState((s) => ({ ...s, files })), []);
  const setQuality = useCallback((quality: QualityPreset) => setState((s) => ({ ...s, quality })), []);
  const setPrompt = useCallback((prompt: string) => setState((s) => ({ ...s, prompt })), []);
  const setOcrResult = useCallback(
    (ocrResult: OcrResult | null) => setState((s) => ({ ...s, ocrResult })),
    []
  );
  const setRows = useCallback((rows: OcrRow[]) => setState((s) => ({ ...s, rows })), []);
  const setExportUrl = useCallback(
    (exportUrl: string | null) => setState((s) => ({ ...s, exportUrl })),
    []
  );
  const setError = useCallback((error: string | null) => setState((s) => ({ ...s, error })), []);
  const reset = useCallback(() => {
    setState(initialState);
    void clearSurveyDraft();
  }, []);

  return (
    <SurveyContext.Provider
      value={{
        ...state,
        hydrated,
        setStep,
        setFiles,
        setQuality,
        setPrompt,
        setOcrResult,
        setRows,
        setExportUrl,
        setError,
        reset,
      }}
    >
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("useSurvey must be used within SurveyProvider");
  return ctx;
}
