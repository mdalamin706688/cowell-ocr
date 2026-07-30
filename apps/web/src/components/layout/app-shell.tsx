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
import { SoftNavButton } from "@/components/ui/soft-nav-button";
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

/**
 * Sidebar stays mounted across soft-nav. Its explicit data state is present on
 * the first AppShell frame, so refresh never paints an expanded intermediate.
 */
export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const roleLabel = user ? getSessionRoleLabel(user) : "";
  const isSuperAdmin = user ? isSessionSuperAdmin(user) : false;

  return (
    <div
      className="workspace-shell min-h-screen overflow-x-clip paper-canvas"
      data-sidebar-state={collapsed ? "collapsed" : "expanded"}
    >
      <aside
        className="shell-aside fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-card/95 backdrop-blur-md lg:flex shadow-[1px_0_24px_hsl(28_12%_11%/0.03)]"
        suppressHydrationWarning
      >
        <div className="shell-aside-inner relative flex h-full flex-col" suppressHydrationWarning>
          <div className="shell-collapsed-only shell-rail-column absolute inset-x-0 top-4 z-10 flex flex-col gap-7">
            <SoftNavButton
              href="/dashboard/"
              title="Cowell OCR"
              aria-label="Cowell OCR"
              className="shell-rail-item relative rounded-[12px] forest-panel"
            >
              <div className="absolute inset-0 rounded-[12px] ring-1 ring-lumen-glow/25 ring-inset" />
              <svg viewBox="0 0 24 24" fill="none" className="relative h-5 w-5 text-lumen-glow" aria-hidden>
                <path d="M12 2.5L7.5 10.5H11v9h2v-9h3.5L12 2.5z" fill="currentColor" />
                <ellipse cx="12" cy="20.5" rx="4.5" ry="1.2" fill="currentColor" opacity="0.35" />
              </svg>
            </SoftNavButton>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="サイドバーを展開"
              aria-pressed={!collapsed}
              onClick={() => setCollapsed(false)}
              className="shell-rail-control border-border/70 bg-card/70 hover:bg-muted/40"
              title="展開"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>

          <div className="shell-expanded-only mb-8 flex items-center justify-between gap-4">
            <SoftNavButton
              href="/dashboard/"
              className="block min-w-0 flex-1 p-0 transition-opacity hover:opacity-90"
            >
              <Logo size="md" />
            </SoftNavButton>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="サイドバーを折りたたむ"
              aria-pressed={collapsed}
              onClick={() => setCollapsed(true)}
              className="h-9 w-9 shrink-0 border-border/70 bg-card/70 hover:bg-muted/40"
              title="折りたたみ"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="shell-collapsed-only h-40" aria-hidden />

          <p className="shell-expanded-only text-eyebrow mb-3 px-3">{copy.nav.menu}</p>
          <nav className="shell-rail-column flex flex-col gap-1" aria-label={copy.nav.menu}>
            {nav.map(({ href, label, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              return (
                <SoftNavButton
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "nav-link shell-collapsed-nav shell-rail-item relative w-full overflow-hidden",
                    active
                      ? "nav-link-active text-foreground border-lumen/60 bg-accent/80 ring-1 ring-lumen/35"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {active ? (
                    <span className="absolute inset-0 rounded-lg bg-accent/70 shadow-sm" aria-hidden />
                  ) : null}
                  <span className="shell-nav-item relative flex items-center gap-2.5">
                    <Icon className="shell-nav-icon h-4 w-4 shrink-0" />
                    <span className="shell-expanded-only">{label}</span>
                    <span className="shell-collapsed-only sr-only">{label}</span>
                  </span>
                </SoftNavButton>
              );
            })}
          </nav>

          <div className="shell-rail-column mt-auto space-y-3 border-t border-border/50 pt-5">
            <SoftNavButton
              href="/survey/new/"
              title={copy.nav.newSurvey}
              className="shell-new-survey shell-rail-item inline-flex w-full items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold btn-lumen text-white shadow-none h-9 rounded-xl px-4"
            >
              <Plus className="shell-nav-icon h-3.5 w-3.5" />
              <span className="shell-expanded-only">{copy.nav.newSurvey}</span>
              <span className="shell-collapsed-only sr-only">{copy.nav.newSurvey}</span>
            </SoftNavButton>

            {user && (
              <div
                className="shell-account shell-rail-item rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3"
                title={`${copy.nav.account}: ${user.email} (${roleLabel})`}
              >
                <div className="shell-account-row flex items-center justify-between gap-2">
                  <p className="shell-expanded-only text-label">{copy.nav.account}</p>
                  <span
                    className={cn(
                      "shell-expanded-only shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                      isSuperAdmin ? "bg-lumen/15 text-lumen" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {roleLabel}
                  </span>
                  <CircleUserRound
                    className={cn(
                      "shell-collapsed-only h-5 w-5",
                      isSuperAdmin ? "text-lumen" : "text-muted-foreground"
                    )}
                  />
                </div>
                <p className="shell-expanded-only mt-1 truncate text-xs font-medium text-foreground/85">
                  {user.email}
                </p>
                <span className="shell-collapsed-only sr-only">
                  {copy.nav.account}: {user.email} ({roleLabel})
                </span>
              </div>
            )}

            <div className="shell-collapsed-only shell-rail-column">
              <LogoutButton
                variant="mobile"
                className="shell-rail-item rounded-xl border border-border/70 bg-card/70"
              />
            </div>
            <div className="shell-expanded-only">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-md shadow-sm lg:hidden">
        <SoftNavButton href="/dashboard/" className="p-0">
          <Logo size="sm" />
        </SoftNavButton>
        <div className="flex items-center gap-2">
          <SoftNavButton
            href="/survey/new/"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-none"
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.nav.newShort}
          </SoftNavButton>
          <LogoutButton variant="mobile" />
        </div>
      </header>

      <main className="shell-main" suppressHydrationWarning>
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">{children}</div>
      </main>
    </div>
  );
}
