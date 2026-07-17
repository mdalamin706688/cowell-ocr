"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  OcrResult,
  OcrRow,
  QualityPreset,
  UploadedFile,
  WorkflowStep,
} from "@cowell/shared";
import { DEFAULT_OCR_PROMPT } from "@cowell/shared";

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
  step: "upload",
  files: [],
  quality: "standard",
  prompt: DEFAULT_OCR_PROMPT,
  ocrResult: null,
  rows: [],
  exportUrl: null,
  error: null,
};

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SurveyState>(initialState);

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
  const reset = useCallback(() => setState(initialState), []);

  return (
    <SurveyContext.Provider
      value={{
        ...state,
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
