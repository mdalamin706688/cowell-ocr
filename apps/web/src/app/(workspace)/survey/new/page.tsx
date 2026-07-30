"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StepPanel } from "@/components/motion/step-panel";
import { StaggerItem, StaggerReveal } from "@/components/motion/stagger-reveal";
import { SurveyPageSkeleton } from "@/components/layout/content-skeleton";
import {
  ArrowRight, CheckCircle2, Download,
  ExternalLink, Loader2, Maximize2, Minimize2, ScanLine, Sparkles, Square,
} from "lucide-react";
import { SurveyProvider, useSurvey } from "@/contexts/survey-context";
import { StepIndicator } from "@/components/workflow/step-indicator";
import { FileUploadZone } from "@/components/upload/file-upload-zone";
import { ReviewTable } from "@/components/review/review-table";
import { DriveDestinationPanel } from "@/components/survey/drive-destination-panel";
import { ExportProgressPanel } from "@/components/survey/export-progress-panel";
import { ProcessingPanel } from "@/components/survey/processing-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/lib/copy";
import { isPreviewEnvironment } from "@/lib/client-auth";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import {
  normalizeFolderNameInput,
  writeLastRootFolder,
} from "@/lib/drive-root-folder";
import { isGoogleClientConfigured } from "@/lib/google-auth-client";
import type { ExportProgressPhase } from "@/lib/sheets-export";
import {
  surveyExport,
  surveyRunOcr,
  triggerCsvDownload,
} from "@/lib/survey-api";
import {
  buildSpreadsheetDriveName,
  normalizeProjectNameInput,
  sanitizeProjectFolderName,
} from "@/lib/survey-process-name";
import { cn, formatCurrencyUsd, formatDuration } from "@/lib/utils";

