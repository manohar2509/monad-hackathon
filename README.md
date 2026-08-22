# LikenessLock

**Consent you can verify.** LikenessLock turns likeness consent into a portable cryptographic authorization bound to an exact AI asset, declared purpose, and expiry — granted and revoked with a real passkey, verified live on Monad.

- **Live app:** https://web-two-gold-55.vercel.app
- **Smart contract (Monad Testnet, chain id 10143):** [`0xE60A6215E7621C76Db33ca54a21e6Da13cF7ACB6`](https://testnet.monadexplorer.com/address/0xE60A6215E7621C76Db33ca54a21e6Da13cF7ACB6) — verified source ✅
- **Network:** Monad Testnet

## What it does

1. A subject registers a WebAuthn/P256 passkey; its public key is registered on Monad.
2. A creator uploads a file — the browser computes its exact SHA-256 locally — and creates a consent "passport" on-chain with a purpose and expiry.
3. The subject reviews the exact terms and approves with their passkey. The contract independently verifies the WebAuthn/P256 assertion (Monad's native P256 precompile at `0x0100`) before marking consent Active.
4. Anyone can upload the file to `/verify` and get a live, on-chain-sourced VALID / INVALID / EXPIRED / NO PASSPORT result — no account needed.
5. The subject can revoke with their passkey at any time; the same file immediately verifies as INVALID.

See `LikenessLock_MVP_Agent_Implementation_Spec_v1.0.docx` for the full frozen implementation spec.

## Project structure

```
contracts/   Foundry project — LikenessLock.sol, tests, deploy script
web/         Next.js app — 5 routes + /api/relay transaction relayer
demo-assets/ Original + visibly-edited demo images for the tamper-detection demo
```

## Running it yourself

### 1. Smart contract

Dependencies (`forge-std`, `openzeppelin-contracts`) are not committed — `contracts/lib/` is gitignored and restored with:

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

Create `contracts/.env` (gitignored, never commit) with:

```
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_EXPLORER_API_URL=https://testnet.monadexplorer.com
RELAYER_PRIVATE_KEY=0x...   # server-only, funded Monad testnet key
```

Then:

```bash
forge test                    # 30 tests, real P256 signatures via Foundry cheatcodes
forge script script/Deploy.s.sol --rpc-url $MONAD_RPC_URL --broadcast

# Local dry-run with no real funds needed:
anvil
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 2. Web app

Create `web/.env.local` (gitignored, never commit — contains a private key):

```
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...          # set after contract deploy
NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK=...       # block number of the deploy tx
NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL=https://testnet.monadexplorer.com

MONAD_RPC_URL=https://testnet-rpc.monad.xyz
RELAYER_PRIVATE_KEY=0x...                   # server-only, never NEXT_PUBLIC_
```

`RELAYER_PRIVATE_KEY` must never be prefixed `NEXT_PUBLIC_` — that would ship it to the browser bundle. It's read only inside `app/api/relay/route.ts`.

`NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK` bounds the backward event-log scan in `web/lib/contract.ts` (Monad's public RPC caps `eth_getLogs` to 100 blocks per call) — set it to the block number the contract was deployed at, so lookups never need to scan earlier than that.

Then:

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

WebAuthn passkeys are origin-bound: `localhost` works as a dev fallback, but a real end-to-end passkey demo needs the deployed HTTPS origin.

## Tech

Solidity + Foundry · OpenZeppelin `WebAuthn`/`P256` · Monad's native P256 precompile (EIP-7951) · Next.js 16 · shadcn/ui · viem · Ox `WebAuthnP256`
