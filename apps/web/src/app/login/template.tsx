"use client";

import { PageContentTransition } from "@/components/motion/page-content-transition";

export default function LoginTemplate({ children }: { children: React.ReactNode }) {
  return <PageContentTransition className="min-h-screen">{children}</PageContentTransition>;
}
