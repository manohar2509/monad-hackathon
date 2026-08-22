import { WebAuthnP256 } from "ox";
import { keccak256, pad } from "viem";
import type { Hex, WebAuthnAuthJSON } from "./types";

export type StoredCredential = {
  displayName: string;
  credentialId: string;
  qx: Hex;
  qy: Hex;
  subjectId: Hex;
};

function toPadded32(value: Hex): Hex {
  return pad(value, { size: 32 });
}

export function subjectIdFor(qx: Hex, qy: Hex): Hex {
  // Mirrors LikenessLock.sol: keccak256(abi.encode(qx, qy))
  return keccak256(`0x${qx.slice(2)}${qy.slice(2)}` as Hex);
}

export async function createPasskeyCredential(displayName: string): Promise<StoredCredential> {
  const credential = await WebAuthnP256.createCredential({
    name: `${displayName} - LikenessLock`,
  });

  const qx = toPadded32(credential.publicKey.x);
  const qy = toPadded32(credential.publicKey.y);

  return {
    displayName,
    credentialId: credential.id,
    qx,
    qy,
    subjectId: subjectIdFor(qx, qy),
  };
}

export async function signDigest(
  credentialId: string,
  digest: Hex,
): Promise<WebAuthnAuthJSON> {
  const { metadata, signature } = await WebAuthnP256.sign({
    credentialId,
    challenge: digest,
  });

  return {
    r: toPadded32(signature.r),
    s: toPadded32(signature.s),
    challengeIndex: metadata.challengeIndex ?? 0,
    typeIndex: metadata.typeIndex ?? 0,
    authenticatorData: metadata.authenticatorData,
    clientDataJSON: metadata.clientDataJSON,
  };
}
