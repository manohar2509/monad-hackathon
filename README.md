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

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge test                    # 30 tests, real P256 signatures
forge script script/Deploy.s.sol --rpc-url <monad-testnet-rpc> --broadcast
```

See [`contracts/README.md`](contracts/README.md) for full details and env vars.

### 2. Web app

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

Requires a `.env.local` — see [`web/README.md`](web/README.md) for the exact variables (RPC URL, deployed contract address, a funded relayer private key).

WebAuthn passkeys are origin-bound: `localhost` works for local development, but a real end-to-end passkey demo needs the deployed HTTPS origin.

## Tech

Solidity + Foundry · OpenZeppelin `WebAuthn`/`P256` · Monad's native P256 precompile (EIP-7951) · Next.js 16 · shadcn/ui · viem · Ox `WebAuthnP256`
