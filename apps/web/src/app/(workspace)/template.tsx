"use client";

import { PageContentTransition } from "@/components/motion/page-content-transition";
import { workspaceVariants } from "@/lib/motion";

export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageContentTransition variants={workspaceVariants}>
      {children}
    </PageContentTransition>
  );
}
