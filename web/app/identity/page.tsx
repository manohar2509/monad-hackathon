"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasskeyButton } from "@/components/passkey-button";
import { TransactionLink } from "@/components/transaction-link";
import { createPasskeyCredential, type StoredCredential } from "@/lib/passkey";
import { saveDemoSubject, listDemoSubjects } from "@/lib/demo-subjects";
import { callRelay } from "@/lib/relay";

type Step = "idle" | "creating" | "registering" | "done" | "error";

function CopySubjectId({ subjectId }: { subjectId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(subjectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-mono text-[var(--ll-text-secondary)] hover:text-[var(--ll-text-primary)]"
      title={subjectId}
    >
      {subjectId.slice(0, 10)}...{subjectId.slice(-6)}
      {copied ? <Check size={12} className="text-[var(--ll-verified)]" /> : <Copy size={12} />}
    </button>
  );
}

export default function IdentityPage() {
  const [displayName, setDisplayName] = useState("Alice");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    subject: StoredCredential;
    txHash: string;
    blockNumber: string;
  } | null>(null);
  const [registered, setRegistered] = useState<StoredCredential[]>(() =>
    typeof window !== "undefined" ? listDemoSubjects() : [],
  );

  async function handleCreate() {
    setError(null);
    setStep("creating");
    try {
      const subject = await createPasskeyCredential(displayName);

      setStep("registering");
      const res = await callRelay({ action: "registerSubject", qx: subject.qx, qy: subject.qy });

      if (!res.ok) {
        setError(res.message);
        setStep("error");
        return;
      }

      saveDemoSubject(subject);
      setRegistered(listDemoSubjects());
      setResult({ subject, txHash: res.txHash, blockNumber: res.blockNumber });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey creation failed");
      setStep("error");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ll-text-primary)]">Register identity</h1>
        <p className="mt-1 text-sm text-[var(--ll-text-secondary)]">
          Pseudonymous display name is local-only. The system passkey dialog is the real
          biometric UI.
        </p>
      </div>

      <Card className="rounded-[16px] border-white/10 bg-[var(--ll-surface)]">
        <CardHeader>
          <CardTitle className="text-base">New subject</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Alice"
            />
          </div>

          <PasskeyButton
            onClick={handleCreate}
            loading={step === "creating" || step === "registering"}
          >
            {step === "creating"
              ? "Waiting for passkey..."
              : step === "registering"
                ? "Registering on Monad..."
                : "Create Passkey"}
          </PasskeyButton>

          {error && <p className="text-sm text-[var(--ll-revoked)]">{error}</p>}

          {result && (
            <div className="flex flex-col gap-3 rounded-[10px] bg-white/[0.02] p-3">
              <div className="text-sm text-[var(--ll-verified)]">
                {result.subject.displayName} registered on-chain
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--ll-text-secondary)]">
                <span>subjectId</span>
                <CopySubjectId subjectId={result.subject.subjectId} />
              </div>
              <p className="text-xs text-[var(--ll-text-secondary)]">
                Share this ID with a creator so they can require your consent on an asset.
              </p>
              <TransactionLink txHash={result.txHash} blockNumber={result.blockNumber} />
            </div>
          )}
        </CardContent>
      </Card>

      {registered.length > 0 && (
        <Card className="rounded-[16px] border-white/10 bg-[var(--ll-surface)]">
          <CardHeader>
            <CardTitle className="text-base">Registered locally</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {registered.map((s) => (
              <div
                key={s.subjectId}
                className="flex items-center justify-between text-sm text-[var(--ll-text-primary)]"
              >
                <span>{s.displayName}</span>
                <CopySubjectId subjectId={s.subjectId} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
