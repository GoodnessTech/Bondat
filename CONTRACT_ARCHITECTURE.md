# BONDAT Protocol — Smart Contract Architecture

## 1. Overview & Architectural Philosophy

BONDAT is implemented as a **compressed-startup, single-contract architecture** (`BondatCore.sol`). In accordance with protocol specifications:
- **Exactly ONE custom Solidity contract** (`BondatCore.sol`).
- **Zero proxy overhead**, zero upgradeability complexity, and zero factory overhead.
- **Native BOT currency only** for collateral, premiums, and payouts (no external ERC-20, NFT, or oracle token dependencies).
- **Checks-Effects-Interactions (CEI)** and reentrancy protection on all state-modifying external functions.
- **Gas-conscious, packed storage layout** utilizing Solidity `0.8.24` with Yul intermediate representation (`via_ir = true`).

---

## 2. On-Chain Lifecycle

```
[Operator]                [Customer]                 [Agent]                  [Arbitrator]
     │                         │                        │                          │
     ├── 1. registerAgent ────┼────────────────────────┼──────────────────────────┤
     │   (Pledge BOT Bond)     │                        │                          │
     ├── 2. depositCollateral ─┼────────────────────────┼──────────────────────────┤
     │                         ├── 3. purchaseCoverage ─┼──────────────────────────┤
     │                         │   (Pay 5% Premium)     │                          │
     │                         │   [Collateral Locked]  │                          │
     │                         │                        ├── 4. Execute Service ────┤
     ├── 5. submitEvidence ────┼────────────────────────┼──────────────────────────┤
     │   (Cryptographic Hash)  │                        │                          │
     │                         │                        │                          │
     │   [Resolution Paths]    │                        │                          │
     │   A. confirmService ────┤ (Release Collateral)   │                          │
     │   B. finalizePolicy ────┤ (Claim Window Expired) │                          │
     │   C. fileClaim ─────────┤                        │                          │
     │      ├─ MISSED_DELIVERY (No Evidence) ───────────► Automatic Payout         │
     │      └─ INVALID_OUTPUT / DOWNTIME ───────────────► Arbitrator Review ───────┤
     │                                                                             └── resolveClaim
```

---

## 3. Storage Layout & Packing

`BondatCore` packs all mutable state variables into minimal 32-byte storage slots to reduce cold `SSTORE` and `SLOAD` costs:

### Agent Struct (3 Storage Slots)
```solidity
struct Agent {
    address operator;          // 20 bytes ┐ Slot 0 (21 bytes)
    AgentStatus status;        //  1 byte  ┘
    uint128 totalCollateral;   // 16 bytes ┐ Slot 1 (32 bytes)
    uint128 lockedCollateral;  // 16 bytes ┘
    bytes32 metadataHash;      // 32 bytes ─ Slot 2 (32 bytes)
}
```

### Policy Struct (5 Storage Slots)
```solidity
struct Policy {
    address customer;          // 20 bytes ┐
    PolicyStatus status;       //  1 byte  │ Slot 0 (23 bytes)
    ClaimStatus claimStatus;   //  1 byte  │
    ClaimReason claimReason;   //  1 byte  ┘
    uint64 deadline;           //  8 bytes ┐
    uint32 claimWindow;        //  4 bytes │ Slot 1 (32 bytes)
    uint32 agentId;            //  4 bytes │
    uint128 coverageAmount;    // 16 bytes ┘
    uint128 payoutAmount;      // 16 bytes ┐ Slot 2 (24 bytes)
    uint64 evidenceTimestamp;  //  8 bytes ┘
    bytes32 commitmentHash;    // 32 bytes ─ Slot 3 (32 bytes)
    bytes32 evidenceHash;      // 32 bytes ─ Slot 4 (32 bytes)
}
```

---

## 4. Function Catalog

### Agent Registration & Vault
- `registerAgent(bytes32 metadataHash) external payable returns (uint32)`:
  Registers a new agent under `msg.sender` and optionally deposits native BOT collateral in the same transaction.
- `depositCollateral(uint32 agentId) external payable`:
  Adds native BOT collateral to the agent's balance.
- `withdrawAvailableCollateral(uint32 agentId, uint128 amount) external`:
  Withdraws unencumbered collateral (`totalCollateral - lockedCollateral`). Reverts with `InsufficientCollateral` if attempting to withdraw locked collateral.
- `getAvailableCollateral(uint32 agentId) public view returns (uint128)`:
  Calculates available funds ready to back commitments.

### Coverage Underwriting
- `calculatePremium(uint128 coverageAmount) public view returns (uint256)`:
  Computes the exact premium using `premiumRateBps` (default 500 bps = 5.00%).
- `purchaseCoverage(uint32 agentId, bytes32 commitmentHash, uint128 coverageAmount, uint64 deadline, uint32 claimWindow) external payable returns (uint32)`:
  Underwrites protection for a commitment, immediately locking `coverageAmount` in the agent's collateral and allocating premium to `totalProtocolRevenue`. Any overpayment is refunded.

### Service Evidence & Settlement
- `submitEvidence(uint32 policyId, bytes32 evidenceHash) external`:
  Called by the agent operator before the deadline to record cryptographic proof of delivery.
- `fileClaim(uint32 policyId, ClaimReason reason, bytes32 evidenceHash) external`:
  - **Automatic Settlement (Objective)**: If `reason == MISSED_DELIVERY` and `evidenceHash == bytes32(0)` post-deadline, the protocol immediately pays 100% of `coverageAmount` to the customer and slashes the operator's collateral.
  - **Arbitrated Settlement (Subjective)**: If evidence was submitted or reason is `INVALID_OUTPUT` / `SERVICE_DOWNTIME`, claim enters `SUBMITTED` state for arbitrator evaluation.
- `resolveClaim(uint32 policyId, bool approved, uint128 payoutAmount) external`:
  Designated arbitrator resolves disputed claim. Enforces `payoutAmount <= policy.coverageAmount`.
- `confirmService(uint32 policyId) external`:
  Customer releases operator collateral upon satisfactory delivery.
- `finalizePolicy(uint32 policyId) external`:
  Unchallenged policies past their claim window can be settled by anyone, unlocking collateral back to the operator.

### Protocol Revenue
- `withdrawRevenue(address payable to, uint128 amount) external`:
  Owner-only withdrawal of earned protocol premiums. Strictly isolated from agent collateral.

---

## 5. Mainnet Parameters

| Parameter | Value |
| :--- | :--- |
| **Contract Name** | `BondatCore` |
| **Solidity Version** | `0.8.24` |
| **Target Chain** | BOT Chain Mainnet (`677`) |
| **Contract Address** | `0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6` |
| **Max Premium Rate** | 10.00% (`1000 bps`) |
| **Initial Premium Rate**| 5.00% (`500 bps`) |
| **Protocol Fee** | Built into premium structure |

