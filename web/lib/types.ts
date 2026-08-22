export type Hex = `0x${string}`;

export type DemoSubject = {
  displayName: string;
  subjectId: Hex;
  credentialId: string;
  qx: bigint;
  qy: bigint;
};

export type ConsentStatus = "none" | "active" | "revoked";

export type AssetView = {
  assetId: Hex;
  contentHash: Hex;
  purpose: string;
  purposeHash: Hex;
  expiresAt: number;
  requiredSubjects: Hex[];
  activeCount: number;
  requiredCount: number;
  valid: boolean;
  expired: boolean;
};

export type RelayAction =
  | "registerSubject"
  | "createAsset"
  | "grantConsent"
  | "revokeConsent";

export type WebAuthnAuthJSON = {
  r: Hex;
  s: Hex;
  challengeIndex: number;
  typeIndex: number;
  authenticatorData: Hex;
  clientDataJSON: string;
};

export type RelayRequest =
  | { action: "registerSubject"; qx: Hex; qy: Hex }
  | {
      action: "createAsset";
      contentHash: Hex;
      purposeHash: Hex;
      expiresAt: number;
      requiredSubjects: Hex[];
    }
  | {
      action: "grantConsent";
      assetId: Hex;
      subjectId: Hex;
      auth: WebAuthnAuthJSON;
    }
  | {
      action: "revokeConsent";
      assetId: Hex;
      subjectId: Hex;
      auth: WebAuthnAuthJSON;
    };

export type RelaySuccess = {
  ok: true;
  txHash: Hex;
  blockNumber: string;
  result?: Hex;
};

export type RelayFailure = {
  ok: false;
  code: string;
  message: string;
};

export type RelayResponse = RelaySuccess | RelayFailure;
