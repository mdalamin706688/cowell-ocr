"use client";

import { PageContentTransition } from "@/components/motion/page-content-transition";
import { loginVariants } from "@/lib/motion";

export default function LoginTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageContentTransition variants={loginVariants} className="min-h-screen">
      {children}
    </PageContentTransition>
  );
}
