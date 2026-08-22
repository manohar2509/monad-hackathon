import { cn } from "@/lib/utils";
import type { ConsentStatus } from "@/lib/types";

const statusStyle: Record<ConsentStatus, string> = {
  none: "bg-white/10 text-[var(--ll-text-secondary)]",
  active: "bg-[var(--ll-verified)]/15 text-[var(--ll-verified)]",
  revoked: "bg-[var(--ll-revoked)]/15 text-[var(--ll-revoked)]",
};

const statusLabel: Record<ConsentStatus, string> = {
  none: "NOT SIGNED",
  active: "ACTIVE",
  revoked: "REVOKED",
};

const dotStyle: Record<ConsentStatus, string> = {
  none: "bg-white/30",
  active: "bg-[var(--ll-verified)]",
  revoked: "bg-[var(--ll-revoked)]",
};

export function SubjectRow({
  displayName,
  status,
}: {
  displayName: string;
  status: ConsentStatus;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-[var(--ll-text-primary)]">
        <span className={cn("h-2 w-2 rounded-full", dotStyle[status])} />
        {displayName}
      </div>
      <span
        className={cn(
          "rounded-[999px] px-2.5 py-0.5 text-xs font-medium tracking-wide",
          statusStyle[status],
        )}
      >
        {statusLabel[status]}
      </span>
    </div>
  );
}
