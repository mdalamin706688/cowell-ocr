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

function normalizeChildNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = normalizeProjectNameInput(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

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
  /**
   * Child project folders keyed by root folder id.
   * Missing key = not loaded yet for that root (must not treat as "available").
   */
  const [childrenByRootId, setChildrenByRootId] = useState<Record<string, string[]>>({});
  const [loadingChildrenRootId, setLoadingChildrenRootId] = useState<string | null>(null);
  const childrenFetchSeq = useRef(0);
  const rootsSeq = useRef(0);
  const childrenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  const childrenForCurrentRoot =
    effectiveRootFolderId && Object.prototype.hasOwnProperty.call(childrenByRootId, effectiveRootFolderId)
      ? childrenByRootId[effectiveRootFolderId]
      : undefined;

  const childrenReady =
    rootStatus !== "existing" ||
    (Boolean(effectiveRootFolderId) && childrenForCurrentRoot !== undefined);

  const checkingUnique =
    rootStatus === "existing" &&
    Boolean(effectiveRootFolderId) &&
    (loadingChildrenRootId === effectiveRootFolderId || childrenForCurrentRoot === undefined);

  const projectDuplicate = Boolean(
    projectNormalized &&
      effectiveRootFolderId &&
      childrenForCurrentRoot?.some(
        (folderName) => folderName.toLowerCase() === projectNormalized.toLowerCase()
      )
  );

  const rootError =
    accountEmail && !rootNormalized
      ? copy.survey.rootFolderRequired
      : rootStatus === "stale"
        ? copy.survey.rootFolderGone
        : null;

  const projectError = !projectNormalized
    ? null
    : projectDuplicate
      ? copy.survey.projectNameDuplicate
      : null;

  /**
   * Valid only when uniqueness is proven for the *current* root.
   * Switching JBC-COWELL 2 → JBC-COWELL must re-check that root's children.
   */
  const isValid = Boolean(
    accountEmail &&
      rootsLoaded &&
      !rootsLoading &&
      rootNormalized &&
      projectNormalized &&
      (rootStatus === "existing" || rootStatus === "create") &&
      childrenReady &&
      !checkingUnique &&
      !projectDuplicate
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
        childrenByRootId: Record<string, string[]>;
        loadingChildrenRootId: string | null;
        rootsLoaded: boolean;
        rootsLoading: boolean;
        accountEmail?: string;
      } = {
        options,
        childrenByRootId,
        loadingChildrenRootId,
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
      if (!match) {
        // New root will be created — no existing children to conflict with
        return !next.rootFolderId;
      }
      const rootId = match.id;
      if (!rootId) return false;
      if (!Object.prototype.hasOwnProperty.call(ctx.childrenByRootId, rootId)) return false;
      if (ctx.loadingChildrenRootId === rootId) return false;
      const children = ctx.childrenByRootId[rootId] || [];
      const duplicate = children.some((n) => n.toLowerCase() === project.toLowerCase());
      return !duplicate;
    },
    [accountEmail, childrenByRootId, loadingChildrenRootId, options, rootsLoaded, rootsLoading]
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

  const invalidateChildrenForRoot = useCallback((rootId?: string) => {
    if (!rootId) return;
    setChildrenByRootId((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, rootId)) return prev;
      const next = { ...prev };
      delete next[rootId];
      return next;
    });
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
              childrenByRootId,
              loadingChildrenRootId: match.id || null,
              rootsLoaded: true,
              rootsLoading: false,
              accountEmail: email,
            }),
          };
        });
        return;
      }

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
            childrenByRootId: {},
            loadingChildrenRootId: null,
            rootsLoaded: true,
            rootsLoading: false,
            accountEmail: email,
          }),
        };
      });
    },
    [childrenByRootId, computeIsValid, onChange]
  );

  const refreshFolderOptions = useCallback(
    async (email: string, accessToken: string) => {
      const seq = ++rootsSeq.current;
      setRootsLoading(true);
      try {
        let live = await listDriveRootFolders(accessToken);
        if (seq !== rootsSeq.current) return [];

        const selectedId = valueRef.current.rootFolderId?.trim();
        if (selectedId) {
          const meta = await verifyDriveFolder(accessToken, selectedId);
          if (!meta) {
            live = live.filter((f) => f.id !== selectedId);
            invalidateChildrenForRoot(selectedId);
          }
        }

        const finalOptions = syncRootFolderHistoryWithLive(email, live);
        if (seq !== rootsSeq.current) return [];

        // Drop child caches for roots that no longer exist
        const liveIds = new Set(finalOptions.map((o) => o.id).filter(Boolean) as string[]);
        setChildrenByRootId((prev) => {
          const next: Record<string, string[]> = {};
          for (const [id, names] of Object.entries(prev)) {
            if (liveIds.has(id)) next[id] = names;
          }
          return next;
        });

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
    [invalidateChildrenForRoot, reconcileSelectionWithLive]
  );

  const refreshFolderOptionsRef = useRef(refreshFolderOptions);
  refreshFolderOptionsRef.current = refreshFolderOptions;

  const loadChildFolders = useCallback(async (parentId: string, accessToken: string) => {
    const seq = ++childrenFetchSeq.current;
    setLoadingChildrenRootId(parentId);
    try {
      const meta = await verifyDriveFolder(accessToken, parentId);
      if (seq !== childrenFetchSeq.current) return;
      if (!meta) {
        setChildrenByRootId((prev) => {
          const next = { ...prev };
          delete next[parentId];
          return next;
        });
        const session = getConnectedGoogleDrive();
        if (session) void refreshFolderOptionsRef.current(session.email, session.accessToken);
        return;
      }
      const children = await listDriveChildFolders(accessToken, parentId);
      if (seq !== childrenFetchSeq.current) return;
      setChildrenByRootId((prev) => ({
        ...prev,
        [parentId]: normalizeChildNames(children.map((c) => c.name)),
      }));
    } catch {
      if (seq !== childrenFetchSeq.current) return;
      // Fail closed: empty list means "unknown" was avoided by deleting cache key
      setChildrenByRootId((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });
    } finally {
      if (seq === childrenFetchSeq.current) {
        setLoadingChildrenRootId((current) => (current === parentId ? null : current));
      }
    }
  }, []);

  const scheduleChildFolderLoad = useCallback(
    (parentId: string, accessToken: string, delayMs = 150) => {
      if (childrenTimer.current) clearTimeout(childrenTimer.current);
      childrenTimer.current = setTimeout(() => {
        childrenTimer.current = null;
        void loadChildFolders(parentId, accessToken);
      }, delayMs);
    },
    [loadChildFolders]
  );

  const applyRootSelection = useCallback(
    (name: string, id: string | undefined) => {
      // Switching roots must never reuse another root's child list for "available"
      childrenFetchSeq.current += 1;
      if (childrenTimer.current) {
        clearTimeout(childrenTimer.current);
        childrenTimer.current = null;
      }
      setLoadingChildrenRootId(id || null);
      pushValue({
        rootFolderName: name,
        rootFolderId: id,
        googleAccountEmail: accountEmail,
      });
    },
    [accountEmail, pushValue]
  );

  const commitRootFolder = useCallback(
    (raw: string) => {
      const name = normalizeFolderNameInput(raw);
      if (!name) {
        applyRootSelection("", undefined);
        return;
      }
      const match = findLiveRootFolder(optionsRef.current, name);
      if (accountEmail && match?.id) {
        writeLastRootFolder({ name: match.name, id: match.id }, accountEmail);
      }
      applyRootSelection(match?.name || name, match?.id);
    },
    [accountEmail, applyRootSelection]
  );

  // Keep isValid in sync when async checks finish
  useEffect(() => {
    onChange((prev) => (prev.isValid === isValid ? prev : { ...prev, isValid }));
  }, [isValid, onChange]);

  const resetDestinationForAccount = useCallback(
    (email: string, project: string) => {
      childrenFetchSeq.current += 1;
      setChildrenByRootId({});
      setLoadingChildrenRootId(null);
      onChange({
        projectName: project,
        rootFolderName: "",
        rootFolderId: undefined,
        googleAccountEmail: email,
        isValid: false,
      });
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (childrenTimer.current) clearTimeout(childrenTimer.current);
    };
  }, []);

  useEffect(() => {
    const session = getConnectedGoogleDrive();
    if (session) setAccountEmail(session.email);
  }, []);

  useEffect(() => {
    if (!open) return;
    const session = getConnectedGoogleDrive();
    if (!session) return;
    setAccountEmail(session.email);
    void refreshFolderOptionsRef.current(session.email, session.accessToken);
  }, [open]);

  /**
   * Always load children for the current existing root (even before project name),
   * and always re-bind uniqueness to that root's id — never another folder's cache.
   */
  useEffect(() => {
    const session = getConnectedGoogleDrive();
    if (!session || rootStatus !== "existing" || !effectiveRootFolderId) {
      setLoadingChildrenRootId(null);
      return;
    }

    const alreadyLoaded = Object.prototype.hasOwnProperty.call(
      childrenByRootId,
      effectiveRootFolderId
    );
    if (alreadyLoaded) {
      // Use cached children for this root immediately (e.g. switch back to JBC-COWELL)
      setLoadingChildrenRootId((current) =>
        current === effectiveRootFolderId ? null : current
      );
      return;
    }

    setLoadingChildrenRootId(effectiveRootFolderId);
    scheduleChildFolderLoad(effectiveRootFolderId, session.accessToken, 120);
    return () => {
      if (childrenTimer.current) clearTimeout(childrenTimer.current);
    };
    // Reload when root changes — childrenByRootId read for cache hit only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [effectiveRootFolderId, rootStatus, scheduleChildFolderLoad]);

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
    if (accountEmail) writeLastRootFolder({ name, id: pref.id }, accountEmail);
    // Force a fresh child fetch for this root (don't trust stale cache after Drive edits)
    invalidateChildrenForRoot(pref.id);
    applyRootSelection(name, pref.id);
  };

  const connected = Boolean(accountEmail);

  const canAutoCollapse =
    open &&
    connected &&
    isValid &&
    !busy &&
    !checkingUnique;

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
    Boolean(projectNormalized) &&
    !projectDuplicate &&
    !checkingUnique &&
    ((rootStatus === "existing" && childrenReady) || rootStatus === "create");

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
                      const normalized = normalizeFolderNameInput(next);
                      const match = findLiveRootFolder(optionsRef.current, normalized);
                      applyRootSelection(next, match?.id);
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
