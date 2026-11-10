# BONDAT Protocol — Security Model & Verification

## 1. Security Invariants

The protocol guarantees the following strict invariant properties at all times:

1. **Collateral Conservation Invariant**:
   $$\forall \text{agent}, \quad \text{agent.totalCollateral} = \text{agent.lockedCollateral} + \text{availableCollateral}$$
   Contract balance strictly covers all agent deposits and earned revenue:
   $$\text{Contract Balance} \ge \sum \text{agent.totalCollateral} + \text{totalProtocolRevenue}$$

2. **Locked Collateral Protection**:
   An operator can NEVER withdraw collateral that is currently backing an active coverage policy. Any attempt to withdraw more than `totalCollateral - lockedCollateral` reverts with `InsufficientCollateral()`.

3. **Payout Upper Bound Invariant**:
   $$\text{payoutAmount} \le \text{policy.coverageAmount}$$
   The arbitrator cannot approve a compensation payout greater than the policy's reserved coverage amount.

4. **Revenue Segregation**:
   `withdrawRevenue` draws strictly from `totalProtocolRevenue`. It is mathematically decoupled from agent collateral and cannot cause solvency issues for agents.

---

## 2. Tested Threat Vectors & Defenses

| Threat Vector | Mitigation Mechanism | Verification Test |
| :--- | :--- | :--- |
| **Reentrancy on Withdrawal** | Custom single-slot reentrancy guard (`_locked == 1`) + Checks-Effects-Interactions (CEI). | `test_ReentrancyProtection_OnWithdraw()` |
| **Locked Collateral Theft** | `available = total - locked`; balance decremented before external transfer. | `test_RevertWhen_WithdrawLockedCollateral()` |
| **Over-payout by Arbitrator** | Enforces `payoutAmount <= policy.coverageAmount`. | `testFuzz_ArbitratorCannotExceedCoverage()` |
| **Duplicate Claim Submissions** | Checks `policy.claimStatus == ClaimStatus.NONE`; state updated immediately. | `test_RevertWhen_DuplicateClaimFiled()` |
| **Evidence Tampering / Overwrite** | Enforces `policy.evidenceHash == bytes32(0)` before storing. | `test_RevertWhen_DuplicateEvidenceSubmitted()` |
| **Unauthorized Role Execution** | `onlyOwner`, `onlyOperator`, and `onlyArbitrator` custom modifiers. | `test_RevertWhen_UnauthorizedArbitrator()` |
| **Front-running Payouts** | Policy state marked `PAID` before native BOT transfer. | `test_MissedDelivery_AutomaticPayout_WhenNoEvidence()` |
| **Untrusted Overpayment** | Exact required premium calculated; remainder refunded immediately. | `test_CoveragePurchase_AndExcessRefund()` |

---

## 3. The Arbitrator Role & Decentralization Boundaries

### Scope of Authority
- The arbitrator **ONLY** adjudicates subjective disputes (`INVALID_OUTPUT`, `SERVICE_DOWNTIME`, or contested delivery where agent evidence was submitted).
- The arbitrator **CANNOT**:
  1. Alter policy terms, delivery deadlines, or claim windows.
  2. Approve a payout larger than the reserved coverage amount.
  3. Touch unencumbered operator collateral or protocol revenue.
  4. Intervene in objective missed delivery claims (which settle automatically).

### Non-Custodial Guarantee
- If a claim is rejected, 100% of the reserved collateral returns to the operator's available balance.
- If a claim is approved for a partial amount, the remainder is immediately released back to the operator.

