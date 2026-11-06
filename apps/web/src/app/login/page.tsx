import { Suspense } from "react";
import { LoginSkeleton } from "@/components/layout/content-skeleton";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
