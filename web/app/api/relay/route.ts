import { NextResponse } from "next/server";
import { createWalletClient, http, isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { LIKENESS_LOCK_ABI, contractAddress } from "@/lib/contract";
import { monadTestnet, publicClient } from "@/lib/monad";
import type { Hex, RelayRequest, RelayResponse } from "@/lib/types";

// Server-only. Never reference RELAYER_PRIVATE_KEY from NEXT_PUBLIC_* code paths.
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

function fail(code: string, message: string, status = 400): NextResponse<RelayResponse> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function isHex32(v: unknown): v is Hex {
  return typeof v === "string" && isHex(v) && v.length === 66;
}

function isHexBytes(v: unknown): v is Hex {
  return typeof v === "string" && isHex(v);
}

function validateAuth(auth: unknown): auth is {
  r: Hex;
  s: Hex;
  challengeIndex: number;
  typeIndex: number;
  authenticatorData: Hex;
  clientDataJSON: string;
} {
  if (typeof auth !== "object" || auth === null) return false;
  const a = auth as Record<string, unknown>;
  return (
    isHex32(a.r) &&
    isHex32(a.s) &&
    typeof a.challengeIndex === "number" &&
    Number.isInteger(a.challengeIndex) &&
    a.challengeIndex >= 0 &&
    typeof a.typeIndex === "number" &&
    Number.isInteger(a.typeIndex) &&
    a.typeIndex >= 0 &&
    isHexBytes(a.authenticatorData) &&
    typeof a.clientDataJSON === "string" &&
    a.clientDataJSON.length > 0 &&
    a.clientDataJSON.length < 4096
  );
}

export async function POST(request: Request): Promise<NextResponse<RelayResponse>> {
  if (!RELAYER_PRIVATE_KEY) {
    return fail("RELAYER_NOT_CONFIGURED", "Relayer is not configured", 500);
  }

  let body: RelayRequest;
  try {
    body = (await request.json()) as RelayRequest;
  } catch {
    return fail("INVALID_JSON", "Request body must be valid JSON");
  }

  if (typeof body !== "object" || body === null || typeof body.action !== "string") {
    return fail("INVALID_REQUEST", "Missing or invalid action");
  }

  const account = privateKeyToAccount(RELAYER_PRIVATE_KEY as Hex);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  let functionName: string;
  let args: unknown[];

  switch (body.action) {
    case "registerSubject": {
      if (!isHex32(body.qx) || !isHex32(body.qy)) {
        return fail("INVALID_ARGS", "qx and qy must be 32-byte hex values");
      }
      functionName = "registerSubject";
      args = [body.qx, body.qy];
      break;
    }
    case "createAsset": {
      const { contentHash, purposeHash, expiresAt, requiredSubjects } = body;
      if (!isHex32(contentHash) || !isHex32(purposeHash)) {
        return fail("INVALID_ARGS", "contentHash and purposeHash must be 32-byte hex values");
      }
      if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= 0) {
        return fail("INVALID_ARGS", "expiresAt must be a positive unix timestamp");
      }
      if (
        !Array.isArray(requiredSubjects) ||
        requiredSubjects.length === 0 ||
        requiredSubjects.length > 16 ||
        !requiredSubjects.every(isHex32)
      ) {
        return fail("INVALID_ARGS", "requiredSubjects must be a non-empty array (max 16) of 32-byte hex values");
      }
      functionName = "createAsset";
      args = [contentHash, purposeHash, BigInt(expiresAt), requiredSubjects];
      break;
    }
    case "grantConsent":
    case "revokeConsent": {
      const { assetId, subjectId, auth } = body;
      if (!isHex32(assetId) || !isHex32(subjectId)) {
        return fail("INVALID_ARGS", "assetId and subjectId must be 32-byte hex values");
      }
      if (!validateAuth(auth)) {
        return fail("INVALID_ARGS", "auth does not match the expected WebAuthnAuth schema");
      }
      functionName = body.action;
      args = [
        assetId,
        subjectId,
        {
          r: auth.r,
          s: auth.s,
          challengeIndex: BigInt(auth.challengeIndex),
          typeIndex: BigInt(auth.typeIndex),
          authenticatorData: auth.authenticatorData,
          clientDataJSON: auth.clientDataJSON,
        },
      ];
      break;
    }
    default:
      return fail("INVALID_ACTION", "Unsupported action");
  }

  try {
    const { request: simulatedRequest, result: simulatedResult } = await publicClient.simulateContract({
      account,
      address: contractAddress(),
      abi: LIKENESS_LOCK_ABI,
      functionName,
      args,
    });

    const txHash = await walletClient.writeContract(simulatedRequest);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      return fail("TX_REVERTED", "Transaction reverted on-chain", 502);
    }

    return NextResponse.json({
      ok: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      result: typeof simulatedResult === "string" ? (simulatedResult as Hex) : undefined,
    });
  } catch (err) {
    // Server logs may contain raw RPC errors; the client only gets a sanitized message.
    console.error("[relay]", functionName, err);
    const message = err instanceof Error ? err.message : "Unknown relayer error";
    const sanitized = message.includes("reverted")
      ? "Transaction would revert: invalid authorization or state"
      : "Relayer failed to submit the transaction";
    return fail("RELAY_FAILED", sanitized, 502);
  }
}
