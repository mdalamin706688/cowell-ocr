"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, FolderOpen, Loader2 } from "lucide-react";
import { ComboboxField } from "@/components/ui/combobox-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import {
  mergeRootFolderOptions,
  normalizeFolderNameInput,
  readRootFolderHistory,
  type DriveRootFolderPref,
  writeLastRootFolder,
} from "@/lib/drive-root-folder";
import {
  connectGoogleDrive,
  getConnectedGoogleDrive,
  isGoogleClientConfigured,
} from "@/lib/google-auth-client";
import { listDriveChildFolders, listDriveRootFolders } from "@/lib/sheets-export";
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
  onChange: (value: DriveDestinationValue) => void;
}

export function DriveDestinationPanel({ value, onChange }: DriveDestinationPanelProps) {
  const googleReady = isGoogleClientConfigured();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | undefined>(
    () => getConnectedGoogleDrive()?.email || value.googleAccountEmail
  );
  const [options, setOptions] = useState<DriveRootFolderPref[]>(() =>
    readRootFolderHistory(accountEmail)
  );
  const [childFolderNames, setChildFolderNames] = useState<string[]>([]);
  const [checkingUnique, setCheckingUnique] = useState(false);
  const uniquenessSeq = useRef(0);

  const rootName = value.rootFolderName;
  const projectName = value.projectName;
  const rootNormalized = normalizeFolderNameInput(rootName);
  const projectNormalized = normalizeProjectNameInput(projectName);

  const rootError = accountEmail && !rootNormalized ? copy.survey.rootFolderRequired : null;

  const projectDuplicate =
    Boolean(projectNormalized) &&
    childFolderNames.some((n) => n.toLowerCase() === projectNormalized.toLowerCase());

  const projectError = !projectNormalized
    ? null
    : projectDuplicate
      ? copy.survey.projectNameDuplicate
      : null;

  const isValid =
    Boolean(accountEmail) &&
    Boolean(rootNormalized) &&
    Boolean(projectNormalized) &&
    !projectDuplicate &&
    !checkingUnique;

  const pathPreview = buildDriveExportPreview(projectName, rootName);

  const comboboxOptions = useMemo(
    () => options.map((opt) => ({ id: opt.id, label: opt.name })),
    [options]
  );

  const computeIsValid = useCallback(
    (next: DriveDestinationValue, checking = checkingUnique) => {
      const root = normalizeFolderNameInput(next.rootFolderName);
      const project = normalizeProjectNameInput(next.projectName);
      const duplicate =
        Boolean(project) &&
        childFolderNames.some((n) => n.toLowerCase() === project.toLowerCase());
      return (
        Boolean(accountEmail) &&
        Boolean(root) &&
        Boolean(project) &&
        !duplicate &&
        !checking
      );
    },
    [accountEmail, childFolderNames, checkingUnique]
  );

  const pushValue = useCallback(
    (patch: Partial<DriveDestinationValue>) => {
      const next = { ...value, ...patch };
      onChange({ ...next, isValid: computeIsValid(next) });
    },
    [computeIsValid, onChange, value]
  );

  // Keep isValid in sync when async checks finish (folder list / uniqueness)
  useEffect(() => {
    if (value.isValid !== isValid) {
      onChange({ ...value, isValid });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when derived validity changes
  }, [isValid, value.projectName, value.rootFolderName, value.rootFolderId]);

  const loadChildFolders = useCallback(async (parentId: string, accessToken: string) => {
    const seq = ++uniquenessSeq.current;
    setCheckingUnique(true);
    try {
      const children = await listDriveChildFolders(accessToken, parentId);
      if (seq !== uniquenessSeq.current) return;
      setChildFolderNames(children.map((c) => c.name));
    } catch {
      if (seq !== uniquenessSeq.current) return;
      setChildFolderNames([]);
    } finally {
      if (seq === uniquenessSeq.current) setCheckingUnique(false);
    }
  }, []);

  const loadFoldersForAccount = useCallback(
    async (email: string, accessToken: string, project: string) => {
      const live = await listDriveRootFolders(accessToken);
      const merged = mergeRootFolderOptions(live, readRootFolderHistory(email));
      setOptions(merged);
      setChildFolderNames([]);
      // Industry standard: no root pre-selected — user must choose
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
    const session = getConnectedGoogleDrive();
    if (!session) return;
    setAccountEmail(session.email);
    void loadFoldersForAccount(session.email, session.accessToken, value.projectName).catch(
      () => setOptions(readRootFolderHistory(session.email))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // When root folder id is known, load its children for uniqueness checks
  useEffect(() => {
    const session = getConnectedGoogleDrive();
    if (!session || !value.rootFolderId) {
      setChildFolderNames([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadChildFolders(value.rootFolderId!, session.accessToken);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [value.rootFolderId, loadChildFolders]);

  const handleConnect = useCallback(async () => {
    if (!googleReady || busy) return;
    setBusy(true);
    setError(null);
    try {
      const account = await connectGoogleDrive({ switchAccount: true });
      setAccountEmail(account.email);
      await loadFoldersForAccount(account.email, account.accessToken, value.projectName);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google接続に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [busy, googleReady, loadFoldersForAccount, value.projectName]);

  const selectRoot = (pref: DriveRootFolderPref) => {
    const name = normalizeFolderNameInput(pref.name);
    if (!name) return;
    if (accountEmail) writeLastRootFolder({ name, id: pref.id }, accountEmail);
    pushValue({
      rootFolderName: name,
      rootFolderId: pref.id,
      googleAccountEmail: accountEmail,
    });
  };

  const connected = Boolean(accountEmail);

  return (
    <div className="ui-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="ui-card-header w-full text-left hover:bg-muted/20 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-base font-medium">{copy.survey.destinationTitle}</p>
          {!open && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {connected ? `${accountEmail} · ${pathPreview}` : copy.survey.driveAccountRequired}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
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
                    disabled={busy}
                    onChange={(next) =>
                      pushValue({
                        rootFolderName: next,
                        rootFolderId: undefined,
                        googleAccountEmail: accountEmail,
                      })
                    }
                    onSelect={(opt) => selectRoot({ name: opt.label, id: opt.id })}
                    onCommit={(raw) => {
                      const name = normalizeFolderNameInput(raw);
                      const match = options.find(
                        (o) => o.name.toLowerCase() === name.toLowerCase()
                      );
                      if (name) selectRoot({ name, id: match?.id });
                      else
                        pushValue({
                          rootFolderName: "",
                          rootFolderId: undefined,
                          googleAccountEmail: accountEmail,
                        });
                    }}
                    emptyMessage={copy.survey.rootFolderEmpty}
                  />
                  {rootError && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {rootError}
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
                  {checkingUnique && projectNormalized && value.rootFolderId ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {copy.survey.projectNameChecking}
                    </p>
                  ) : projectError ? (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {projectError}
                    </p>
                  ) : projectNormalized && value.rootFolderId ? (
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
      )}
    </div>
  );
}
