# LikenessLock web

Next.js app implementing the five frozen routes from the spec (§8, §10):
`/`, `/identity`, `/create`, `/asset/[assetId]`, `/verify`, plus the
`/api/relay` transaction relayer.

## Setup (fresh clone)

Create `web/.env.local` (gitignored, never commit — contains a private key):

```
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...          # set after contract deploy
NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL=https://testnet.monadexplorer.com

MONAD_RPC_URL=https://testnet-rpc.monad.xyz
RELAYER_PRIVATE_KEY=0x...                   # server-only, never NEXT_PUBLIC_
```

`RELAYER_PRIVATE_KEY` must never be prefixed `NEXT_PUBLIC_` — that would ship
it to the browser bundle. It's read only inside `app/api/relay/route.ts`.

## Usage

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

WebAuthn passkeys are origin-bound — `localhost` works as a dev fallback, but
real end-to-end testing needs the final deployed HTTPS origin (spec §6.5).
