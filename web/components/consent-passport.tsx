import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { SubjectRow } from "./subject-row";
import type { ConsentStatus } from "@/lib/types";

export type PassportStatus = "valid" | "invalid" | "expired" | "no-passport";

const statusMeta: Record<
  PassportStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  valid: { label: "CONSENT VERIFIED", color: "var(--ll-verified)", icon: CheckCircle2 },
  invalid: { label: "CONSENT INVALID", color: "var(--ll-revoked)", icon: XCircle },
  expired: { label: "CONSENT EXPIRED", color: "var(--ll-revoked)", icon: AlertTriangle },
  "no-passport": {
    label: "NO PASSPORT FOR THIS EXACT FILE",
    color: "var(--ll-revoked)",
    icon: HelpCircle,
  },
};

export function ConsentPassport({
  title,
  fingerprint,
  subjects,
  purpose,
  validUntil,
  status,
  activeCount,
  requiredCount,
  blockNumber,
}: {
  title: string;
  fingerprint: string;
  subjects: { displayName: string; status: ConsentStatus }[];
  purpose: string;
  validUntil: string;
  status: PassportStatus;
  activeCount: number;
  requiredCount: number;
  blockNumber?: string;
}) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <div
      className="w-full max-w-md rounded-[16px] border border-white/10 bg-[var(--ll-surface)] p-6 shadow-2xl"
      style={{ boxShadow: "0 0 60px -20px rgba(110,84,255,0.35)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.2em] text-[var(--ll-text-secondary)]">
          LIKENESSLOCK
        </span>
        <span className="rounded-[999px] bg-[var(--ll-primary)]/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--ll-primary-soft)]">
          MONAD
        </span>
      </div>

      <h3 className="mt-4 text-lg font-medium text-[var(--ll-text-primary)]">{title}</h3>
      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ll-text-secondary)]">
        <span>Fingerprint</span>
        <span className="font-mono text-[var(--ll-text-primary)]">{fingerprint}</span>
      </div>

      <div className="mt-4 divide-y divide-white/5 rounded-[10px] bg-white/[0.02]">
        {subjects.map((s) => (
          <SubjectRow key={s.displayName} displayName={s.displayName} status={s.status} />
        ))}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="text-[var(--ll-text-secondary)]">
          Purpose: <span className="text-[var(--ll-text-primary)]">{purpose}</span>
        </div>
        <div className="text-[var(--ll-text-secondary)]">
          Valid until: <span className="text-[var(--ll-text-primary)]">{validUntil}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1 border-t border-white/5 pt-6">
        <div
          className="flex items-center gap-2 text-[28px] font-semibold"
          style={{ color: meta.color }}
        >
          <Icon size={26} />
          {meta.label}
        </div>
        <div className="text-[44px] font-semibold leading-none text-[var(--ll-text-primary)]">
          {activeCount} / {requiredCount}
        </div>
      </div>

      <div className="mt-4 text-center font-mono text-xs text-[var(--ll-text-secondary)]">
        Verified on Monad{blockNumber ? ` · Block #${blockNumber}` : ""}
      </div>
    </div>
  );
}
