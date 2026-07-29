"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AlertCircle, Check, ChevronDown, FolderOpen, Loader2 } from "lucide-react";
import { ComboboxField } from "@/components/ui/combobox-field";
import { CollapsiblePanel } from "@/components/ui/collapsible-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import {
  findLiveRootFolder,
  normalizeFolderNameInput,
  syncRootFolderHistoryWithLive,
  type DriveRootFolderPref,
  writeLastRootFolder,
} from "@/lib/drive-root-folder";
import {
  connectGoogleDrive,
  getConnectedGoogleDrive,
  isGoogleClientConfigured,
} from "@/lib/google-auth-client";
import {
  listDriveChildFolders,
  listDriveRootFolders,
  verifyDriveFolder,
} from "@/lib/sheets-export";
import {
  buildDriveExportPreview,
  normalizeProjectNameInput,
} from "@/lib/survey-process-name";
import { cn } from "@/lib/utils";

export interface DriveDestinationValue {
  rootFolderName: string;
  rootFolderId?: string;
  projectName: string;
  googleAccountEmail?: string;
  /** Ready for export (root + unique project name) */
  isValid: boolean;
}

interface DriveDestinationPanelProps {
  value: DriveDestinationValue;
  onChange: Dispatch<SetStateAction<DriveDestinationValue>>;
}

type RootStatus = "empty" | "loading" | "existing" | "create" | "stale";

