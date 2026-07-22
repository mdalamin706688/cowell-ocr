"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileImage,
  FileSpreadsheet,
  ScanLine,
  Sheet,
  Table2,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface DashboardContentProps {
  userName?: string;
}

const workflowIcons = [Upload, ScanLine, Table2, FileSpreadsheet];
const capabilityIcons = [FileImage, ScanLine, Sheet];

export function DashboardContent({ userName = "管理者" }: DashboardContentProps) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="space-y-8">
      {/* Header strip */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">{today}</p>
          <h1 className="text-title mt-1 text-2xl sm:text-[1.65rem]">
            {copy.dashboard.greeting(userName)}
          </h1>
        </div>
        <Button asChild size="lg" className="shadow-none">
          <Link href="/survey/new/">
            {copy.dashboard.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Primary hero */}
      <section className="forest-hero overflow-hidden">
        <div className="relative z-10 grid lg:grid-cols-[1fr,280px] gap-8 p-7 sm:p-9">
          <div className="max-w-lg">
            <p className="text-eyebrow text-lumen-glow/90">{copy.dashboard.eyebrow}</p>
            <h2 className="text-display mt-3 text-[1.65rem] sm:text-[1.85rem] text-white leading-snug">
              {copy.dashboard.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/55">
              {copy.dashboard.body}
            </p>
            <div className="copper-rule mt-6" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="elevated" size="lg">
                <Link href="/survey/new/">
                  <Upload className="h-4 w-4" />
                  {copy.dashboard.cta}
                </Link>
              </Button>
            </div>
          </div>

          {/* Decorative workflow preview */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold tracking-wider text-lumen-glow/70 uppercase">
                {copy.dashboard.workflowTitle}
              </p>
              <div className="mt-4 space-y-3">
                {copy.dashboard.steps.map((step, i) => {
                  const Icon = workflowIcons[i] ?? Zap;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lumen/15 text-lumen-glow">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90">{step.label}</p>
                        <p className="text-[11px] text-white/40 truncate">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capability cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        {copy.dashboard.capabilities.map((cap, i) => {
          const Icon = capabilityIcons[i] ?? Zap;
          return (
          <div key={cap.title} className="ui-card group">
            <div className="ui-card-body flex flex-col gap-3 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/80 text-lumen transition-colors group-hover:bg-lumen/10">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{cap.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {cap.desc}
                </p>
              </div>
            </div>
          </div>
          );
        })}
      </section>

      {/* Workflow timeline */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow">{copy.dashboard.workflowEyebrow}</p>
            <h2 className="text-title mt-1 text-lg">{copy.dashboard.workflowTitle}</h2>
          </div>
        </div>
        <div className="ui-card">
          <div className="ui-card-body pt-6 pb-7">
            <div className="timeline-track">
              {copy.dashboard.steps.map((s, i) => {
                const Icon = workflowIcons[i] ?? Zap;
                return (
                  <div
                    key={s.label}
                    className="flex flex-col items-center text-center"
                    style={{ width: `${100 / copy.dashboard.steps.length}%` }}
                  >
                    <div className="timeline-dot flex items-center justify-center">
                      <Icon className="h-3 w-3" />
                    </div>
                    <p className="mt-3 text-sm font-medium">{s.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground max-w-[88px]">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Spec strip */}
      <section className="ui-card">
        <div className="ui-card-body flex flex-wrap items-center justify-between gap-6 py-5">
          {copy.dashboard.specs.map((item, i) => (
            <div key={item.label} className="flex items-center gap-6">
              {i > 0 && <span className="hidden sm:block h-8 w-px bg-border/80" />}
              <div>
                <p className="text-label">{item.label}</p>
                <p className="text-sm font-semibold mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-800">{copy.dashboard.statusOnline}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
