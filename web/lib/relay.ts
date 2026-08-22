import type { RelayRequest, RelayResponse } from "./types";

export async function callRelay(req: RelayRequest): Promise<RelayResponse> {
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return (await res.json()) as RelayResponse;
}