export function DriveDestinationPanel({ value, onChange }: DriveDestinationPanelProps) {
  const googleReady = isGoogleClientConfigured();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | undefined>(
    () => getConnectedGoogleDrive()?.email || value.googleAccountEmail
  );
  /** Live Drive folders only — never ghost cache */
  const [options, setOptions] = useState<DriveRootFolderPref[]>([]);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsLoaded, setRootsLoaded] = useState(false);
  const [childFolderNames, setChildFolderNames] = useState<string[]>([]);
  const [checkingUnique, setCheckingUnique] = useState(false);
  const uniquenessSeq = useRef(0);
  const rootsSeq = useRef(0);
  const projectCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const rootName = value.rootFolderName;
  const projectName = value.projectName;
  const rootNormalized = normalizeFolderNameInput(rootName);
  const projectNormalized = normalizeProjectNameInput(projectName);

  const liveMatch = useMemo(
    () => findLiveRootFolder(options, rootNormalized, value.rootFolderId),
    [options, rootNormalized, value.rootFolderId]
  );

  const effectiveRootFolderId = liveMatch?.id;

  const rootStatus: RootStatus = !rootsLoaded || rootsLoading
    ? rootNormalized
      ? "loading"
      : "empty"
    : !rootNormalized
      ? "empty"
      : liveMatch
        ? "existing"
        : value.rootFolderId
          ? "stale"
          : "create";

  const isProjectDuplicate = useCallback(
    (name: string) => {
      const normalized = normalizeProjectNameInput(name);
      if (!normalized || !effectiveRootFolderId) return false;
      return childFolderNames.some(
        (folderName) => folderName.toLowerCase() === normalized.toLowerCase()
      );
    },
    [childFolderNames, effectiveRootFolderId]
  );

  const rootError =
    accountEmail && !rootNormalized
      ? copy.survey.rootFolderRequired
      : rootStatus === "stale"
        ? copy.survey.rootFolderGone
        : null;

  const projectDuplicate = isProjectDuplicate(projectName);

  const projectError = !projectNormalized
    ? null
    : projectDuplicate
      ? copy.survey.projectNameDuplicate
      : null;

  /**
   * Valid when Google connected + root resolved + project unique.
   * - existing root: uniqueness must finish against live children
   * - new root (create): no children yet → unique by definition
   * - stale / still loading roots: not valid
   */
  const isValid = Boolean(
    accountEmail &&
      rootsLoaded &&
      !rootsLoading &&
      rootNormalized &&
      projectNormalized &&
      (rootStatus === "existing" || rootStatus === "create") &&
      !projectDuplicate &&
      !(rootStatus === "existing" && checkingUnique)
  );

  const pathPreview = buildDriveExportPreview(projectName, rootName);

  const comboboxOptions = useMemo(
    () => options.map((opt) => ({ id: opt.id, label: opt.name })),
    [options]
  );

  const computeIsValid = useCallback(
    (
      next: DriveDestinationValue,
      ctx: {
        options: DriveRootFolderPref[];
        childFolderNames: string[];
        checkingUnique: boolean;
        rootsLoaded: boolean;
        rootsLoading: boolean;
        accountEmail?: string;
      } = {
        options,
        childFolderNames,
        checkingUnique,
        rootsLoaded,
        rootsLoading,
        accountEmail,
      }
    ) => {
      const root = normalizeFolderNameInput(next.rootFolderName);
      const project = normalizeProjectNameInput(next.projectName);
      if (!ctx.accountEmail || !ctx.rootsLoaded || ctx.rootsLoading || !root || !project) {
        return false;
      }
      const match = findLiveRootFolder(ctx.options, root, next.rootFolderId);
      if (next.rootFolderId && !match) return false;
      const status: RootStatus = match ? "existing" : next.rootFolderId ? "stale" : "create";
      if (status !== "existing" && status !== "create") return false;
      const duplicate =
        Boolean(match?.id) &&
        ctx.childFolderNames.some((n) => n.toLowerCase() === project.toLowerCase());
      if (duplicate) return false;
      if (status === "existing" && ctx.checkingUnique) return false;
      return true;
    },
    [accountEmail, childFolderNames, checkingUnique, options, rootsLoaded, rootsLoading]
  );

  const pushValue = useCallback(
    (patch: Partial<DriveDestinationValue>) => {
      onChange((prev) => {
        const next = { ...prev, ...patch };
        return { ...next, isValid: computeIsValid(next) };
      });
    },
    [computeIsValid, onChange]
  );

  const resetRootSelection = useCallback(() => {
    setChildFolderNames([]);
    setCheckingUnique(false);
    uniquenessSeq.current += 1;
  }, []);

  const reconcileSelectionWithLive = useCallback(
    (live: DriveRootFolderPref[], email: string) => {
      const current = valueRef.current;
      const name = normalizeFolderNameInput(current.rootFolderName);
      if (!name) {
        onChange({
          ...current,
          rootFolderId: undefined,
          googleAccountEmail: email,
          isValid: false,
        });
        return;
      }

      const match = findLiveRootFolder(live, name, current.rootFolderId);
      if (match) {
        onChange((prev) => {
          const next = {
            ...prev,
            rootFolderName: match.name,
            rootFolderId: match.id,
            googleAccountEmail: email,
          };
          return {
            ...next,
            isValid: computeIsValid(next, {
              options: live,
              childFolderNames: [],
              checkingUnique: Boolean(match.id),
              rootsLoaded: true,
              rootsLoading: false,
              accountEmail: email,
            }),
          };
        });
        return;
      }

      // Typed name no longer in Drive (deleted) — keep name as "create new", drop stale id
      onChange((prev) => {
        const next = {
          ...prev,
          rootFolderId: undefined,
          googleAccountEmail: email,
        };
        return {
          ...next,
          isValid: computeIsValid(next, {
            options: live,
            childFolderNames: [],
            checkingUnique: false,
            rootsLoaded: true,
            rootsLoading: false,
            accountEmail: email,
          }),
        };
      });
    },
    [computeIsValid, onChange]
  );

  const refreshFolderOptions = useCallback(
    async (email: string, accessToken: string) => {
      const seq = ++rootsSeq.current;
      setRootsLoading(true);
      try {
        let live = await listDriveRootFolders(accessToken);
        if (seq !== rootsSeq.current) return [];

        // Confirm the selected folder still exists (deleted in Drive → drop from options)
        const selectedId = valueRef.current.rootFolderId?.trim();
        if (selectedId) {
          const meta = await verifyDriveFolder(accessToken, selectedId);
          if (!meta) {
            live = live.filter((f) => f.id !== selectedId);
          }
        }

        const finalOptions = syncRootFolderHistoryWithLive(email, live);
        if (seq !== rootsSeq.current) return [];
        setOptions(finalOptions);
        setRootsLoaded(true);
        reconcileSelectionWithLive(finalOptions, email);
        return finalOptions;
      } catch {
        if (seq !== rootsSeq.current) return [];
        setOptions([]);
        setRootsLoaded(true);
        return [];
      } finally {
        if (seq === rootsSeq.current) setRootsLoading(false);
      }
    },
    [reconcileSelectionWithLive]
  );

  const refreshFolderOptionsRef = useRef(refreshFolderOptions);
  refreshFolderOptionsRef.current = refreshFolderOptions;

  const commitRootFolder = useCallback(
    (raw: string) => {
      const name = normalizeFolderNameInput(raw);
      resetRootSelection();
      if (!name) {
        pushValue({
          rootFolderName: "",
          rootFolderId: undefined,
          googleAccountEmail: accountEmail,
        });
        return;
      }
      const match = findLiveRootFolder(options, name);
      if (accountEmail && match?.id) {
        writeLastRootFolder({ name: match.name, id: match.id }, accountEmail);
      }
      pushValue({
        rootFolderName: match?.name || name,
        rootFolderId: match?.id,
        googleAccountEmail: accountEmail,
      });
    },
    [accountEmail, options, pushValue, resetRootSelection]
  );

  // Keep isValid in sync when async checks finish (folder list / uniqueness)
  useEffect(() => {
    onChange((prev) => (prev.isValid === isValid ? prev : { ...prev, isValid }));
  }, [isValid, onChange]);

  const loadChildFolders = useCallback(async (parentId: string, accessToken: string) => {
    const seq = ++uniquenessSeq.current;
    setCheckingUnique(true);
    try {
      const meta = await verifyDriveFolder(accessToken, parentId);
      if (seq !== uniquenessSeq.current) return;
      if (!meta) {
        setChildFolderNames([]);
        const session = getConnectedGoogleDrive();
        if (session) void refreshFolderOptionsRef.current(session.email, session.accessToken);
        return;
      }
      const children = await listDriveChildFolders(accessToken, parentId);
      if (seq !== uniquenessSeq.current) return;
      setChildFolderNames(
        children
          .map((c) => normalizeProjectNameInput(c.name))
          .filter(Boolean)
      );
    } catch {
      if (seq !== uniquenessSeq.current) return;
      setChildFolderNames([]);
    } finally {
      if (seq === uniquenessSeq.current) setCheckingUnique(false);
    }
  }, []);

  const scheduleChildFolderCheck = useCallback(
    (parentId: string, accessToken: string, delayMs = 200) => {
      if (projectCheckTimer.current) clearTimeout(projectCheckTimer.current);
      projectCheckTimer.current = setTimeout(() => {
        projectCheckTimer.current = null;
        void loadChildFolders(parentId, accessToken);
      }, delayMs);
    },
    [loadChildFolders]
  );

  const resetDestinationForAccount = useCallback(
    (email: string, project: string) => {
      resetRootSelection();
      onChange({
        projectName: project,
        rootFolderName: "",
        rootFolderId: undefined,
        googleAccountEmail: email,
        isValid: false,
      });
    },
    [onChange, resetRootSelection]
  );

  useEffect(() => {
    return () => {
      if (projectCheckTimer.current) clearTimeout(projectCheckTimer.current);
    };
  }, []);

  useEffect(() => {
    const session = getConnectedGoogleDrive();
    if (session) setAccountEmail(session.email);
  }, []);

  // Re-sync from Drive whenever the panel is opened (catches deletes in Drive UI)
  useEffect(() => {
    if (!open) return;
    const session = getConnectedGoogleDrive();
    if (!session) return;
    setAccountEmail(session.email);
    void refreshFolderOptionsRef.current(session.email, session.accessToken);
  }, [open]);

  // Load / refresh child folders when root or project name changes
  useEffect(() => {
    const session = getConnectedGoogleDrive();
    if (!session || !effectiveRootFolderId || rootStatus !== "existing") {
      setChildFolderNames([]);
      setCheckingUnique(false);
      return;
    }
    if (!projectNormalized) {
      setChildFolderNames([]);
      setCheckingUnique(false);
      return;
    }
    scheduleChildFolderCheck(effectiveRootFolderId, session.accessToken, 350);
    return () => {
      if (projectCheckTimer.current) clearTimeout(projectCheckTimer.current);
    };
  }, [effectiveRootFolderId, projectNormalized, rootStatus, scheduleChildFolderCheck]);

  const handleConnect = useCallback(async () => {
    if (!googleReady || busy) return;
    setBusy(true);
    setError(null);
    try {
      const account = await connectGoogleDrive({ switchAccount: true });
      setAccountEmail(account.email);
      resetDestinationForAccount(account.email, value.projectName);
      await refreshFolderOptions(account.email, account.accessToken);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google接続に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [busy, googleReady, refreshFolderOptions, resetDestinationForAccount, value.projectName]);

  const selectRoot = (pref: DriveRootFolderPref) => {
    const name = normalizeFolderNameInput(pref.name);
    if (!name || !pref.id) return;
    resetRootSelection();
    if (accountEmail) writeLastRootFolder({ name, id: pref.id }, accountEmail);
    pushValue({
      rootFolderName: name,
      rootFolderId: pref.id,
      googleAccountEmail: accountEmail,
    });
  };

  const connected = Boolean(accountEmail);

  /** Collapse when destination is complete and user clicks/taps outside the panel. */
  const canAutoCollapse =
    open &&
    connected &&
    isValid &&
    !busy;

  useEffect(() => {
    if (!canAutoCollapse) return;

    const isOutsidePanel = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      if (panelRef.current?.contains(target)) return false;
      // Combobox suggestions render in a body portal — treat as inside the form
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
            {connected ? `${accountEmail} · ${pathPreview}` : copy.survey.driveAccountRequired}
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
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{copy.survey.driveAccount}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {accountEmail || copy.survey.driveAccountNone}
              </p>
            </div>
            {googleReady && (
              <Button
                type="button"
                variant={connected ? "outline" : "default"}
                size="sm"
                disabled={busy}
                onClick={() => void handleConnect()}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {connected ? copy.survey.driveAccountSwitch : copy.survey.driveAccountConnect}
              </Button>
            )}
          </div>

          {connected ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="drive-root-folder" className="text-sm font-medium">
                    {copy.survey.rootFolder}
                    <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <ComboboxField
                    id="drive-root-folder"
                    value={rootName}
                    options={comboboxOptions}
                    placeholder={copy.survey.rootFolderPlaceholder}
                    disabled={busy || rootsLoading}
                    onChange={(next) => {
                      resetRootSelection();
                      const normalized = normalizeFolderNameInput(next);
                      const match = findLiveRootFolder(options, normalized);
                      pushValue({
                        rootFolderName: next,
                        rootFolderId: match?.id,
                        googleAccountEmail: accountEmail,
                      });
                    }}
                    onSelect={(opt) => selectRoot({ name: opt.label, id: opt.id })}
                    onCommit={commitRootFolder}
                    emptyMessage={
                      rootsLoading
                        ? copy.survey.rootFolderLoading
                        : copy.survey.rootFolderEmpty
                    }
                  />
                  {rootsLoading ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {copy.survey.rootFolderLoading}
                    </p>
                  ) : rootError ? (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {rootError}
                    </p>
                  ) : rootStatus === "create" ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 shrink-0" />
                      {copy.survey.rootFolderWillCreate}
                    </p>
                  ) : rootStatus === "existing" ? (
                    <p className="text-xs text-muted-foreground">{copy.survey.rootFolderHint}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {copy.survey.rootFolderSelectExisting}
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
                    onChange={(e) =>
                      pushValue({
                        projectName: e.target.value,
                        googleAccountEmail: accountEmail,
                      })
                    }
                    placeholder={copy.survey.projectNamePlaceholder}
                    className={cn(
                      "h-10",
                      projectError && "border-destructive focus-visible:ring-destructive/30"
                    )}
                    aria-invalid={Boolean(projectError)}
                  />
                  {checkingUnique && projectNormalized && effectiveRootFolderId ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {copy.survey.projectNameChecking}
                    </p>
                  ) : projectError ? (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {projectError}
                    </p>
                  ) : projectNormalized &&
                    rootStatus === "existing" &&
                    effectiveRootFolderId &&
                    !projectDuplicate ? (
                    <p className="flex items-center gap-1 text-xs text-lumen">
                      <Check className="h-3 w-3 shrink-0" />
                      {copy.survey.projectNameAvailable}
                    </p>
                  ) : projectNormalized && rootStatus === "create" ? (
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

              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                {pathPreview}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.survey.driveAccountRequired}</p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </CollapsiblePanel>
    </div>
  );
}
