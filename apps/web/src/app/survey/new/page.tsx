"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Download,
  ExternalLink, Loader2, ScanLine, Sparkles,
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
import { isPreviewEnvironment } from "@/lib/client-auth";
import { isGoogleClientConfigured } from "@/lib/google-auth-client";
import { surveyExport, surveyRunOcr, triggerCsvDownload } from "@/lib/survey-api";
import { formatCurrencyJpy, formatDuration } from "@/lib/utils";

function SurveyWorkflow() {
  const router = useRouter();
  const {
    step, files, quality, prompt, ocrResult, rows, exportUrl, error, hydrated,
    setStep, setFiles, setQuality, setPrompt, setOcrResult, setRows, setExportUrl, setError, reset,
  } = useSurvey();
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [promptOpen, setPromptOpen] = useState(false);
  const [csvExport, setCsvExport] = useState(false);
  const [exportTitle, setExportTitle] = useState("");

  const runOcr = useCallback(async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setStep("processing");
    setProgress(15);
    try {
      const result = await surveyRunOcr(
        prompt,
        files.map((f) => ({ base64: f.base64, mimeType: f.mimeType, name: f.name }))
      );
      setProgress(100);
      setOcrResult(result);
      setRows(result.rows);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.ocrFailed);
      setStep("upload");
    } finally {
      setProcessing(false);
    }
  }, [files, prompt, setStep, setError, setOcrResult, setRows]);

  const exportToSheets = useCallback(async () => {
    setExporting(true);
    setError(null);
    setStep("export");
    const title = `現調_${new Date().toISOString().slice(0, 10)}`;
    setExportTitle(title);
    try {
      const result = await surveyExport(rows, title);
      if (result.downloadOnly) {
        setCsvExport(true);
        setExportUrl("");
      } else {
        setCsvExport(false);
        setExportUrl(result.spreadsheetUrl);
      }
      setStep("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.exportFailed);
      setStep("review");
    } finally {
      setExporting(false);
    }
  }, [rows, setStep, setError, setExportUrl]);

  if (!hydrated) {
    return (
      <div className="ui-card">
        <div className="ui-card-body flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-7 w-7 animate-spin text-lumen" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />{copy.survey.back}
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/80 text-lumen shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-title text-xl sm:text-2xl">{copy.survey.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{copy.survey.subtitle}</p>
        </div>
      </div>

      <div className="copper-rule mb-6" />

      <StepIndicator current={step} />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
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

            <div className="ui-card overflow-hidden">
              <button
                type="button"
                onClick={() => setPromptOpen((v) => !v)}
                className="ui-card-header w-full text-left hover:bg-muted/20 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{copy.survey.prompt}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{copy.survey.promptHint}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${promptOpen ? "rotate-180" : ""}`} />
              </button>
              {promptOpen && (
                <div className="ui-card-body border-t border-border/60 pt-4">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-lumen/15 focus:border-lumen/30"
                    placeholder={DEFAULT_OCR_PROMPT}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button disabled={!files.length} onClick={runOcr} size="lg">
                <ScanLine className="h-4 w-4" />{copy.survey.runOcr}<ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-4 py-16 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-lumen/20 blur-xl" />
                <Loader2 className="relative h-8 w-8 animate-spin text-lumen" />
              </div>
              <div>
                <p className="text-sm font-semibold">{copy.survey.processing}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.survey.processingFiles(files.length)}</p>
              </div>
              <Progress value={progress} className="w-full max-w-xs h-1.5" />
            </div>
          </motion.div>
        )}

        {step === "review" && ocrResult && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {[
                { label: copy.survey.usage.duration, value: formatDuration(ocrResult.usage.elapsedMs) },
                { label: copy.survey.usage.tokens, value: ocrResult.usage.totalTokens.toLocaleString("ja-JP") },
                { label: copy.survey.usage.cost, value: formatCurrencyJpy(ocrResult.usage.costJpy), highlight: true },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border/70 bg-card px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${stat.highlight ? "text-lumen" : ""}`}>{stat.value}</p>
                </div>
              ))}
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
            <div className="flex justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-3.5 w-3.5" />戻る
              </Button>
              <Button onClick={exportToSheets} disabled={!rows.length || exporting} size="lg">
                {exporting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{copy.survey.exporting}</>
                ) : (
                  <>
                    {isPreviewEnvironment() && !isGoogleClientConfigured()
                      ? copy.survey.exportCsv
                      : isGoogleClientConfigured()
                        ? copy.survey.connectGoogle
                        : copy.survey.export}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "export" && (
          <div className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-7 w-7 animate-spin text-lumen" />
              <p className="text-sm font-medium">
                {isGoogleClientConfigured()
                  ? copy.survey.connectingGoogle
                  : copy.survey.exportProgress}
              </p>
            </div>
          </div>
        )}

        {step === "complete" && (
          <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card">
            <div className="ui-card-body flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lumen/10">
                <CheckCircle2 className="h-8 w-8 text-lumen" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">{copy.survey.completeTitle}</p>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {csvExport ? copy.survey.completeBodyCsv(rows.length) : copy.survey.completeBody(rows.length)}
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                {csvExport ? (
                  <Button onClick={() => triggerCsvDownload(rows, exportTitle || "現調")}>
                    <Download className="h-4 w-4" />{copy.survey.downloadCsv}
                  </Button>
                ) : exportUrl ? (
                  <Button asChild>
                    <a href={exportUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />{copy.survey.openSheet}
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => { reset(); setCsvExport(false); setStep("upload"); }}>
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
