# LikenessLock contracts

Foundry project for `LikenessLock.sol` — see the root spec
(`LikenessLock_MVP_Agent_Implementation_Spec_v1.0.docx`, §5) for the frozen
contract interface, digest encoding, and mandatory checks.

## Setup (fresh clone)

Dependencies (`forge-std`, `openzeppelin-contracts`) are **not** committed —
`lib/` is gitignored and restored with:

```shell
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
```

Then create `contracts/.env` (gitignored, never commit) with:

```
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_EXPLORER_API_URL=https://testnet.monadexplorer.com
RELAYER_PRIVATE_KEY=0x...   # server-only, funded Monad testnet key
```

## Usage

### Build

```shell
forge build
```

### Test

30 tests covering AT-01–AT-10 and the §12.1 negative-test list, using real
P256 signatures via Foundry's `vm.signP256`/`vm.publicKeyP256` cheatcodes:

```shell
forge test
```

### Deploy to Monad testnet

```shell
forge script script/Deploy.s.sol --rpc-url $MONAD_RPC_URL --broadcast
```

### Local dry-run (no real funds needed)

```shell
anvil
# in another shell:
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```
