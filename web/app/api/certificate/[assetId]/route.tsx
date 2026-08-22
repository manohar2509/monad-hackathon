import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import {
  getAssetCreatedFields,
  getAssetStatus,
  getConsentState,
  getRequiredSubjects,
} from "@/lib/contract";
import type { ConsentStatus, Hex } from "@/lib/types";

export const runtime = "nodejs";

const statusColor: Record<ConsentStatus, string> = {
  none: "#A7A1B5",
  active: "#39D98A",
  revoked: "#FF5C7A",
};

const statusLabel: Record<ConsentStatus, string> = {
  none: "NOT SIGNED",
  active: "ACTIVE",
  revoked: "REVOKED",
};

const stateFromNumber: Record<number, ConsentStatus> = { 0: "none", 1: "active", 2: "revoked" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const url = new URL(request.url);
  const purpose = url.searchParams.get("purpose") || "(purpose not available)";

  let names: Record<string, string> = {};
  const namesParam = url.searchParams.get("names");
  if (namesParam) {
    try {
      names = JSON.parse(namesParam);
    } catch {
      names = {};
    }
  }

  const id = assetId as Hex;

  const [fields, status, subjectIds] = await Promise.all([
    getAssetCreatedFields(id).catch(() => null),
    getAssetStatus(id),
    getRequiredSubjects(id),
  ]);

  if (!fields) {
    return new Response("Asset not found", { status: 404 });
  }

  const subjects = await Promise.all(
    subjectIds.map(async (subjectId) => ({
      name: names[subjectId] ?? `${subjectId.slice(0, 8)}...`,
      status: stateFromNumber[await getConsentState(id, subjectId)] ?? "none",
    })),
  );

  const verifyUrl = `${url.origin}/asset/${assetId}`;
  const qrDataUri = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 220,
    color: { dark: "#08060F", light: "#FFFFFF" },
  });

  const overallColor = status.expired ? "#FF5C7A" : status.valid ? "#39D98A" : "#FF5C7A";
  const overallLabel = status.expired
    ? "CONSENT EXPIRED"
    : status.valid
      ? "CONSENT VERIFIED"
      : "CONSENT INVALID";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          background: "#08060F",
          padding: "56px",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, letterSpacing: 4, color: "#A7A1B5" }}>LIKENESSLOCK</div>
          <div
            style={{
              display: "flex",
              background: "rgba(110,84,255,0.15)",
              color: "#DDD7FE",
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            MONAD
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 40, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
            <div style={{ display: "flex", fontSize: 20, color: "#A7A1B5" }}>
              Fingerprint{" "}
              <span style={{ color: "#FFFFFF" }}>
                {fields.contentHash.slice(0, 18)}...{fields.contentHash.slice(-8)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: "20px 24px",
                marginTop: 8,
              }}
            >
              {subjects.map((s) => (
                <div
                  key={s.name}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 22 }}
                >
                  <span>{s.name}</span>
                  <span style={{ color: statusColor[s.status], fontWeight: 600 }}>
                    {statusLabel[s.status]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <div style={{ display: "flex", fontSize: 20, color: "#A7A1B5" }}>
                Purpose: <span style={{ color: "#FFFFFF" }}>{purpose}</span>
              </div>
              <div style={{ display: "flex", fontSize: 20, color: "#A7A1B5" }}>
                Valid until:{" "}
                <span style={{ color: "#FFFFFF" }}>
                  {new Date(Number(fields.expiresAt) * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                marginTop: "auto",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: overallColor }}>
                {overallLabel}
              </div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>
                {Number(status.active)} / {Number(status.required)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: 280,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUri} width={220} height={220} style={{ borderRadius: 12 }} alt="" />
            <div style={{ display: "flex", fontSize: 16, color: "#A7A1B5" }}>
              Scan to verify live on Monad
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 675 },
  );
}