function SurveyWorkflow() {
  const {
    step, files, quality, prompt, ocrResult, rows, exportUrl, error,
    setStep, setFiles, setQuality, setOcrResult, setRows, setExportUrl, setError, reset,
  } = useSurvey();
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrPhase, setOcrPhase] = useState<"preparing" | "uploading" | "reading" | "finishing">("preparing");
  const [ocrDetail, setOcrDetail] = useState<string | undefined>();
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportProgressPhase>("connecting");
  const [exportDetail, setExportDetail] = useState<string | undefined>();
  const [reviewTab, setReviewTab] = useState<"table" | "raw">("table");
  const [tableQuery, setTableQuery] = useState("");
  const [reviewFocusMode, setReviewFocusMode] = useState(false);
  const [abortOpen, setAbortOpen] = useState(false);
  const [csvExport, setCsvExport] = useState(false);
  const [exportTitle, setExportTitle] = useState("");
  const [destination, setDestination] = useState<{
    rootFolderName: string;
    rootFolderId?: string;
    projectName: string;
    googleAccountEmail?: string;
    isValid: boolean;
  }>({
    rootFolderName: "",
    projectName: "",
    isValid: false,
  });
  const exportLock = useRef(false);
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  const { setCollapsedOverride } = useSidebarCollapsed();
  const compactTop = step === "review" || step === "export" || step === "complete";
  const uploadedImageByName = useMemo(() => {
    const map = new Map<string, { base64: string; mimeType: string; previewUrl?: string }>();
    for (const file of files) {
      if (!file.mimeType.startsWith("image/")) continue;
      map.set(file.name.trim().toLowerCase(), {
        base64: file.base64,
        mimeType: file.mimeType,
        previewUrl: file.previewUrl,
      });
    }
    return map;
  }, [files]);
  const rawPreview = useMemo(() => {
    if (!ocrResult?.rawText) return null;
    const tsvLines = ocrResult.rawText
      .split(/\r?\n/)
      .filter((line) => line.includes("\t"));
    if (!tsvLines.length) return null;

    const matrix = tsvLines.map((line) => line.split("\t"));
    const [header, ...body] = matrix;
    const colCount = header.length;
    return {
      header,
      body: body.map((row) =>
        Array.from({ length: colCount }, (_, idx) => row[idx] ?? "")
      ),
    };
  }, [ocrResult?.rawText]);

  const handleReviewTabChange = useCallback((next: "table" | "raw") => {
    if (next === reviewTab) return;
    setReviewTab(next);
  }, [reviewTab]);

  useEffect(() => {
    if (reviewTab !== "table") return;
    const el = reviewSectionRef.current;
    if (!el) return;
    // Ensure table header/card stays in view when switching back from RAW.
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  }, [reviewTab]);

  useEffect(() => {
    if (step !== "review") {
      setCollapsedOverride(null);
      setReviewFocusMode(false);
      setAbortOpen(false);
    }
  }, [setCollapsedOverride, step]);

  // Leaving the survey page must clear focus override without touching user preference.
  useEffect(() => {
    return () => setCollapsedOverride(null);
  }, [setCollapsedOverride]);

  const setFocusMode = useCallback(
    (on: boolean) => {
      if (on) {
        setCollapsedOverride(true);
        setReviewFocusMode(true);
        return;
      }
      setReviewFocusMode(false);
      setCollapsedOverride(null);
    },
    [setCollapsedOverride]
  );

  const abortSurvey = useCallback(() => {
    setAbortOpen(false);
    setFocusMode(false);
    reset();
    setCsvExport(false);
    setTableQuery("");
    setReviewTab("table");
    setDestination({
      rootFolderName: "",
      projectName: "",
      googleAccountEmail: destination.googleAccountEmail,
      isValid: false,
    });
    setStep("upload");
  }, [destination.googleAccountEmail, reset, setFocusMode, setStep]);
  const runOcr = useCallback(async () => {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    setStep("processing");
    setProgress(1);
    setOcrPhase("preparing");
    setOcrDetail(undefined);
    try {
      const result = await surveyRunOcr(
        prompt,
        files.map((f) => ({ base64: f.base64, mimeType: f.mimeType, name: f.name })),
        {
          onProgress: (event) => {
            setProgress((prev) => Math.max(prev, event.percent));
            setOcrPhase(event.phase);
            setOcrDetail(event.phase === "uploading" ? event.detail : undefined);
          },
        }
      );
      setOcrPhase("finishing");
      setOcrDetail(undefined);
      setProgress(100);
      setOcrResult(result);
      setRows(
        result.rows.map((row) => {
          const key = row.sourceFile?.trim().toLowerCase();
          const matched = key ? uploadedImageByName.get(key) : undefined;
          if (!matched) return row;
          return {
            ...row,
            photoBase64: row.photoBase64 || matched.base64,
            photoMimeType: row.photoMimeType || matched.mimeType,
            photoUrl:
              row.photoUrl ||
              matched.previewUrl ||
              `data:${matched.mimeType};base64,${matched.base64}`,
          };
        })
      );
      // Brief beat so users see 100% before review
      await new Promise((r) => window.setTimeout(r, 350));
      setStep("review");
    } catch (e) {
      setProgress(0);
      setError(e instanceof Error ? e.message : copy.errors.ocrFailed);
      setStep("upload");
    } finally {
      setProcessing(false);
    }
  }, [
    files,
    prompt,
    setStep,
    setError,
    setOcrResult,
    setRows,
    uploadedImageByName,
  ]);

  const exportToSheets = useCallback(async () => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setError(null);
    setStep("export");
    setExportProgress(0);
    setExportPhase("folders");
    setExportDetail(undefined);
    const name = sanitizeProjectFolderName(destination.projectName);
    const rootName = normalizeFolderNameInput(destination.rootFolderName);
    if (!rootName || !normalizeProjectNameInput(destination.projectName) || !destination.isValid) {
      setError(copy.survey.destinationInvalid);
      setExporting(false);
      exportLock.current = false;
      setStep("review");
      return;
    }
    writeLastRootFolder(
      { name: rootName, id: destination.rootFolderId },
      destination.googleAccountEmail
    );
    setExportTitle(buildSpreadsheetDriveName(destination.projectName));
    try {
      const result = await surveyExport(rows, {
        projectName: name,
        rootFolderName: rootName,
        rootFolderId: destination.rootFolderId,
        googleAccountEmail: destination.googleAccountEmail,
        sourceFiles: files.map((f) => ({
          base64: f.base64,
          mimeType: f.mimeType,
          name: f.name,
        })),
        onProgress: (event) => {
          setExportProgress(event.percent);
          setExportPhase(event.phase);
          setExportDetail(event.detail);
        },
      });
      setExportProgress(100);
      setExportPhase("finishing");
      if (result.downloadOnly) {
        setCsvExport(true);
        setExportUrl("");
      } else {
        setCsvExport(false);
        setExportUrl(result.processFolderUrl || result.spreadsheetUrl);
      }
      await new Promise((r) => window.setTimeout(r, 280));
      setStep("complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.exportFailed);
      setStep("review");
    } finally {
      setExporting(false);
      exportLock.current = false;
    }
  }, [rows, destination, files, setStep, setError, setExportUrl]);

  const stepContent = (
    <>
      {step === "upload" && (
        <StepPanel className="space-y-4">
          <div ref={reviewSectionRef} className="ui-card">
            <div className="ui-card-header"><p className="text-base font-medium">{copy.survey.files}</p></div>
            <div className="ui-card-body">
              <FileUploadZone files={files} onFilesChange={setFiles} quality={quality} onQualityChange={setQuality} />
            </div>
          </div>

          {/* AI prompt editor intentionally hidden */}

          <div className="flex justify-end pt-1">
            <Button disabled={!files.length} onClick={runOcr} size="lg">
              <ScanLine className="h-4 w-4" />{copy.survey.runOcr}<ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </StepPanel>
      )}

      {step === "processing" && (
        <StepPanel>
          <ProcessingPanel
            fileCount={files.length}
            fileNames={files.map((f) => f.name)}
            progress={progress}
            phase={ocrPhase}
            detail={ocrDetail}
          />
        </StepPanel>
      )}

      {step === "review" && ocrResult && (
        <StepPanel className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {[
              {
                label: copy.survey.usage.duration,
                value: formatDuration(ocrResult.usage.elapsedMs),
                tone: "border-sky-300/70 bg-sky-50/60 text-sky-800",
              },
              {
                label: copy.survey.usage.tokens,
                value: ocrResult.usage.totalTokens.toLocaleString("ja-JP"),
                tone: "border-violet-300/70 bg-violet-50/60 text-violet-800",
              },
              {
                label: copy.survey.usage.cost,
                value: formatCurrencyUsd(ocrResult.usage.costUsd),
                tone: "border-amber-300/70 bg-amber-50/60 text-amber-800",
              },
            ].map((stat) => (
              <span
                key={stat.label}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs leading-tight",
                  stat.tone
                )}
              >
                <span className="font-medium opacity-80">{stat.label}:</span>
                <span className="font-semibold tabular-nums">{stat.value}</span>
              </span>
            ))}
          </div>
          {!reviewFocusMode && (
            <DriveDestinationPanel value={destination} onChange={setDestination} />
          )}

          <div className="ui-card">
            <div className="ui-card-header">
              <p className="text-base font-medium">{copy.survey.reviewTitle}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title={reviewFocusMode ? copy.survey.focusCollapse : copy.survey.focusExpand}
                  aria-label={reviewFocusMode ? copy.survey.focusCollapse : copy.survey.focusExpand}
                  onClick={() => setFocusMode(!reviewFocusMode)}
                >
                  {reviewFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <span className="text-label">{copy.survey.reviewRows(rows.length)}</span>
              </div>
            </div>
            <div className="ui-card-body pt-3">
              <Tabs value={reviewTab} onValueChange={(v) => handleReviewTabChange(v as "table" | "raw")}>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList>
                    <TabsTrigger value="table">{copy.survey.tabTable}</TabsTrigger>
                    <TabsTrigger value="raw">{copy.survey.tabRaw}</TabsTrigger>
                  </TabsList>
                  {reviewTab === "table" && (
                    <Input
                      value={tableQuery}
                      onChange={(e) => setTableQuery(e.target.value)}
                      placeholder={copy.table.searchPlaceholder}
                      className="h-9 w-full sm:w-80"
                    />
                  )}
                </div>
                <TabsContent value="table" className="mt-0">
                  <ReviewTable
                    rows={rows}
                    onRowsChange={setRows}
                    query={tableQuery}
                  />
                </TabsContent>
                <TabsContent value="raw" className="mt-0">
                  <p className="mb-2 text-xs text-muted-foreground">{copy.survey.rawHint}</p>
                  {rawPreview ? (
                    <div className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/20">
                      <table className="min-w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {rawPreview.header.map((cell, idx) => (
                              <th
                                key={`raw-header-${idx}`}
                                className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap"
                              >
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawPreview.body.map((row, rowIdx) => (
                            <tr key={`raw-row-${rowIdx}`} className="border-b border-border/60 last:border-b-0">
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={`raw-cell-${rowIdx}-${cellIdx}`}
                                  className="px-3 py-2 text-muted-foreground whitespace-nowrap"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-72">{ocrResult.rawText}</pre>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="flex justify-between pt-1">
            <Button variant="outline" size="sm" onClick={() => setAbortOpen(true)}>
              <Square className="h-3.5 w-3.5" />
              {copy.survey.abort}
            </Button>
            <Button
              onClick={exportToSheets}
              disabled={
                !rows.length ||
                exporting ||
                (isGoogleClientConfigured() && !destination.isValid)
              }
              size="lg"
            >
              {exporting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{copy.survey.exporting}</>
              ) : (
                <>
                  {isPreviewEnvironment() && !isGoogleClientConfigured()
                    ? copy.survey.exportCsv
                    : copy.survey.export}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <OverlayDialog
            open={abortOpen}
            onClose={() => setAbortOpen(false)}
            label={copy.survey.abortTitle}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold tracking-tight">{copy.survey.abortTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {copy.survey.abortBody}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAbortOpen(false)}>
                  {copy.survey.abortCancel}
                </Button>
                <Button type="button" variant="destructive" onClick={abortSurvey}>
                  {copy.survey.abortConfirm}
                </Button>
              </div>
            </div>
          </OverlayDialog>
        </StepPanel>
      )}

      {step === "export" && (
        <StepPanel>
          <ExportProgressPanel
            progress={exportProgress}
            phase={exportPhase}
            detail={exportDetail}
            destinationPath={`${normalizeFolderNameInput(destination.rootFolderName) || "—"}/${normalizeProjectNameInput(destination.projectName) || "—"}`}
          />
        </StepPanel>
      )}

      {step === "complete" && (
        <StepPanel className="ui-card">
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
              <Button variant="outline" onClick={() => {
                reset();
                setCsvExport(false);
                setDestination({
                  rootFolderName: "",
                  projectName: "",
                  googleAccountEmail: destination.googleAccountEmail,
                  isValid: false,
                });
                setStep("upload");
              }}>
                {copy.survey.newSurvey}
              </Button>
            </div>
          </div>
        </StepPanel>
      )}
    </>
  );

  return (
    <StaggerReveal placeholder={<SurveyPageSkeleton />}>
      <StaggerItem>
        <div className={cn("flex items-start gap-4", compactTop && "gap-3")}>
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/80 text-lumen shadow-sm",
              compactTop && "h-9 w-9 rounded-lg"
            )}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className={cn("text-title text-xl sm:text-2xl", compactTop && "text-lg sm:text-xl")}>
              {copy.survey.title}
            </h1>
            <p
              className={cn(
                "text-muted-foreground leading-snug",
                compactTop ? "mt-0.5 text-xs" : "mt-1.5 text-sm leading-relaxed"
              )}
            >
              {copy.survey.subtitle}
            </p>
          </div>
        </div>
      </StaggerItem>

      {!compactTop && (
        <StaggerItem>
          <div className="copper-rule" />
        </StaggerItem>
      )}

      {!reviewFocusMode && (
        <StaggerItem>
          <StepIndicator current={step} compact={compactTop} />
        </StaggerItem>
      )}

      {error && (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      )}

      <StaggerItem className={cn(compactTop && "-mt-2")}>{stepContent}</StaggerItem>
    </StaggerReveal>
  );
}

export default function NewSurveyPage() {
  return (
    <SurveyProvider>
      <SurveyWorkflow />
    </SurveyProvider>
  );
}
