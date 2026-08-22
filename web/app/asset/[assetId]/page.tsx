"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ConsentPassport, type PassportStatus } from "@/components/consent-passport";
import { PasskeyButton } from "@/components/passkey-button";
import { TransactionLink } from "@/components/transaction-link";
import {
  getAssetCreatedFields,
  getAssetStatus,
  getConsentState,
  getNonce,
  getRequiredSubjects,
} from "@/lib/contract";
import { buildAuthorizationDigest, ACTION_GRANT, ACTION_REVOKE } from "@/lib/authorization";
import { signDigest } from "@/lib/passkey";
import { listDemoSubjects } from "@/lib/demo-subjects";
import { callRelay } from "@/lib/relay";
import { monadTestnet } from "@/lib/monad";
import { contractAddress } from "@/lib/contract";
import type { ConsentStatus, Hex } from "@/lib/types";

type LoadState = "loading" | "ready" | "not-found";
type ActionState = "idle" | "authenticating" | "verifying" | "done" | "error";

const stateLabel: Record<number, ConsentStatus> = { 0: "none", 1: "active", 2: "revoked" };

export default function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);

  const [load, setLoad] = useState<LoadState>("loading");
  const [purpose, setPurpose] = useState("(purpose not available locally)");
  const [contentHash, setContentHash] = useState<Hex | null>(null);
  const [purposeHash, setPurposeHash] = useState<Hex | null>(null);
  const [expiresAt, setExpiresAt] = useState<bigint | null>(null);
  const [required, setRequired] = useState<{ subjectId: Hex; displayName: string; status: ConsentStatus }[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [valid, setValid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<{ txHash: string; blockNumber: string } | null>(null);

  const refresh = useCallback(async () => {
    const id = assetId as Hex;
    const fields = await getAssetCreatedFields(id).catch(() => null);
    if (!fields) {
      setLoad("not-found");
      return;
    }
    setContentHash(fields.contentHash);
    setPurposeHash(fields.purposeHash);
    setExpiresAt(fields.expiresAt);

    const storedPurpose = typeof window !== "undefined" ? sessionStorage.getItem(`likenesslock:purpose:${id}`) : null;
    if (storedPurpose) setPurpose(storedPurpose);

    const [status, subjectIds] = await Promise.all([getAssetStatus(id), getRequiredSubjects(id)]);
    setActiveCount(Number(status.active));
    setValid(status.valid);
    setExpired(status.expired);

    const known = listDemoSubjects();
    const rows = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const stateNum = await getConsentState(id, subjectId);
        const local = known.find((s) => s.subjectId === subjectId);
        return {
          subjectId,
          displayName: local?.displayName ?? `${subjectId.slice(0, 8)}...`,
          status: stateLabel[stateNum] ?? "none",
        };
      }),
    );
    setRequired(rows);
    setLoad("ready");
  }, [assetId]);

  useEffect(() => {
    // Genuine async data fetching (chain reads), not a synchronous external-store
    // read — the setState calls inside `refresh` happen after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleGrantOrRevoke(subjectId: Hex, mode: "grant" | "revoke") {
    if (!contentHash || !purposeHash || expiresAt === null) return;
    if (mode === "revoke" && !window.confirm("Revoke this consent? The asset will stop verifying as VALID.")) {
      return;
    }
    setError(null);
    setActionState("authenticating");

    const local = listDemoSubjects().find((s) => s.subjectId === subjectId);
    if (!local) {
      setError("This subject's passkey is not registered in this browser.");
      setActionState("error");
      return;
    }

    try {
      const nonce = await getNonce(subjectId);
      const digest = buildAuthorizationDigest({
        action: mode === "grant" ? ACTION_GRANT : ACTION_REVOKE,
        chainId: monadTestnet.id,
        contractAddress: contractAddress(),
        assetId: assetId as Hex,
        contentHash,
        purposeHash,
        expiresAt,
        subjectId,
        nonce,
      });

      const auth = await signDigest(local.credentialId, digest);

      setActionState("verifying");
      const res = await callRelay({
        action: mode === "grant" ? "grantConsent" : "revokeConsent",
        assetId: assetId as Hex,
        subjectId,
        auth,
      });

      if (!res.ok) {
        setError(res.message);
        setActionState("error");
        return;
      }

      setLastTx({ txHash: res.txHash, blockNumber: res.blockNumber });
      setActionState("done");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${mode} failed`);
      setActionState("error");
    }
  }

  if (load === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16 text-[var(--ll-text-secondary)]">
        Loading passport from Monad...
      </main>
    );
  }

  if (load === "not-found") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16 text-[var(--ll-revoked)]">
        No passport found for this asset.
      </main>
    );
  }

  const status: PassportStatus = expired ? "expired" : valid ? "valid" : "invalid";
  const knownLocally = required.filter((r) => listDemoSubjects().some((s) => s.subjectId === r.subjectId));

  const nameMap = Object.fromEntries(required.map((r) => [r.subjectId, r.displayName]));
  const certificateHref = `/api/certificate/${assetId}?purpose=${encodeURIComponent(purpose)}&names=${encodeURIComponent(JSON.stringify(nameMap))}`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-6 py-16">
      <ConsentPassport
        title={`Asset ${assetId.slice(0, 10)}...`}
        fingerprint={`${contentHash?.slice(0, 10)}...${contentHash?.slice(-6)}`}
        subjects={required.map((r) => ({ displayName: r.displayName, status: r.status }))}
        purpose={purpose}
        validUntil={expiresAt ? new Date(Number(expiresAt) * 1000).toLocaleDateString() : "—"}
        status={status}
        activeCount={activeCount}
        requiredCount={required.length}
      />

      {valid && (
        <a
          href={certificateHref}
          download={`likenesslock-certificate-${assetId.slice(2, 10)}.png`}
          className={buttonVariants({ variant: "outline", className: "gap-2 rounded-[10px]" })}
        >
          <Download size={16} />
          Download Certificate
        </a>
      )}

      <Card className="w-full rounded-[16px] border-white/10 bg-[var(--ll-surface)]">
        <CardContent className="flex flex-col gap-3 pt-6">
          {knownLocally.length === 0 && (
            <p className="text-sm text-[var(--ll-text-secondary)]">
              None of the required subjects have a passkey registered in this browser.
            </p>
          )}
          {knownLocally.map((r) => (
            <div key={r.subjectId} className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--ll-text-primary)]">{r.displayName}</span>
              <PasskeyButton
                loading={actionState === "authenticating" || actionState === "verifying"}
                variant={r.status === "active" ? "destructive" : "default"}
                onClick={() => handleGrantOrRevoke(r.subjectId, r.status === "active" ? "revoke" : "grant")}
              >
                {actionState === "authenticating"
                  ? "Authenticating..."
                  : actionState === "verifying"
                    ? "Verifying on Monad..."
                    : r.status === "active"
                      ? "Revoke Consent"
                      : "Approve with Passkey"}
              </PasskeyButton>
            </div>
          ))}

          {error && <p className="text-sm text-[var(--ll-revoked)]">{error}</p>}
          {lastTx && <TransactionLink txHash={lastTx.txHash} blockNumber={lastTx.blockNumber} />}
        </CardContent>
      </Card>
    </main>
  );
}
