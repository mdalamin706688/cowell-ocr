"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  variant?: "sidebar" | "mobile";
  className?: string;
}

export function LogoutButton({ variant = "sidebar", className }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      window.location.href = "/login?from=logout";
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
