"use client";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { useWorkspaceSession } from "@/contexts/workspace-session";

export default function DashboardPage() {
  const session = useWorkspaceSession();
  return <DashboardContent userName={session.name} />;
}
