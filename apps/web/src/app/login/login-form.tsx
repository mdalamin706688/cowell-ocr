"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { copy } from "@/lib/copy";
import {
  consumeFlash,
  demoLogin,
  FLASH_LOGGED_OUT,
  getDemoEmail,
  getDemoPassword,
  isPreviewEnvironment,
  setClientSession,
} from "@/lib/client-auth";

const DEV_AUTO_LOGIN = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(getDemoEmail());
  const [password, setPassword] = useState(getDemoPassword());
  const [previewMode, setPreviewMode] = useState(false);
  const [loggedOutMessage, setLoggedOutMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoLoginAttempted = useRef(false);

  useEffect(() => {
    const preview = isPreviewEnvironment();
    setPreviewMode(preview);
    // Production server: clear prefilled demo creds unless dev auto-login
    if (!preview && !DEV_AUTO_LOGIN) {
      setEmail("");
      setPassword("");
    }

    const fromLegacyLogout = searchParams.get("from") === "logout";
    if (consumeFlash(FLASH_LOGGED_OUT) || fromLegacyLogout) {
      setLoggedOutMessage(true);
    }
    if (fromLegacyLogout) {
      router.replace("/login/");
    }
  }, [router, searchParams]);

  const login = useCallback(
    async (loginEmail: string, loginPassword: string) => {
      setLoading(true);
      setError(null);

      try {
        const useClientAuth = isPreviewEnvironment();

        if (useClientAuth) {
          const user = demoLogin(loginEmail, loginPassword);
          if (!user) {
            throw new Error(copy.errors.loginFailed);
          }
          setClientSession(user);
          router.push("/dashboard");
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || copy.errors.loginFailed);
        }

        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errors.loginFailed);
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!DEV_AUTO_LOGIN || autoLoginAttempted.current || loggedOutMessage) return;
    autoLoginAttempted.current = true;
    void login(getDemoEmail(), getDemoPassword());
  }, [login, loggedOutMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Preview: always use demo creds — browser translation can corrupt input values
    if (isPreviewEnvironment()) {
      await login(getDemoEmail(), getDemoPassword());
      return;
    }
    await login(email, password);
  };

  const heroLines = copy.login.heroTitle.split("\n");

  return (
    <div className="min-h-screen flex paper-canvas">
      <div className="hidden lg:flex lg:w-[48%] forest-hero flex-col justify-between p-10 sm:p-12">
        <Logo size="lg" variant="light" />

        <div className="relative z-10 max-w-md">
          <p className="text-eyebrow text-lumen-glow/80">{copy.login.heroEyebrow}</p>
          <h1 className="text-display mt-4 text-[1.85rem] text-white leading-snug">
            {heroLines.map((line, i) => (
              <span key={i}>{line}{i < heroLines.length - 1 && <br />}</span>
            ))}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/55">
            {copy.login.heroBody}
          </p>
          <div className="copper-rule mt-8" />
        </div>

        <p className="relative z-10 text-xs text-white/25 tracking-wide">
          {copy.login.footer}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          <div className="form-surface">
            <h2 className="font-display text-xl font-semibold tracking-tight">{copy.login.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.login.subtitle}</p>

            {previewMode && (
              <p className="mt-4 rounded-lg border border-lumen/20 bg-accent/50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                プレビュー環境です。入力済みの認証情報で「サインイン」をクリックしてください。
              </p>
            )}

            {loggedOutMessage && (
              <p className="mt-4 rounded-lg border border-lumen/20 bg-accent/50 px-3 py-2.5 text-sm">
                {copy.login.loggedOut}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4 notranslate"
              translate="no"
              autoComplete="on"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-label">{copy.login.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={previewMode ? getDemoEmail() : undefined}
                  readOnly={previewMode}
                  required={!previewMode}
                  autoComplete="email"
                  translate="no"
                  className="notranslate"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-label">{copy.login.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={previewMode ? "••••••••" : undefined}
                  readOnly={previewMode}
                  required={!previewMode}
                  autoComplete="current-password"
                  translate="no"
                  className="notranslate"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{copy.login.submitting}</>
                ) : (
                  <>{copy.login.submit}<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
