import type { Abi } from "viem";
import abiJson from "./LikenessLock.abi.json";
import { publicClient } from "./monad";
import type { Hex } from "./types";

export const LIKENESS_LOCK_ABI = abiJson as Abi;

export function contractAddress(): Hex {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured");
  return addr as Hex;
}

export async function getAssetIdByContentHash(contentHash: Hex): Promise<Hex> {
  return (await publicClient.readContract({
    address: contractAddress(),
    abi: LIKENESS_LOCK_ABI,
    functionName: "getAssetIdByContentHash",
    args: [contentHash],
  })) as Hex;
}

export async function getAssetStatus(assetId: Hex): Promise<{
  active: bigint;
  required: bigint;
  valid: boolean;
  expired: boolean;
}> {
  const [active, required, valid, expired] = (await publicClient.readContract({
    address: contractAddress(),
    abi: LIKENESS_LOCK_ABI,
    functionName: "getAssetStatus",
    args: [assetId],
  })) as [bigint, bigint, boolean, boolean];
  return { active, required, valid, expired };
}

export async function getRequiredSubjects(assetId: Hex): Promise<Hex[]> {
  return (await publicClient.readContract({
    address: contractAddress(),
    abi: LIKENESS_LOCK_ABI,
    functionName: "getRequiredSubjects",
    args: [assetId],
  })) as Hex[];
}

export async function getConsentState(assetId: Hex, subjectId: Hex): Promise<number> {
  return Number(
    await publicClient.readContract({
      address: contractAddress(),
      abi: LIKENESS_LOCK_ABI,
      functionName: "getConsentState",
      args: [assetId, subjectId],
    }),
  );
}

export async function getNonce(subjectId: Hex): Promise<bigint> {
  return (await publicClient.readContract({
    address: contractAddress(),
    abi: LIKENESS_LOCK_ABI,
    functionName: "nonces",
    args: [subjectId],
  })) as bigint;
}

/**
 * The frozen interface exposes activeConsentCount/expired via getAssetStatus but not
 * the raw contentHash/purposeHash/expiresAt fields directly. Both the client (to build
 * the exact digest it must sign) and the UI (to render terms before signing) need them,
 * so they're recovered from the AssetCreated event log, which carries all three.
 */
export async function getAssetCreatedFields(assetId: Hex): Promise<{
  contentHash: Hex;
  purposeHash: Hex;
  expiresAt: bigint;
}> {
  const logs = await publicClient.getContractEvents({
    address: contractAddress(),
    abi: LIKENESS_LOCK_ABI,
    eventName: "AssetCreated",
    args: { assetId },
    fromBlock: 0n,
    toBlock: "latest",
  });

  const log = logs[0];
  if (!log || !("args" in log)) {
    throw new Error("ASSET_NOT_FOUND");
  }

  const args = log.args as {
    assetId: Hex;
    contentHash: Hex;
    purposeHash: Hex;
    expiresAt: bigint;
  };

  return {
    contentHash: args.contentHash,
    purposeHash: args.purposeHash,
    expiresAt: args.expiresAt,
  };
}
