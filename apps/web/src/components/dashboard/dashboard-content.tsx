"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface DashboardContentProps {
  userName?: string;
}

export function DashboardContent({ userName = "管理者" }: DashboardContentProps) {
  return (
    <div className="space-y-10">
      <section className="forest-hero p-7 sm:p-9">
        <div className="relative z-10 max-w-xl">
          <p className="text-eyebrow text-lumen-glow/90">{copy.dashboard.eyebrow}</p>
          <p className="mt-3 text-sm text-white/50">{copy.dashboard.greeting(userName)}</p>
          <h1 className="text-display mt-2 text-2xl sm:text-[1.75rem] text-white leading-snug">
            {copy.dashboard.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55 max-w-md">
            {copy.dashboard.body}
          </p>
          <div className="copper-rule mt-6" />
          <div className="mt-6">
            <Button asChild variant="elevated" size="lg">
              <Link href="/survey/new">
                {copy.dashboard.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <p className="text-eyebrow">{copy.dashboard.workflowEyebrow}</p>
          <h2 className="text-title mt-1">{copy.dashboard.workflowTitle}</h2>
        </div>
        <div className="ui-card">
          <div className="ui-card-body pt-6 pb-7">
            <div className="timeline-track">
              {copy.dashboard.steps.map((s, i) => (
                <div key={s.label} className="flex flex-col items-center text-center" style={{ width: `${100 / copy.dashboard.steps.length}%` }}>
                  <div className="timeline-dot">{i + 1}</div>
                  <p className="mt-3 text-sm font-medium">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border/60 pt-6">
        {copy.dashboard.specs.map((item, i) => (
          <div key={item.label} className="flex items-center gap-8">
            {i > 0 && <span className="hidden sm:block h-3 w-px bg-border" />}
            <div>
              <p className="text-label">{item.label}</p>
              <p className="text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
