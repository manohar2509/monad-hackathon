"use client";

import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PasskeyButton({
  onClick,
  loading,
  disabled,
  variant = "default",
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      variant={variant === "destructive" ? "destructive" : "default"}
      className="gap-2 rounded-[10px]"
      size="lg"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <Fingerprint size={18} />}
      {children}
    </Button>
  );
}
