"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ExternalLink,
  Loader2, ScanLine,
} from "lucide-react";
import { DEFAULT_OCR_PROMPT } from "@cowell/shared";
import { SurveyProvider, useSurvey } from "@/contexts/survey-context";
import { AppShell } from "@/components/layout/app-shell";
import { StepIndicator } from "@/components/workflow/step-indicator";
import { FileUploadZone } from "@/components/upload/file-upload-zone";
import { ReviewTable } from "@/components/review/review-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/lib/copy";
import { formatCurrencyJpy, formatDuration } from "@/lib/utils";

function SurveyWorkflow() {
  const router = useRouter();
  const {
    step, files, quality, prompt, ocrResult, rows, exportUrl, error,
    setStep, setFiles, setQuality, setPrompt, setOcrResult, setRows, setExportUrl, setError, reset,
  } = useSurvey();
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const runOcr = useCallback(async () => {
    if (!files.length) return;
    setProcessing(true); setError(null); setStep("processing"); setProgress(15);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          files: files.map((f) => ({ base64: f.base64, mimeType: f.mimeType, name: f.name })),
        }),
      });
      setProgress(70);
      if (!res.ok) throw new Error((await res.json()).error || copy.errors.ocrFailed);
      const result = await res.json();
      setOcrResult(result); setRows(result.rows); setProgress(100); setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.ocrFailed);
      setStep("upload");
    } finally { setProcessing(false); }
  }, [files, prompt, setStep, setError, setOcrResult, setRows]);

  const exportToSheets = useCallback(async () => {
    setExporting(true); setError(null); setStep("export");
    try {
      const res = await fetch("/api/sheets/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, title: `現調_${new Date().toISOString().slice(0, 10)}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error || copy.errors.exportFailed);
      setExportUrl((await res.json()).spreadsheetUrl); setStep("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.exportFailed);
      setStep("review");
    } finally { setExporting(false); }
  }, [rows, setStep, setError, setExportUrl]);

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />{copy.survey.back}
      </button>

      <h1 className="text-title text-xl sm:text-2xl">{copy.survey.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.survey.subtitle}</p>
      <div className="copper-rule mt-4 mb-2" />

      <div className="mt-6">
        <StepIndicator current={step} />
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div key="u" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="ui-card">
              <div className="ui-card-header"><p className="text-sm font-medium">{copy.survey.files}</p></div>
              <div className="ui-card-body">
                <FileUploadZone files={files} onFilesChange={setFiles} quality={quality} onQualityChange={setQuality} />
              </div>
            </div>
            <div className="ui-card">
              <div className="ui-card-header">
                <div>
                  <p className="text-sm font-medium">{copy.survey.prompt}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{copy.survey.promptHint}</p>
                </div>
              </div>
              <div className="ui-card-body">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-lumen/15 focus:border-lumen/30"
                  placeholder={DEFAULT_OCR_PROMPT}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={!files.length} onClick={runOcr}>
                <ScanLine className="h-4 w-4" />{copy.survey.runOcr}<ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-4 py-14 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-lumen" />
              <p className="text-sm font-medium">{copy.survey.processing}</p>
              <p className="text-xs text-muted-foreground">{copy.survey.processingFiles(files.length)}</p>
              <Progress value={progress} className="w-full max-w-xs" />
            </div>
          </motion.div>
        )}

        {step === "review" && ocrResult && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{copy.survey.usage.duration} {formatDuration(ocrResult.usage.elapsedMs)}</span>
              <span>{copy.survey.usage.tokens} {ocrResult.usage.totalTokens.toLocaleString("ja-JP")}</span>
              <span className="text-lumen font-medium">
                {copy.survey.usage.cost} {formatCurrencyJpy(ocrResult.usage.costJpy)}
              </span>
            </div>
            <div className="ui-card">
              <div className="ui-card-header">
                <p className="text-sm font-medium">{copy.survey.reviewTitle}</p>
                <span className="text-label">{copy.survey.reviewRows(rows.length)}</span>
              </div>
              <div className="ui-card-body pt-3">
                <Tabs defaultValue="table">
                  <TabsList className="mb-3">
                    <TabsTrigger value="table">{copy.survey.tabTable}</TabsTrigger>
                    <TabsTrigger value="raw">{copy.survey.tabRaw}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="table"><ReviewTable rows={rows} onRowsChange={setRows} /></TabsContent>
                  <TabsContent value="raw">
                    <pre className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-64">{ocrResult.rawText}</pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-3.5 w-3.5" />戻る
              </Button>
              <Button onClick={exportToSheets} disabled={!rows.length || exporting}>
                {exporting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{copy.survey.exporting}</>
                ) : (
                  <>{copy.survey.export}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "export" && (
          <div className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-3 py-14">
              <Loader2 className="h-6 w-6 animate-spin text-lumen" />
              <p className="text-sm">{copy.survey.exportProgress}</p>
            </div>
          </div>
        )}

        {step === "complete" && exportUrl && (
          <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-4 py-14 text-center">
              <CheckCircle2 className="h-9 w-9 text-lumen" />
              <div>
                <p className="font-display text-lg font-semibold">{copy.survey.completeTitle}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{copy.survey.completeBody(rows.length)}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button asChild>
                  <a href={exportUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />{copy.survey.openSheet}
                  </a>
                </Button>
                <Button variant="outline" onClick={() => { reset(); setStep("upload"); }}>
                  {copy.survey.newSurvey}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NewSurveyPage() {
  return <SurveyProvider><AppShell><SurveyWorkflow /></AppShell></SurveyProvider>;
}
