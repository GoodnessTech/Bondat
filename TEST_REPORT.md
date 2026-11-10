# BONDAT Protocol — Test Report

## 1. Test Suite Summary

- **Framework**: Foundry (`forge-std`)
- **Total Tests**: 22
- **Passed**: 22
- **Failed**: 0
- **Skipped**: 0
- **Duration**: ~3.36s CPU time

---

## 2. Test Execution Matrix

| # | Test Name | Category | Result | Gas Cost |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `test_AgentRegistration_WithoutCollateral` | Agent Management | **PASS** | 102,743 |
| 2 | `test_AgentRegistration_WithInitialCollateral` | Agent Management | **PASS** | 135,129 |
| 3 | `test_CollateralDeposit` | Vault Operations | **PASS** | 159,516 |
| 4 | `test_RevertWhen_DepositZeroAmount` | Vault Validation | **PASS** | 120,470 |
| 5 | `test_CollateralWithdrawal` | Vault Operations | **PASS** | 172,035 |
| 6 | `test_RevertWhen_WithdrawExceedsAvailable` | Invariant Protection | **PASS** | 151,382 |
| 7 | `test_RevertWhen_WithdrawLockedCollateral` | Invariant Protection | **PASS** | 341,134 |
| 8 | `test_CoveragePurchase_AndExcessRefund` | Underwriting | **PASS** | 322,594 |
| 9 | `test_RevertWhen_CoverageExceedsAvailableCollateral`| Underwriting | **PASS** | 163,085 |
| 10 | `test_SubmitEvidence` | Evidence Lifecycle | **PASS** | 359,335 |
| 11 | `test_RevertWhen_DuplicateEvidenceSubmitted` | Evidence Lifecycle | **PASS** | 380,725 |
| 12 | `test_ConfirmService_ReleasesCollateral` | Settlement | **PASS** | 334,942 |
| 13 | `test_MissedDelivery_AutomaticPayout_WhenNoEvidence`| Objective Claims | **PASS** | 355,169 |
| 14 | `test_InvalidOutputClaim_ArbitratorApproval` | Subjective Claims | **PASS** | 469,079 |
| 15 | `test_DowntimeClaim_ArbitratorRejection` | Subjective Claims | **PASS** | 362,360 |
| 16 | `test_RevertWhen_DuplicateClaimFiled` | Claim Validation | **PASS** | 410,385 |
| 17 | `test_RevertWhen_UnauthorizedArbitrator` | Access Control | **PASS** | 403,898 |
| 18 | `test_ReentrancyProtection_OnWithdraw` | Security Protection | **PASS** | 462,472 |
| 19 | `test_ProtocolRevenue_Withdrawal` | Revenue Segregation | **PASS** | 375,838 |
| 20 | `test_FinalizePolicy_AfterClaimWindow` | Settlement | **PASS** | 333,278 |
| 21 | `testFuzz_CollateralAccountingInvariant` (256 runs)| Fuzz Invariant | **PASS** | 297,745 avg |
| 22 | `testFuzz_ArbitratorCannotExceedCoverage` (256 runs)| Fuzz Invariant | **PASS** | 427,662 avg |

---

## 3. Fuzz Invariant Testing

- **Property 1: Total Collateral Invariant**:
  $$\text{agent.totalCollateral} = \text{agent.lockedCollateral} + \text{getAvailableCollateral(agentId)}$$
  Tested across 256 random combinations of initial deposits (0.01 BOT to 50 BOT) and coverage amounts (0.001 BOT to initial deposit).
  **Status**: 0 violations detected.

- **Property 2: Bounded Arbitrator Payout Invariant**:
  $$\text{payoutAmount} > \text{coverageAmount} \implies \text{revert PayoutExceedsCoverage()}$$
  Tested across 256 random combinations of coverage amounts and excess payout deltas.
  **Status**: 100% of illegal payouts successfully blocked.
