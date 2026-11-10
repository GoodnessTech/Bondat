# BONDAT Protocol — Gas Report & Optimization Analysis

## 1. Deployment Gas Summary

| Metric | Target / Limit | Measured Result |
| :--- | :--- | :--- |
| **Max Deployment Cost** | `< 0.05 BOT` | **`0.03389636 BOT`** |
| **Gas Price (BOT Chain)** | `20 gwei` | `20 gwei` |
| **Deployment Gas (Actual)**| — | **`1,694,818` gas** |
| **Runtime Bytecode Size** | `< 24,576 bytes` | **`7,676 bytes`** |
| **Initcode Size** | `< 49,152 bytes` | **`8,165 bytes`** |

---

## 2. Execution Gas Profile by Function

Measured via Foundry test suite with `solc 0.8.24`, `optimizer = true`, `optimizer_runs = 200`, `via_ir = true`:

| Function Name | Min Gas | Avg Gas | Median Gas | Max Gas | Invocations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `registerAgent` | 76,915 | 98,493 | 98,615 | 98,615 | 534 |
| `depositCollateral` | 29,078 | 39,798 | 39,798 | 50,518 | 2 |
| `withdrawAvailableCollateral` | 31,308 | 36,223 | 36,223 | 41,138 | 4 |
| `purchaseCoverage` | 32,432 | 134,573 | 134,755 | 141,700 | 527 |
| `submitEvidence` | 36,151 | 77,266 | 77,423 | 77,423 | 263 |
| `fileClaim` (Auto Settlement) | 32,062 | 35,027 | 34,905 | 70,065 | 263 |
| `resolveClaim` (Arbitration) | 24,080 | 32,019 | 31,940 | 53,236 | 260 |
| `confirmService` | 38,949 | 38,949 | 38,949 | 38,949 | 1 |
| `finalizePolicy` | 38,981 | 38,981 | 38,981 | 38,981 | 1 |
| `withdrawRevenue` | 24,064 | 43,410 | 43,410 | 62,756 | 2 |
| `getAvailableCollateral` | 2,869 | 2,943 | 2,950 | 2,950 | 526 |
| `calculatePremium` | 2,980 | 2,980 | 2,980 | 2,980 | 515 |
| `getAgent` | 7,343 | 7,343 | 7,343 | 7,343 | 265 |
| `getPolicy` | 12,728 | 12,728 | 12,728 | 12,728 | 7 |

---

## 3. Key Optimization Techniques Applied

1. **Yul Intermediate Representation (`via_ir = true`)**:
   Reduced runtime bytecode by 4,000+ bytes through cross-function inlining and unified call stack management.
2. **Storage Packing**:
   - `Agent` struct compressed from 5 storage slots to 3 slots.
   - `Policy` struct compressed from 9 storage slots to 5 slots.
3. **Zero-Cost Constructor Initialization**:
   `_locked` (0 = unlocked, 1 = locked) and ID counters (`nextAgentId`, `nextPolicyId`) utilize EVM zero-defaults, saving 3 cold `SSTORE` operations (~60,000 gas) at deployment.
4. **Internal Deduplication (`_getPolicyAndAgent`, `_settleCollateral`, `_safeTransfer`)**:
   Eliminated redundant checks and transfer logic across multiple entry points.
5. **Custom Errors**:
   Replaced verbose revert strings with 4-byte custom error selectors.

