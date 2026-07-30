"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { UsersPageSkeleton } from "@/components/layout/content-skeleton";
import { ChangePasswordCard } from "@/components/users/change-password-card";
import { copy } from "@/lib/copy";
import {
  createCognitoUser,
  deleteCognitoUser,
  formatUserStatus,
  listCognitoUsers,
  type CognitoUserRow,
} from "@/lib/cognito-admin";
import { isCognitoAdminConfigured, isCognitoConfigured } from "@/lib/cognito-config";
import { isPreviewEnvironment, isSessionSuperAdmin } from "@/lib/client-auth";
import { useWorkspaceSession } from "@/contexts/workspace-session";
import { cn } from "@/lib/utils";

const DEMO_USERS: CognitoUserRow[] = [
  {
    username: "admin@cowell.co.jp",
    email: "admin@cowell.co.jp",
    status: "CONFIRMED",
    enabled: true,
    groups: ["super_admin"],
  },
];

export function UsersPageContent() {
  const session = useWorkspaceSession();
  const cognito = isCognitoConfigured();
  const adminReady = isCognitoAdminConfigured();
  const previewDemo = isPreviewEnvironment() && !cognito;

  const [users, setUsers] = useState<CognitoUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CognitoUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (previewDemo) {
        setUsers(DEMO_USERS);
        return;
      }
      if (!adminReady) {
        setUsers([]);
        return;
      }
      setUsers(await listCognitoUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.serviceUnavailable);
      setUsers([]);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [adminReady, previewDemo]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      if (previewDemo) {
        setUsers((prev) => [
          ...prev,
          {
            username: email.trim(),
            email: email.trim(),
            status: "FORCE_CHANGE_PASSWORD",
            enabled: true,
            groups: [],
          },
        ]);
        setShowAdd(false);
        setEmail("");
        setDisplayName("");
        setTempPassword("");
        return;
      }
      await createCognitoUser({
        email,
        temporaryPassword: tempPassword,
        name: displayName,
      });
      setShowAdd(false);
      setEmail("");
      setDisplayName("");
      setTempPassword("");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.serviceUnavailable);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      if (previewDemo) {
        setUsers((prev) => prev.filter((u) => u.username !== deleteTarget.username));
      } else {
        await deleteCognitoUser(deleteTarget.username);
        await loadUsers();
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.serviceUnavailable);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = isSessionSuperAdmin(session) || previewDemo;

  // First visit: full content skeleton (shell already mounted).
  if (!initialLoadDone) {
    return <UsersPageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/80 text-lumen shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-title text-xl sm:text-2xl">{copy.users.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{copy.users.subtitle}</p>
            {previewDemo && (
              <p className="mt-1 text-xs text-muted-foreground">{copy.users.previewNote}</p>
            )}
          </div>
        </div>
        {(adminReady || previewDemo) && (
          <Button onClick={() => setShowAdd(true)} disabled={loading}>
            <Plus className="h-4 w-4" />
            {copy.users.addUser}
          </Button>
        )}
      </div>

      {!adminReady && !previewDemo && cognito && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {copy.users.adminNotConfigured}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{copy.users.email}</th>
                <th className="px-4 py-3 font-medium">{copy.users.status}</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">{copy.users.created}</th>
                <th className="px-4 py-3 font-medium w-24">{copy.users.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    {copy.users.loading}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    {copy.users.empty}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.username} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-medium">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatUserStatus(user.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {user.createdAt
                        ? user.createdAt.toLocaleDateString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canDelete && user.email !== session.email ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{copy.users.delete}</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!canDelete && adminReady && (
          <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border/60">
            {copy.users.superAdminOnly}
          </p>
        )}
      </div>

      <ChangePasswordCard />

      <OverlayDialog
        open={showAdd}
        onClose={() => !creating && setShowAdd(false)}
        label={copy.users.addUser}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">{copy.users.addUser}</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">{copy.users.email}</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">{copy.users.displayName}</Label>
            <Input
              id="new-user-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">{copy.users.tempPassword}</Label>
            <Input
              id="new-user-password"
              type="password"
              minLength={8}
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{copy.users.tempPasswordHint}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={creating}>
              {copy.users.deleteCancel}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {creating ? copy.users.creating : copy.users.createSubmit}
            </Button>
          </div>
          </form>
        </div>
      </OverlayDialog>

      <OverlayDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        label={copy.users.deleteTitle}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">{copy.users.deleteTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {deleteTarget ? copy.users.deleteBody(deleteTarget.email) : ""}
          </p>
          <div className="flex justify-end gap-2 pt-6">
          <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            {copy.users.deleteCancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className={cn(deleting && "opacity-80")}
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.users.deleteConfirm}
          </Button>
          </div>
        </div>
      </OverlayDialog>
    </div>
  );
}
