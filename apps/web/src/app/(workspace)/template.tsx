"use client";

import { PageContentTransition } from "@/components/motion/page-content-transition";

export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <PageContentTransition>{children}</PageContentTransition>;
}
