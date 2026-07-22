"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/contexts/navigation-context";
import {
  clearClientSession,
  FLASH_LOGGED_OUT,
  isPreviewEnvironment,
  setFlash,
} from "@/lib/client-auth";

interface LogoutButtonProps {
  variant?: "sidebar" | "mobile";
  className?: string;
}

export function LogoutButton({ variant = "sidebar", className }: LogoutButtonProps) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      if (isPreviewEnvironment()) {
        clearClientSession();
        setFlash(FLASH_LOGGED_OUT);
        startNavigation("/login/");
        router.replace("/login/");
        return;
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      setFlash(FLASH_LOGGED_OUT);
      startNavigation("/login/");
      router.replace("/login/");
    } catch {
      setLoading(false);
    }
  };

  if (variant === "mobile") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleLogout}
        disabled={loading}
        className={cn("shrink-0", className)}
        aria-label={copy.auth.logout}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={cn("btn-logout disabled:opacity-50 disabled:pointer-events-none", className)}
    >
      <span className="btn-logout-icon">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </span>
      <span>{copy.auth.logout}</span>
    </button>
  );
}
