import { encodeAbiParameters, keccak256, toHex } from "viem";
import type { Hex } from "./types";

export const ACTION_GRANT = keccak256(toHex("LIKENESSLOCK_GRANT_V1"));
export const ACTION_REVOKE = keccak256(toHex("LIKENESSLOCK_REVOKE_V1"));

/**
 * Mirrors LikenessLock.sol's digest reconstruction exactly (spec §5.5):
 * keccak256(abi.encode(action, chainId, contractAddress, assetId, contentHash,
 * purposeHash, expiresAt, subjectId, nonce)). Field order is frozen.
 */
export function buildAuthorizationDigest(params: {
  action: Hex;
  chainId: number;
  contractAddress: Hex;
  assetId: Hex;
  contentHash: Hex;
  purposeHash: Hex;
  expiresAt: bigint;
  subjectId: Hex;
  nonce: bigint;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" }, // action
        { type: "uint256" }, // chainId
        { type: "address" }, // contract address
        { type: "bytes32" }, // assetId
        { type: "bytes32" }, // contentHash
        { type: "bytes32" }, // purposeHash
        { type: "uint64" }, // expiresAt
        { type: "bytes32" }, // subjectId
        { type: "uint256" }, // nonce
      ],
      [
        params.action,
        BigInt(params.chainId),
        params.contractAddress,
        params.assetId,
        params.contentHash,
        params.purposeHash,
        params.expiresAt,
        params.subjectId,
        params.nonce,
      ],
    ),
  );
}
