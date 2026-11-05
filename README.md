# BONDAT — Collateral-Backed AI Agent Protection Protocol

> **Verifiable certainty for the autonomous economy.**  
> Bondat makes AI agent services accountable by connecting operator performance bonds directly to customer service commitments on **BOT Chain Mainnet**.

---

## Overview

As autonomous AI agents execute high-value tasks, service certainty becomes the bedrock of the machine economy. **BONDAT** is a decentralized protection protocol where:
1. **Operators deposit collateral**: Staking native `BOT` as a performance bond behind specified service commitments.
2. **Customers purchase coverage**: Buying financial certainty against measurable failure conditions (missed deadlines, schema drift, downtime).
3. **Evidence resolves outcomes**: Cryptographic evidence hashes settle claims objectively through an immutable on-chain lifecycle.

---

## Target Network Configuration

BONDAT is configured for **BOT Chain Mainnet**:

| Parameter | Value |
| :--- | :--- |
| **Network Name** | BOT Chain Mainnet |
| **Chain ID** | `677` (Hex: `0x2a5`) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Native Currency** | `BOT` (18 decimals) |
| **Block Explorer** | [scan.botchain.ai](https://scan.botchain.ai) |

---

## Architecture & Codebase Structure

The frontend is built with **React 18**, **TypeScript**, **Vite 7**, and **Tailwind CSS**, strictly adhering to the approved **AzioFlow-inspired** visual design:

```
Bondat/
├── public/                 # Static assets and icons
├── src/
│   ├── config/
│   │   └── chain.ts        # Centralized network & contract configuration
│   ├── services/
│   │   └── web3.ts         # Decoupled Web3 reads, writes & wallet provider
│   ├── types/
│   │   └── index.ts        # Route, Agent, Policy, and Claim types
│   ├── App.tsx             # Main application & connected route views
│   ├── index.css           # Preserved AzioFlow design system & responsive styling
│   ├── main.tsx            # Entry point
│   └── vite-env.d.ts       # Vite client types
├── index.html              # HTML shell with meta tags & favicon
├── package.json            # Scripts & cleaned dependencies (zero unused packages)
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration with alias support
└── README.md               # Documentation
```

### Key Engineering Principles
- **Separation of Concerns**: All Web3 provider interactions, JSON-RPC queries, network switching, and contract dispatch logic are strictly isolated in `src/services/web3.ts` and `src/config/chain.ts`. UI components consume clean, typed APIs.
- **Data Integrity (No Simulation)**: The application does not fabricate balances, transaction hashes, or fake agent records. Real-world empty states and explicit integration placeholders represent the live status honestly.
- **Centralized Contract Management**: The contract address is explicitly unset (`null`) in `src/config/chain.ts` until the official deployment is finalized on BOT Chain Mainnet.
- **Design System Fidelity**: Retains the authentic cream (`#eadacb`), charcoal (`#211f1d`), burnt-orange (`#873900`), and terracotta (`#b65d24`) palette, paired with DM Mono and Playfair Display typography.

---

## Route Map & User Flows

The application features full hash-based routing with zero broken buttons:

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `/#/` | **Landing Page** | Protocol overview, lifecycle steps, category overview, and quick navigation. |
| `/#/dashboard` | **Dashboard** | Operator & customer command center; live BOT balance from RPC, collateral metrics, and wallet state. |
| `/#/agents` | **Agent Registry** | On-chain directory with category filters and full agent registration validation. |
| `/#/agent-details` | **Agent Details** | Specification view displaying SLA parameters, failure triggers, and performance bond specs. |
| `/#/marketplace` | **Marketplace** | Protection marketplace with dynamic fee calculation (5% premium, 1.5% protocol fee). |
| `/#/coverage-details` | **Coverage Details** | Detailed breakdown of underwriting, 1:1 collateral lock, and claim window mechanics. |
| `/#/claims` | **Claims Center** | Resolution layer with summary counters, empty state, and interactive claim submission form. |
| `/#/docs` | **Documentation** | Comprehensive 8-part Bondat handbook with smooth-scrolling section navigation. |

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24.x tested)
- **npm**: v9.0.0 or higher (v11.x tested)

### Installation
```bash
# Clone the repository
git clone https://github.com/GoodnessTech/Bondat.git
cd Bondat

# Install dependencies
npm install
```

### Available Scripts
```bash
# Start local development server
npm run dev

# Run TypeScript compiler checks
npm run typecheck

# Run ESLint linter
npm run lint

# Compile production build
npm run build

# Preview production build locally
npm run preview
```

---

## Smart Contract Integration Guide

When the Bondat smart contracts are deployed to BOT Chain Mainnet, update `src/config/chain.ts`:

```typescript
export const CONTRACT_CONFIG: ContractConfig = {
  // Replace null with the verified mainnet contract address:
  address: '0x...', 
  status: 'DEPLOYED',
  isDeployed: true,
  deploymentNotes: 'Official Bondat core contract on BOT Chain Mainnet.',
  protocolFeePercent: 1.5,
  standardPremiumRatePercent: 5.0,
};
```

All methods in `src/services/web3.ts` (`registerAgent`, `purchaseCoverage`, `submitClaim`) are prepared to dispatch directly against the contract ABI once this address is supplied.

---

## Deployment (Vercel)

1. **Framework Preset**: Vite
2. **Root Directory**: `./`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Node.js Version**: 18.x or 20.x

---

## License

© 2026 Bondat Protocol. All rights reserved.

