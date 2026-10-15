"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, Check, ChevronDown, FolderOpen, Loader2, Lock } from "lucide-react";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import { isPreviewEnvironment } from "@/lib/client-auth";
import { getDirectDriveAccessToken, isDirectDriveConfigured } from "@/lib/google-direct";
import { isRemoteSheetsApi, sheetsApiAuthHeaders, sheetsApiUrl } from "@/lib/sheets-api";
import { resolveFixedDriveRoot } from "@/lib/sheets-export";
import { DEFAULT_DRIVE_ROOT_FOLDER_NAME } from "@/lib/drive-root-folder";
import {
  buildDriveExportPreview,
  normalizeProjectNameInput,
} from "@/lib/survey-process-name";
import { cn } from "@/lib/utils";

export interface DriveDestinationValue {
  rootFolderName: string;
  rootFolderId?: string;
  projectName: string;
  /** Ready for export (unique project name under the fixed root) */
  isValid: boolean;
}

interface DriveDestinationPanelProps {
  value: DriveDestinationValue;
  onChange: Dispatch<SetStateAction<DriveDestinationValue>>;
}

type RootStatus = "idle" | "loading" | "existing" | "create" | "error";

export function DriveDestinationPanel({ value, onChange }: DriveDestinationPanelProps) {
  const [open, setOpen] = useState(true);
  const [rootStatus, setRootStatus] = useState<RootStatus>("idle");
  /** Child folders of the fixed root. undefined = not loaded yet for the current root. */
  const [rootChildren, setRootChildren] = useState<string[] | undefined>(undefined);
  const resolveSeq = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const projectName = value.projectName;
  const projectNormalized = normalizeProjectNameInput(projectName);

  /** Live duplicate check only while the server resolves the fixed root. */
  const checkingUnique = rootStatus === "loading";

  const projectDuplicate = Boolean(
    projectNormalized &&
      rootChildren?.some(
        (folderName) => folderName.toLowerCase() === projectNormalized.toLowerCase()
      )
  );

  const projectError = !projectNormalized
    ? null
    : projectDuplicate
      ? copy.survey.projectNameDuplicate
      : null;

  /**
   * The only user input is the project name. The fixed root is resolved
   * server-side at export, so a failed pre-check does not block validity.
   */
  const isValid = Boolean(
    projectNormalized && !checkingUnique && !projectDuplicate
  );

  const pathPreview = buildDriveExportPreview(
    projectName,
    value.rootFolderName || DEFAULT_DRIVE_ROOT_FOLDER_NAME
  );

  const computeIsValid = useCallback(
    (
      next: DriveDestinationValue,
      ctx: { status: RootStatus; children?: string[] }
    ) => {
      const project = normalizeProjectNameInput(next.projectName);
      if (!project || ctx.status === "loading") return false;
      const duplicate = (ctx.children ?? []).some(
        (n) => n.toLowerCase() === project.toLowerCase()
      );
      return !duplicate;
    },
    []
  );

  const pushValue = useCallback(
    (patch: Partial<DriveDestinationValue>) => {
      onChange((prev) => {
        const next = { ...prev, ...patch };
        return {
          ...next,
          isValid: computeIsValid(next, {
            status: rootStatus,
            children: rootChildren,
          }),
        };
      });
    },
    [computeIsValid, onChange, rootChildren, rootStatus]
  );

  /**
   * Resolve the fixed root + its children via the server (service account)
   * for live duplicate checks. Failure is non-blocking — export re-checks.
   */
  const resolveFixedRoot = useCallback(async () => {
    const seq = ++resolveSeq.current;
    setRootStatus("loading");
    setRootChildren(undefined);

    const applyRoot = (resolved: { id?: string; name?: string; children?: string[] }) => {
      const children = Array.isArray(resolved.children)
        ? resolved.children.filter((c): c is string => typeof c === "string")
        : [];
      const status: RootStatus = resolved.id ? "existing" : "create";
      setRootChildren(children);
      setRootStatus(status);
      onChange((prev) => {
        const next: DriveDestinationValue = {
          ...prev,
          rootFolderName: resolved.name || prev.rootFolderName,
          rootFolderId: resolved.id,
        };
        return {
          ...next,
          isValid: computeIsValid(next, { status, children }),
        };
      });
    };

    try {
      // Static host + embedded credential → resolve directly in the browser
      // (insecure path — see lib/google-direct.ts).
      if (
        isPreviewEnvironment() &&
        !isRemoteSheetsApi() &&
        isDirectDriveConfigured()
      ) {
        const token = await getDirectDriveAccessToken();
        const root = await resolveFixedDriveRoot(token);
        if (seq !== resolveSeq.current) return;
        applyRoot(root);
        return;
      }

      const res = await fetch(sheetsApiUrl("root"), {
        headers: await sheetsApiAuthHeaders(),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        name?: string;
        children?: string[];
      } | null;
      if (seq !== resolveSeq.current) return;
      if (!res.ok || !data?.ok) {
        setRootStatus("error");
        return;
      }
      applyRoot(data);
    } catch {
      if (seq !== resolveSeq.current) return;
      setRootStatus("error");
    }
  }, [computeIsValid, onChange]);

  const resolveFixedRootRef = useRef(resolveFixedRoot);
  resolveFixedRootRef.current = resolveFixedRoot;

  // Keep isValid in sync when async checks finish
  useEffect(() => {
    onChange((prev) => (prev.isValid === isValid ? prev : { ...prev, isValid }));
  }, [isValid, onChange]);

  useEffect(() => {
    if (!open) return;
    void resolveFixedRootRef.current();
  }, [open]);

  const canAutoCollapse = open && isValid;

  useEffect(() => {
    if (!canAutoCollapse) return;

    const isOutsidePanel = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (panelRef.current?.contains(target)) return false;
      if (target instanceof Element && target.closest('[role="listbox"]')) return false;
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isOutsidePanel(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [canAutoCollapse]);

  const showProjectAvailable =
    Boolean(projectNormalized) && !projectDuplicate && !checkingUnique;

  return (
    <div ref={panelRef} className="ui-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ui-card-header w-full text-left hover:bg-muted/20 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-base font-medium">{copy.survey.destinationTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {pathPreview}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-180"
          )}
        />
      </button>

      <CollapsiblePanel open={open}>
        <div className="ui-card-body border-t border-border/60 space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="drive-root-folder" className="text-sm font-medium">
                {copy.survey.rootFolder}
                <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />
              </label>
              <Input
                id="drive-root-folder"
                value={value.rootFolderName || DEFAULT_DRIVE_ROOT_FOLDER_NAME}
                disabled
                className="h-10"
                aria-readonly
              />
              {rootStatus === "loading" ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  {copy.survey.rootFolderLoading}
                </p>
              ) : rootStatus === "error" ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {copy.survey.rootFolderUnavailable}
                </p>
              ) : rootStatus === "create" ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 shrink-0" />
                  {copy.survey.rootFolderWillCreate}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {copy.survey.rootFolderFixedHint}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="project-name" className="text-sm font-medium">
                {copy.survey.projectName}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => pushValue({ projectName: e.target.value })}
                placeholder={copy.survey.projectNamePlaceholder}
                className={cn(
                  "h-10",
                  projectError && "border-destructive focus-visible:ring-destructive/30"
                )}
                aria-invalid={Boolean(projectError)}
              />
              {checkingUnique && projectNormalized ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  {copy.survey.projectNameChecking}
                </p>
              ) : projectError ? (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {projectError}
                </p>
              ) : showProjectAvailable ? (
                <p className="flex items-center gap-1 text-xs text-lumen">
                  <Check className="h-3 w-3 shrink-0" />
                  {copy.survey.projectNameAvailable}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {copy.survey.projectNameHint}
                </p>
              )}
            </div>
          </div>

          <p className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground font-mono">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-all">{pathPreview}</span>
          </p>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
