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

// Monad testnet's public RPC caps eth_getLogs to a 100-block range per call.
const LOG_QUERY_CHUNK = 100n;

// Block the contract was deployed at — nothing relevant exists before this,
// so backward-chunked searches never need to scan past it.
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK)
  : 0n;

/**
 * The frozen interface exposes activeConsentCount/expired via getAssetStatus but not
 * the raw contentHash/purposeHash/expiresAt fields directly. Both the client (to build
 * the exact digest it must sign) and the UI (to render terms before signing) need them,
 * so they're recovered from the AssetCreated event log, which carries all three.
 *
 * Scans backward from the latest block in 100-block windows (the RPC's per-call cap)
 * down to DEPLOY_BLOCK. Assets are always created after deployment and, in practice,
 * shortly before this is called, so this resolves in one or two chunks.
 */
const PARALLEL_CHUNKS = 10n; // 10 x 100-block windows per round trip batch

export async function getAssetCreatedFields(assetId: Hex): Promise<{
  contentHash: Hex;
  purposeHash: Hex;
  expiresAt: bigint;
}> {
  const latest = await publicClient.getBlockNumber();

  const windows: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  let toBlock = latest;
  while (toBlock >= DEPLOY_BLOCK) {
    const fromBlock = toBlock - LOG_QUERY_CHUNK + 1n > DEPLOY_BLOCK
      ? toBlock - LOG_QUERY_CHUNK + 1n
      : DEPLOY_BLOCK;
    windows.push({ fromBlock, toBlock });
    if (fromBlock === DEPLOY_BLOCK) break;
    toBlock = fromBlock - 1n;
  }

  // Query newest-first, in parallel batches, so a recently created asset
  // (the common case: /create just redirected here) resolves in one round trip.
  for (let i = 0; i < windows.length; i += Number(PARALLEL_CHUNKS)) {
    const batch = windows.slice(i, i + Number(PARALLEL_CHUNKS));
    const results = await Promise.all(
      batch.map(({ fromBlock, toBlock }) =>
        publicClient.getContractEvents({
          address: contractAddress(),
          abi: LIKENESS_LOCK_ABI,
          eventName: "AssetCreated",
          args: { assetId },
          fromBlock,
          toBlock,
        }),
      ),
    );

    for (const logs of results) {
      const log = logs[0];
      if (log && "args" in log) {
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
    }
  }

  throw new Error("ASSET_NOT_FOUND");
}
