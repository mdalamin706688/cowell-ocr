"use client";

import { PageContentTransition } from "@/components/motion/page-content-transition";
import { WorkspacePendingSkeleton } from "@/components/motion/workspace-pending-skeleton";

export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageContentTransition>
      <WorkspacePendingSkeleton>{children}</WorkspacePendingSkeleton>
    </PageContentTransition>
  );
}
