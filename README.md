# BONDAT — Collateral-Backed AI Agent Protection Protocol

> **Verifiable certainty for the autonomous economy.**  
> Bondat makes AI agent services accountable by connecting operator performance bonds directly to customer service commitments on **BOT Chain Mainnet**.

---

## Live BOT Chain Mainnet Deployment

| Parameter | Value |
| :--- | :--- |
| **Network Name** | BOT Chain Mainnet |
| **Chain ID** | `677` (`0x2a5`) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Native Currency** | `BOT` (18 decimals) |
| **Contract Name** | `BondatCore` |
| **Contract Address** | [`0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6`](https://scan.botchain.ai/address/0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6) |
| **Deployment TX** | [`0x79ad87df9c63d575063c53a3c1daed865cfbf337695c4f7ba24d08ea2507bcbb`](https://scan.botchain.ai/tx/0x79ad87df9c63d575063c53a3c1daed865cfbf337695c4f7ba24d08ea2507bcbb) |
| **Block Number** | `29778552` |
| **Deployment Cost** | `0.03389636 BOT` (Strict Budget: `< 0.05 BOT` ✅) |
| **Block Explorer** | [scan.botchain.ai](https://scan.botchain.ai) |

---

## Overview & Transaction Lifecycle

As autonomous AI agents execute mission-critical tasks, service certainty becomes essential. **BONDAT** is an on-chain protection protocol where:

```
Register Agent → Deposit Collateral → Purchase Coverage → Execute Service → Submit Evidence → Validate Claim → Release Collateral or Compensate Customer
```

1. **Operator Staking (Performance Bond)**: AI agent operators register service commitments and lock native `BOT` collateral as a slashable performance bond.
2. **Customer Coverage**: Service consumers purchase time-bound protection policies (standard 5% premium). The protocol reserves collateral 1:1 against the coverage amount.
3. **Execution & Evidence**: Operators submit cryptographic evidence hashes before the deadline proving service completion.
4. **Transparent Resolution**:
   - **Objective Settlement**: Missed delivery claims without submitted evidence settle automatically on-chain with zero human intervention.
   - **Subjective Disputes**: Disputed claims (invalid output, downtime) are evaluated by the designated arbitrator, strictly capped by the reserved coverage amount.
   - **Collateral Release**: Satisfactory service delivery or unchallenged claim window expiration unlocks collateral back to the operator.

---

## Architecture & Codebase Structure

```
Bondat/
├── contracts/
│   └── BondatCore.sol      # Complete single-contract protocol backend
├── test/
│   └── BondatCore.t.sol    # Comprehensive Foundry test suite (22 tests + fuzzing)
├── src/
│   ├── config/
│   │   ├── chain.ts        # Centralized BOT Chain & deployed contract config
│   │   └── abi.json        # Deployed BondatCore ABI
│   ├── services/
│   │   └── web3.ts         # Decoupled Web3 reads, writes & wallet provider
│   ├── types/
│   │   └── index.ts        # Route, Agent, Policy, and Claim types
│   ├── App.tsx             # Main application & connected route views
│   ├── index.css           # Preserved AzioFlow design system & responsive styling
│   └── main.tsx            # Application entry point
├── foundry.toml            # Foundry configuration (solc 0.8.24, via_ir = true)
├── index.html              # HTML shell with meta tags & favicon
├── package.json            # Scripts & cleaned dependencies
├── tsconfig.json           # TypeScript configuration
├── CONTRACT_ARCHITECTURE.md# Complete smart contract specifications
├── SECURITY.md             # Security model, invariants, and threat analysis
├── DEPLOYMENT.md           # Mainnet deployment verification details
├── GAS_REPORT.md           # Gas benchmarks & optimization report
└── TEST_REPORT.md          # 100% passing test matrix & fuzz results
```

---

## Local Development & Testing

### Smart Contract Development (Foundry)
```bash
# Run all 22 tests with verbosity
forge test -vv

# Generate execution gas report
forge test --gas-report

# Check contract bytecode sizes
forge build --sizes
```

### Frontend Development (Vite + React)
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript compiler checks
npm run typecheck

# Run ESLint linter
npm run lint

# Compile production build
npm run build
```

---

## Security Invariants & Guarantees

1. **Collateral Conservation**: Available collateral always equals `totalCollateral - lockedCollateral`. An agent can NEVER withdraw collateral backing active coverage.
2. **Bounded Payouts**: The arbitrator cannot approve a compensation payout greater than the policy's reserved coverage amount.
3. **Non-Custodial Isolation**: Protocol revenue is strictly segregated and cannot deplete agent collateral.
4. **Reentrancy Protection**: Single-slot reentrancy guard combined with Checks-Effects-Interactions (CEI) on all state transitions.

---

## License

© 2026 Bondat Protocol. Built on BOT Chain Mainnet.
