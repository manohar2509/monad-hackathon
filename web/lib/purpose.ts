import { keccak256, toBytes } from "viem";
import type { Hex } from "./types";

/**
 * Deterministic purpose normalization (spec §8.3): trim leading/trailing whitespace
 * and collapse internal repeated whitespace to one space, before hashing UTF-8 bytes.
 * Both creator and display flows must apply this identically.
 */
export function normalizePurpose(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function hashPurpose(raw: string): Hex {
  const normalized = normalizePurpose(raw);
  return keccak256(toBytes(normalized));
}
