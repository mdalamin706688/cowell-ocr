"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { LoginSkeleton } from "@/components/layout/content-skeleton";
import { StaggerItem, StaggerReveal } from "@/components/motion/stagger-reveal";
import { copy } from "@/lib/copy";
import { useNavigation } from "@/contexts/navigation-context";
import { versionedAppRoute } from "@/lib/route-version";
import {
  cognitoCompleteNewPassword,
  cognitoConfirmForgotPassword,
  cognitoForgotPassword,
  cognitoSignIn,
} from "@/lib/cognito-auth";
import { isCognitoConfigured } from "@/lib/cognito-config";
import {
  consumeFlash,
  createPreviewSession,
  FLASH_LOGGED_OUT,
  getDemoEmail,
  getDemoPassword,
  isPreviewEnvironment,
  setClientSession,
} from "@/lib/client-auth";

const DEV_AUTO_LOGIN = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";

export function LoginForm() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const searchParams = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const [loggedOutMessage, setLoggedOutMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPasswordChallenge, setNewPasswordChallenge] = useState<{
    session: string;
    username: string;
  } | null>(null);
  const [loginMode, setLoginMode] = useState<"signin" | "forgot_request" | "forgot_confirm">(
    "signin"
  );
  const [forgotEmail, setForgotEmail] = useState("");
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const forgotCodeRef = useRef<HTMLInputElement>(null);
  const forgotPasswordRef = useRef<HTMLInputElement>(null);
  const autoLoginAttempted = useRef(false);
  const cognito = isCognitoConfigured();
  // Demo skip-login only when Cognito is not configured (static preview fallback)
  const previewDemo = isPreviewEnvironment() && !cognito;
  const prefilled = previewDemo || DEV_AUTO_LOGIN;

  const goDashboard = useCallback(() => {
    startNavigation("/dashboard/");
    router.replace(versionedAppRoute("/dashboard/"));
  }, [router, startNavigation]);

  const completePreviewLogin = useCallback(() => {
    setClientSession(createPreviewSession());
    goDashboard();
  }, [goDashboard]);

  useEffect(() => {
    router.prefetch(versionedAppRoute("/dashboard/"));
    router.prefetch(versionedAppRoute("/users/"));
    router.prefetch(versionedAppRoute("/survey/new/"));
  }, [router]);

  useEffect(() => {
    const fromLegacyLogout = searchParams.get("from") === "logout";
    if (consumeFlash(FLASH_LOGGED_OUT) || fromLegacyLogout) {
      setLoggedOutMessage(true);
    }
    if (fromLegacyLogout) {
      router.replace(versionedAppRoute("/login/"));
    }
  }, [router, searchParams]);

  const login = useCallback(
    async (loginEmail: string, loginPassword: string) => {
      if (previewDemo) {
        completePreviewLogin();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (cognito) {
          const result = await cognitoSignIn(loginEmail, loginPassword);
          if (result.status === "new_password_required") {
            setNewPasswordChallenge({
              session: result.session,
              username: result.username,
            });
            setLoading(false);
            return;
          }
          goDashboard();
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

        startNavigation("/dashboard/");
        router.push(versionedAppRoute("/dashboard/"));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errors.loginFailed);
        setLoading(false);
      }
    },
    [cognito, completePreviewLogin, goDashboard, previewDemo, router, startNavigation]
  );

  const submitNewPassword = useCallback(async () => {
    if (!newPasswordChallenge) return;
    const next = newPasswordRef.current?.value ?? "";
    if (next.length < 8) {
      setError(copy.login.newPasswordHint);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await cognitoCompleteNewPassword(
        newPasswordChallenge.username,
        next,
        newPasswordChallenge.session
      );
      setNewPasswordChallenge(null);
      goDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.loginFailed);
      setLoading(false);
    }
  }, [goDashboard, newPasswordChallenge]);

  const submitForgotRequest = useCallback(async () => {
    const email = emailRef.current?.value?.trim() ?? forgotEmail;
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await cognitoForgotPassword(email);
      setForgotEmail(email);
      setPasswordResetSuccess(false);
      setLoginMode("forgot_confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  }, [forgotEmail]);

  const submitForgotConfirm = useCallback(async () => {
    const code = forgotCodeRef.current?.value?.trim() ?? "";
    const next = forgotPasswordRef.current?.value ?? "";
    if (next.length < 8) {
      setError(copy.login.newPasswordHint);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await cognitoConfirmForgotPassword(forgotEmail, code, next);
      setLoginMode("signin");
      setError(null);
      setLoggedOutMessage(false);
      setPasswordResetSuccess(true);
      setForgotEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  }, [forgotEmail]);

  useEffect(() => {
    if (!DEV_AUTO_LOGIN || autoLoginAttempted.current || loggedOutMessage || cognito) return;
    autoLoginAttempted.current = true;
    if (previewDemo) {
      completePreviewLogin();
      return;
    }
    void login(getDemoEmail(), getDemoPassword());
  }, [cognito, completePreviewLogin, login, loggedOutMessage, previewDemo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordChallenge) {
      void submitNewPassword();
      return;
    }
    if (loginMode === "forgot_request") {
      void submitForgotRequest();
      return;
    }
    if (loginMode === "forgot_confirm") {
      void submitForgotConfirm();
      return;
    }
    if (previewDemo) {
      completePreviewLogin();
      return;
    }
    void login(emailRef.current?.value ?? "", passwordRef.current?.value ?? "");
  };

  const formSubtitle = newPasswordChallenge
    ? copy.login.newPasswordSubtitle
    : loginMode === "forgot_request"
      ? copy.login.forgotSubtitle
      : loginMode === "forgot_confirm"
        ? copy.login.forgotSent
        : copy.login.subtitle;

  const submitLabel = newPasswordChallenge
    ? copy.login.newPasswordSubmit
    : loginMode === "forgot_request"
      ? copy.login.forgotSubmit
      : loginMode === "forgot_confirm"
        ? copy.login.forgotConfirmSubmit
        : copy.login.submit;

  const heroLines = copy.login.heroTitle.split("\n");

  return (
    <StaggerReveal placeholder={<LoginSkeleton />}>
      <StaggerItem>
    <div className="min-h-screen flex paper-canvas">
      <div className="login-hero hidden lg:flex lg:w-[48%] p-10 sm:p-12 lg:p-14">
        <div className="relative z-10">
          <Logo size="lg" variant="light" />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="login-hero-eyebrow">{copy.login.heroEyebrow}</p>
          <h1 className="login-hero-title">
            {heroLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < heroLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="login-hero-body">
            {copy.login.heroBody}
          </p>
          <div className="login-hero-rule mt-9" />
        </div>

        <p className="login-hero-footer">
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
            <p className="mt-1.5 text-sm text-muted-foreground">
              {formSubtitle}
            </p>

            {passwordResetSuccess && loginMode === "signin" && !newPasswordChallenge && (
              <p className="mt-4 rounded-lg border border-lumen/25 bg-accent/60 px-3 py-2 text-sm text-foreground">
                {copy.login.forgotResetSuccess}
              </p>
            )}

            {loggedOutMessage && loginMode === "signin" && !newPasswordChallenge && !passwordResetSuccess && (
              <p className="mt-4 rounded-lg border border-lumen/20 bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                {copy.login.loggedOut}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
              {!newPasswordChallenge && loginMode === "signin" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-label">{copy.login.email}</Label>
                    <Input
                      ref={emailRef}
                      id="email"
                      type="email"
                      name="email"
                      defaultValue={prefilled ? getDemoEmail() : ""}
                      required={!previewDemo}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-label">{copy.login.password}</Label>
                    <PasswordInput
                      ref={passwordRef}
                      id="password"
                      name="password"
                      defaultValue={prefilled ? getDemoPassword() : ""}
                      required={!previewDemo}
                      autoComplete="current-password"
                    />
                  </div>
                  {cognito && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setError(null);
                        setLoginMode("forgot_request");
                      }}
                    >
                      {copy.login.forgotPassword}
                    </button>
                  )}
                </>
              )}

              {!newPasswordChallenge && loginMode === "forgot_request" && (
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-label">{copy.login.email}</Label>
                  <Input
                    ref={emailRef}
                    id="forgot-email"
                    type="email"
                    name="email"
                    defaultValue={forgotEmail}
                    required
                    autoComplete="email"
                  />
                </div>
              )}

              {!newPasswordChallenge && loginMode === "forgot_confirm" && (
                <>
                  <p className="rounded-lg border border-lumen/20 bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                    {copy.login.forgotSent}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {copy.login.forgotSpamHint}
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-code" className="text-label">{copy.login.forgotCode}</Label>
                    <Input
                      ref={forgotCodeRef}
                      id="forgot-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-new-password" className="text-label">
                      {copy.login.forgotNewPassword}
                    </Label>
                    <PasswordInput
                      ref={forgotPasswordRef}
                      id="forgot-new-password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <p className="text-xs text-muted-foreground">{copy.login.newPasswordHint}</p>
                  </div>
                </>
              )}

              {newPasswordChallenge && (
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-label">{copy.login.newPassword}</Label>
                  <PasswordInput
                    ref={newPasswordRef}
                    id="newPassword"
                    name="newPassword"
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">{copy.login.newPasswordHint}</p>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading && !previewDemo}>
                {loading && !previewDemo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{copy.login.submitting}</>
                ) : (
                  <>
                    {submitLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {!newPasswordChallenge && loginMode !== "signin" && (
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setError(null);
                    setLoginMode("signin");
                  }}
                >
                  {copy.login.backToSignIn}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
      </StaggerItem>
    </StaggerReveal>
  );
}
