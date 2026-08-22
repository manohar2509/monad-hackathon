"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropzone } from "@/components/file-dropzone";
import { ConsentPassport, type PassportStatus } from "@/components/consent-passport";
import { hashFile } from "@/lib/hash-file";
import {
  getAssetIdByContentHash,
  getAssetCreatedFields,
  getAssetStatus,
  getConsentState,
  getRequiredSubjects,
} from "@/lib/contract";
import { listDemoSubjects } from "@/lib/demo-subjects";
import type { ConsentStatus, Hex } from "@/lib/types";

type Result =
  | { kind: "no-passport"; fingerprint: Hex }
  | {
      kind: "resolved";
      fingerprint: Hex;
      assetId: Hex;
      status: PassportStatus;
      activeCount: number;
      subjects: { displayName: string; status: ConsentStatus }[];
      purpose: string;
      validUntil: string;
    };

const stateLabel: Record<number, ConsentStatus> = { 0: "none", 1: "active", 2: "revoked" };

export default function VerifyPage() {
  const [fileName, setFileName] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setLoading(true);
    setResult(null);

    try {
      const fingerprint = await hashFile(file);
      const assetId = await getAssetIdByContentHash(fingerprint);
      const empty = /^0x0+$/.test(assetId);

      if (empty) {
        setResult({ kind: "no-passport", fingerprint });
        return;
      }

      const [fields, status, subjectIds] = await Promise.all([
        getAssetCreatedFields(assetId),
        getAssetStatus(assetId),
        getRequiredSubjects(assetId),
      ]);

      const known = listDemoSubjects();
      const subjects = await Promise.all(
        subjectIds.map(async (subjectId) => {
          const stateNum = await getConsentState(assetId, subjectId);
          const local = known.find((s) => s.subjectId === subjectId);
          return {
            displayName: local?.displayName ?? `${subjectId.slice(0, 8)}...`,
            status: stateLabel[stateNum] ?? "none",
          };
        }),
      );

      const purpose =
        (typeof window !== "undefined" && sessionStorage.getItem(`likenesslock:purpose:${assetId}`)) ||
        `purposeHash ${fields.purposeHash.slice(0, 10)}...`;

      const passportStatus: PassportStatus = status.expired
        ? "expired"
        : status.valid
          ? "valid"
          : "invalid";

      setResult({
        kind: "resolved",
        fingerprint,
        assetId,
        status: passportStatus,
        activeCount: Number(status.active),
        subjects,
        purpose,
        validUntil: new Date(Number(fields.expiresAt) * 1000).toLocaleDateString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[var(--ll-text-primary)]">
          Verify an asset
        </h1>
        <p className="mt-1 text-sm text-[var(--ll-text-secondary)]">
          No wallet or action required. Upload the exact file to independently check its
          current authorization on Monad.
        </p>
      </div>

      <Card className="w-full rounded-[16px] border-white/10 bg-[var(--ll-surface)]">
        <CardContent className="pt-6">
          <FileDropzone onFile={handleFile} fileName={fileName} />
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-[var(--ll-text-secondary)]">Resolving fingerprint on Monad...</p>
      )}

      {result?.kind === "no-passport" && (
        <ConsentPassport
          title="Unregistered file"
          fingerprint={`${result.fingerprint.slice(0, 10)}...${result.fingerprint.slice(-6)}`}
          subjects={[]}
          purpose="—"
          validUntil="—"
          status="no-passport"
          activeCount={0}
          requiredCount={0}
        />
      )}

      {result?.kind === "resolved" && (
        <ConsentPassport
          title={`Asset ${result.assetId.slice(0, 10)}...`}
          fingerprint={`${result.fingerprint.slice(0, 10)}...${result.fingerprint.slice(-6)}`}
          subjects={result.subjects}
          purpose={result.purpose}
          validUntil={result.validUntil}
          status={result.status}
          activeCount={result.activeCount}
          requiredCount={result.subjects.length}
        />
      )}
    </main>
  );
}
