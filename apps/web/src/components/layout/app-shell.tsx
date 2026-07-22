"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";

const nav = [{ href: "/dashboard/", label: copy.nav.home }];

interface AppShellProps {
  children: React.ReactNode;
  user?: { email: string; name: string } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen paper-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-border/60 bg-card/95 backdrop-blur-md lg:flex shadow-[1px_0_24px_hsl(28_12%_11%/0.03)]">
        <div className="flex h-full flex-col p-6">
          <Link href="/dashboard/" className="mb-10 transition-opacity hover:opacity-90">
            <Logo size="md" />
          </Link>

          <p className="text-eyebrow mb-3 px-3">{copy.nav.menu}</p>
          <nav className="flex flex-col gap-1">
            {nav.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "nav-link",
                    active ? "nav-link-active" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="pl-2">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            <Link href="/survey/new/">
              <Button size="sm" className="w-full shadow-none">
                <Plus className="h-3.5 w-3.5" />
                {copy.nav.newSurvey}
              </Button>
            </Link>

            {user && (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
                <p className="text-label">{copy.nav.account}</p>
                <p className="mt-1 truncate text-xs font-medium text-foreground/85">{user.email}</p>
              </div>
            )}

            <LogoutButton variant="sidebar" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-md shadow-sm lg:hidden">
        <Link href="/dashboard/"><Logo size="sm" /></Link>
        <div className="flex items-center gap-2">
          <Link href="/survey/new/">
            <Button size="sm"><Plus className="h-3.5 w-3.5" />{copy.nav.newShort}</Button>
          </Link>
          <LogoutButton variant="mobile" />
        </div>
      </header>

      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
