"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/copy";
import { cognitoChangePassword } from "@/lib/cognito-auth";
import { isCognitoConfigured } from "@/lib/cognito-config";

export function ChangePasswordCard() {
  const cognito = isCognitoConfigured();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!cognito) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next.length < 8) {
      setError(copy.auth.changePasswordHint);
      return;
    }
    if (next !== confirm) {
      setError("新しいパスワードが一致しません");
      return;
    }
    setBusy(true);
    try {
      await cognitoChangePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.loginFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ui-card">
      <div className="ui-card-header">
        <div>
          <p className="text-base font-medium">{copy.auth.changePassword}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{copy.auth.changePasswordHint}</p>
        </div>
      </div>
      <form onSubmit={(e) => void submit(e)} className="ui-card-body border-t border-border/60 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">{copy.auth.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{copy.auth.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{copy.auth.confirmNewPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-lumen">{copy.auth.changePasswordSuccess}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {copy.auth.changePasswordSubmit}
          </Button>
        </div>
      </form>
    </div>
  );
}
