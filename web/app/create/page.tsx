"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/file-dropzone";
import { hashFile } from "@/lib/hash-file";
import { hashPurpose } from "@/lib/purpose";
import { listDemoSubjects } from "@/lib/demo-subjects";
import { callRelay } from "@/lib/relay";
import { getSubjectExists } from "@/lib/contract";
import type { StoredCredential } from "@/lib/passkey";
import type { Hex } from "@/lib/types";

const SUBJECT_ID_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export default function CreatePage() {
  const router = useRouter();

  const [subjects] = useState<StoredCredential[]>(() =>
    typeof window !== "undefined" ? listDemoSubjects() : [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [contentHash, setContentHash] = useState<Hex | null>(null);
  const [purpose, setPurpose] = useState("Commercial AI advertisement");
  const [expiry, setExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [externalSubjects, setExternalSubjects] = useState<Hex[]>([]);
  const [externalInput, setExternalInput] = useState("");
  const [externalError, setExternalError] = useState<string | null>(null);
  const [checkingExternal, setCheckingExternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(f: File) {
    setFile(f);
    setContentHash(await hashFile(f));
  }

  function toggleSubject(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddExternalSubject() {
    const id = externalInput.trim() as Hex;
    setExternalError(null);

    if (!SUBJECT_ID_PATTERN.test(id)) {
      setExternalError("Must be a 32-byte hex subject ID (0x + 64 hex characters).");
      return;
    }
    if (subjects.some((s) => s.subjectId === id) || externalSubjects.includes(id)) {
      setExternalError("Already added.");
      return;
    }

    setCheckingExternal(true);
    try {
      const exists = await getSubjectExists(id);
      if (!exists) {
        setExternalError("No subject registered on Monad with this ID.");
        return;
      }
      setExternalSubjects((prev) => [...prev, id]);
      setSelected((prev) => new Set(prev).add(id));
      setExternalInput("");
    } catch {
      setExternalError("Could not check this subject ID — try again.");
    } finally {
      setCheckingExternal(false);
    }
  }

  function removeExternalSubject(id: Hex) {
    setExternalSubjects((prev) => prev.filter((s) => s !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!contentHash || selected.size === 0 || !purpose.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const purposeHash = hashPurpose(purpose);
      const expiresAt = Math.floor(new Date(`${expiry}T23:59:59Z`).getTime() / 1000);

      const res = await callRelay({
        action: "createAsset",
        contentHash,
        purposeHash,
        expiresAt,
        requiredSubjects: [...selected] as Hex[],
      });

      if (!res.ok) {
        setError(res.message);
        setSubmitting(false);
        return;
      }

      if (!res.result) {
        setError("Relayer did not return the created assetId");
        setSubmitting(false);
        return;
      }

      // Persist purpose text locally (spec 4.2: purpose text is UI/demo metadata, hash is on-chain).
      sessionStorage.setItem(`likenesslock:purpose:${res.result}`, purpose.trim());

      router.push(`/asset/${res.result}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ll-text-primary)]">
          Create consent passport
        </h1>
        <p className="mt-1 text-sm text-[var(--ll-text-secondary)]">
          Drop the exact asset. Purpose and expiry are mandatory and frozen once signed.
        </p>
      </div>

      <Card className="rounded-[16px] border-white/10 bg-[var(--ll-surface)]">
        <CardContent className="flex flex-col gap-5 pt-6">
          <FileDropzone onFile={handleFile} fileName={file?.name} />
          {contentHash && (
            <div className="text-xs font-mono text-[var(--ll-text-secondary)]">
              SHA-256 {contentHash.slice(0, 18)}...{contentHash.slice(-8)}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Commercial AI advertisement"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiry">Expiry</Label>
            <Input
              id="expiry"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Required subjects</Label>
            {subjects.length === 0 ? (
              <p className="text-sm text-[var(--ll-text-secondary)]">
                No subjects registered yet — visit{" "}
                <a href="/identity" className="text-[var(--ll-primary-soft)] underline">
                  Register identity
                </a>{" "}
                first.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {subjects.map((s) => (
                  <label
                    key={s.subjectId}
                    className="flex items-center gap-2 rounded-[10px] bg-white/[0.02] px-3 py-2 text-sm text-[var(--ll-text-primary)]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.subjectId)}
                      onChange={() => toggleSubject(s.subjectId)}
                    />
                    {s.displayName}
                  </label>
                ))}
              </div>
            )}

            {externalSubjects.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {externalSubjects.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-[10px] bg-white/[0.02] px-3 py-2 text-sm text-[var(--ll-text-primary)]"
                  >
                    <span className="font-mono text-xs">
                      {id.slice(0, 10)}...{id.slice(-6)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExternalSubject(id)}
                      className="text-xs text-[var(--ll-text-secondary)] hover:text-[var(--ll-revoked)]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Input
                value={externalInput}
                onChange={(e) => setExternalInput(e.target.value)}
                placeholder="Or paste another subject's ID (0x...)"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-[10px]"
                disabled={!externalInput.trim() || checkingExternal}
                onClick={handleAddExternalSubject}
              >
                {checkingExternal ? "Checking..." : "Add"}
              </Button>
            </div>
            {externalError && <p className="text-xs text-[var(--ll-revoked)]">{externalError}</p>}
            <p className="text-xs text-[var(--ll-text-secondary)]">
              Someone else registered a passkey on their own device? They can find their subject
              ID on their <a href="/identity" className="underline">Register identity</a> page and
              share it with you to add here.
            </p>
          </div>

          {error && <p className="text-sm text-[var(--ll-revoked)]">{error}</p>}

          <Button
            size="lg"
            className="rounded-[10px]"
            disabled={!contentHash || selected.size === 0 || !purpose.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Creating on Monad..." : "Create Passport on Monad"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
