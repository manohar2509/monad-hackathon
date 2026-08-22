import { createPublicClient, http, defineChain } from "viem";

export const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL
    ? {
        default: {
          name: "Monad Explorer",
          url: process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL,
        },
      }
    : undefined,
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export function explorerTxUrl(txHash: string): string | null {
  const base = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/tx/${txHash}`;
}
