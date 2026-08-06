"use client";

import { useEffect, useState } from "react";
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
import { TransitionLink } from "@/components/ui/transition-link";
import { ContentSkeleton } from "@/components/layout/content-skeleton";
import { StaggerItem, StaggerReveal } from "@/components/motion/stagger-reveal";
import { copy } from "@/lib/copy";
import { formatUserDisplayName } from "@/lib/client-auth";

interface DashboardContentProps {
  userName?: string;
  userEmail?: string;
}

const workflowIcons = [Upload, ScanLine, Table2, FileSpreadsheet];
const capabilityIcons = [FileImage, ScanLine, Sheet];

export function DashboardContent({ userName = "管理者", userEmail }: DashboardContentProps) {
  const displayName = formatUserDisplayName({ email: userEmail ?? "", name: userName });
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
  }, []);

  return (
    <StaggerReveal placeholder={<ContentSkeleton />}>
      <StaggerItem>
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="min-h-4 text-label">{today || "\u00a0"}</p>
          <h1 className="text-title mt-1 text-2xl sm:text-[1.65rem]">
            {copy.dashboard.greetingTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.dashboard.greetingUser(displayName)}</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <TransitionLink href="/survey/new/">
            {copy.dashboard.cta}
            <ArrowRight className="h-4 w-4" />
          </TransitionLink>
        </Button>
      </div>
      </StaggerItem>

      <StaggerItem>
      <section className="forest-hero overflow-hidden">
        <div className="relative z-10 grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr,280px] lg:p-9">
          <div className="max-w-lg">
            <p className="text-eyebrow">{copy.dashboard.eyebrow}</p>
            <h2 className="text-display mt-3 text-[1.65rem] sm:text-[1.85rem] text-foreground leading-snug">
              {copy.dashboard.titleBefore}
              <span className="text-primary font-bold">{copy.dashboard.titleHighlight}</span>
              {copy.dashboard.titleAfter}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {copy.dashboard.body}
            </p>
            <div className="copper-rule mt-6" />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <TransitionLink href="/survey/new/">
                  <Upload className="h-4 w-4" />
                  {copy.dashboard.cta}
                </TransitionLink>
              </Button>
            </div>
          </div>

          {/* Decorative workflow preview */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="inset-well p-5">
              <p className="text-[10px] font-bold tracking-wider text-primary uppercase">
                {copy.dashboard.workflowTitle}
              </p>
              <div className="mt-4 space-y-3">
                {copy.dashboard.steps.map((step, i) => {
                  const Icon = workflowIcons[i] ?? Zap;
                  return (
                    <div
                      key={step.label}
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{step.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
      </StaggerItem>

      <StaggerItem>
      <section className="grid gap-4 sm:grid-cols-3">
        {copy.dashboard.capabilities.map((cap, i) => {
          const Icon = capabilityIcons[i] ?? Zap;
          return (
          <div key={cap.title} className="ui-card group">
            <div className="ui-card-body flex flex-col gap-3 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{cap.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {cap.desc}
                </p>
              </div>
            </div>
          </div>
          );
        })}
      </section>
      </StaggerItem>

      <StaggerItem>
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-eyebrow">{copy.dashboard.workflowEyebrow}</p>
            <h2 className="text-title mt-1 text-lg">{copy.dashboard.workflowTitle}</h2>
          </div>
        </div>
        <div className="ui-card">
          <div className="ui-card-body overflow-x-auto px-3 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
            <div className="min-w-[32rem] sm:min-w-0">
            <div className="timeline-track">
              {copy.dashboard.steps.map((s, i) => {
                const Icon = workflowIcons[i] ?? Zap;
                return (
                  <div
                    key={s.label}
                    className="flex flex-col items-center text-center"
                    style={{ width: `${100 / copy.dashboard.steps.length}%` }}
                  >
                    <div className="timeline-dot timeline-dot-done flex items-center justify-center">
                      <Icon className="h-3 w-3" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">{s.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground max-w-[88px]">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>
      </section>
      </StaggerItem>

      <StaggerItem>
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
          <div className="status-pill-online">
            <span className="status-pill-online-dot" aria-hidden />
            <span>{copy.dashboard.statusOnline}</span>
          </div>
        </div>
      </section>
      </StaggerItem>
    </StaggerReveal>
  );
}
