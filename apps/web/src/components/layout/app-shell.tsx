"use client";

import { usePathname } from "next/navigation";
import {
  CircleUserRound,
  House,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { TransitionLink } from "@/components/ui/transition-link";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { getSessionRoleLabel, isSessionSuperAdmin, type SessionUser } from "@/lib/client-auth";

const nav = [
  { href: "/dashboard/", label: copy.nav.home, icon: House },
  { href: "/users/", label: copy.nav.users, icon: UsersRound },
];

function isNavActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const h = href.endsWith("/") ? href : `${href}/`;
  return p === h || p.startsWith(h);
}

interface AppShellProps {
  children: React.ReactNode;
  user?: SessionUser | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const roleLabel = user ? getSessionRoleLabel(user) : "";
  const isSuperAdmin = user ? isSessionSuperAdmin(user) : false;
  const railItem =
    "mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card/70";

  return (
    <div className="min-h-screen overflow-x-clip paper-canvas">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-card/95 backdrop-blur-md lg:flex shadow-[1px_0_24px_hsl(28_12%_11%/0.03)] transition-[width] duration-300",
          collapsed ? "w-[88px]" : "w-[300px]"
        )}
      >
        <div className={cn("relative flex h-full flex-col", collapsed ? "px-3 pt-0 pb-4" : "p-6")}>
          {collapsed ? (
            <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 flex-col items-center gap-7">
              <TransitionLink
                href="/dashboard/"
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] forest-panel"
                title="Cowell OCR"
                aria-label="Cowell OCR"
              >
                <div className="absolute inset-0 rounded-[12px] ring-1 ring-lumen-glow/25 ring-inset" />
                <svg viewBox="0 0 24 24" fill="none" className="relative h-5 w-5 text-lumen-glow" aria-hidden>
                  <path d="M12 2.5L7.5 10.5H11v9h2v-9h3.5L12 2.5z" fill="currentColor" />
                  <ellipse cx="12" cy="20.5" rx="4.5" ry="1.2" fill="currentColor" opacity="0.35" />
                </svg>
              </TransitionLink>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="サイドバーを展開"
                onClick={() => setCollapsed(false)}
                className="h-9 w-9 shrink-0 border-border/70 bg-card/70 hover:bg-muted/40"
                title="展開"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mb-8 flex items-center justify-between gap-4">
              <TransitionLink href="/dashboard/" className="block min-w-0 flex-1 transition-opacity hover:opacity-90">
                <Logo size="md" />
              </TransitionLink>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="サイドバーを折りたたむ"
                onClick={() => setCollapsed(true)}
                className="h-9 w-9 shrink-0 border-border/70 bg-card/70 hover:bg-muted/40"
                title="折りたたみ"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          )}

          {collapsed && <div className="h-40" aria-hidden />}

          {!collapsed && <p className="text-eyebrow mb-3 px-3">{copy.nav.menu}</p>}
          <nav className="flex flex-col gap-1" aria-label={copy.nav.menu}>
            {nav.map(({ href, label, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              return (
                <TransitionLink
                  key={href}
                  href={href}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "nav-link relative overflow-hidden",
                    collapsed && `${railItem} px-0 py-0`,
                    active
                      ? "nav-link-active text-foreground border-lumen/60 bg-accent/80 ring-1 ring-lumen/35"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {active ? (
                    <span className="absolute inset-0 rounded-lg bg-accent/70 shadow-sm" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      "relative flex items-center",
                      collapsed ? "h-full w-full justify-center" : "gap-2.5"
                    )}
                  >
                    <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!collapsed && <span>{label}</span>}
                    {collapsed && <span className="sr-only">{label}</span>}
                  </span>
                </TransitionLink>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            <TransitionLink
              href="/survey/new/"
              title={copy.nav.newSurvey}
              className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold btn-lumen text-white shadow-none",
                collapsed ? `${railItem} border-transparent p-0` : "h-9 w-full rounded-xl px-4"
              )}
            >
              <Plus className={cn(collapsed ? "h-5 w-5" : "h-3.5 w-3.5")} />
              {!collapsed && copy.nav.newSurvey}
              {collapsed && <span className="sr-only">{copy.nav.newSurvey}</span>}
            </TransitionLink>

            {user && (
              <div
                className={cn(
                  "rounded-xl border border-border/60 bg-muted/20",
                  collapsed ? `${railItem} p-0` : "px-3.5 py-3"
                )}
                title={`${copy.nav.account}: ${user.email} (${roleLabel})`}
              >
                <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
                  {!collapsed && <p className="text-label">{copy.nav.account}</p>}
                  {!collapsed && (
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                        isSuperAdmin ? "bg-lumen/15 text-lumen" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {roleLabel}
                    </span>
                  )}
                  {collapsed && (
                    <CircleUserRound
                      className={cn("h-5 w-5", isSuperAdmin ? "text-lumen" : "text-muted-foreground")}
                    />
                  )}
                </div>
                {!collapsed && (
                  <p className="mt-1 truncate text-xs font-medium text-foreground/85">{user.email}</p>
                )}
                {collapsed && (
                  <span className="sr-only">
                    {copy.nav.account}: {user.email} ({roleLabel})
                  </span>
                )}
              </div>
            )}

            {collapsed ? (
              <LogoutButton
                variant="mobile"
                className={`${railItem} [&_svg]:h-5 [&_svg]:w-5`}
              />
            ) : (
              <LogoutButton variant="sidebar" />
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-md shadow-sm lg:hidden">
        <TransitionLink href="/dashboard/">
          <Logo size="sm" />
        </TransitionLink>
        <div className="flex items-center gap-2">
          <TransitionLink href="/survey/new/">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              {copy.nav.newShort}
            </Button>
          </TransitionLink>
          <LogoutButton variant="mobile" />
        </div>
      </header>

      <main className={cn(collapsed ? "lg:pl-[88px]" : "lg:pl-[300px]")}>
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">{children}</div>
      </main>
    </div>
  );
}
