"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { copy } from "@/lib/copy";

const DEV_AUTO_LOGIN = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLogout = searchParams.get("from") === "logout";
  const [email, setEmail] = useState(DEV_AUTO_LOGIN ? DEV_EMAIL : "");
  const [password, setPassword] = useState(DEV_AUTO_LOGIN ? DEV_PASSWORD : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoLoginAttempted = useRef(false);

  const login = useCallback(
    async (loginEmail: string, loginPassword: string) => {
      setLoading(true);
      setError(null);

      try {
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
    if (!DEV_AUTO_LOGIN || !DEV_EMAIL || !DEV_PASSWORD || autoLoginAttempted.current || fromLogout) return;
    autoLoginAttempted.current = true;
    void login(DEV_EMAIL, DEV_PASSWORD);
  }, [login, fromLogout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

            {fromLogout && (
              <p className="mt-4 rounded-lg border border-lumen/20 bg-accent/50 px-3 py-2.5 text-sm">
                {copy.login.loggedOut}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-label">{copy.login.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-label">{copy.login.password}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
