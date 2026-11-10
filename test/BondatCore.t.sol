// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondatCore} from "../contracts/BondatCore.sol";

contract MaliciousAttacker {
    BondatCore public target;
    bool public attacking;
    bool public reentrancyBlocked;

    constructor(BondatCore _target) {
        target = _target;
    }

    function attackWithdraw(uint32 agentId, uint128 amount) external payable {
        attacking = true;
        target.withdrawAvailableCollateral(agentId, amount);
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Attempt reentrant call
            try target.withdrawAvailableCollateral(1, 1 ether) {
                revert("Reentrancy guard failed!");
            } catch (bytes memory reason) {
                bytes4 selector;
                assembly {
                    selector := mload(add(reason, 32))
                }
                if (selector == BondatCore.ReentrantCall.selector) {
                    reentrancyBlocked = true;
                }
            }
        }
    }
}

contract BondatCoreTest is Test {
    BondatCore public bondat;

    address public owner = address(0x1);
    address public arbitrator = address(0x2);
    address public operator = address(0x3);
    address public customer = address(0x4);
    address public stranger = address(0x5);

    uint16 public initialPremiumRateBps = 500; // 5.00%
    bytes32 public sampleMetadata = keccak256("agent-metadata-atlas-v1");
    bytes32 public sampleCommitment = keccak256("sla-delivery-under-600s");
    bytes32 public sampleEvidence = keccak256("execution-proof-tx-001");

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(operator, 100 ether);
        vm.deal(customer, 100 ether);
        vm.deal(stranger, 100 ether);

        vm.prank(owner);
        bondat = new BondatCore(arbitrator, initialPremiumRateBps);
    }

    // --- 1. AGENT REGISTRATION ---

    function test_AgentRegistration_WithoutCollateral() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent(sampleMetadata);

        assertEq(agentId, 1);
        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.operator, operator);
        assertTrue(agent.status == BondatCore.AgentStatus.ACTIVE);
        assertEq(agent.totalCollateral, 0);
        assertEq(agent.lockedCollateral, 0);
        assertEq(agent.metadataHash, sampleMetadata);
    }

    function test_AgentRegistration_WithInitialCollateral() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        assertEq(agentId, 1);
        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.totalCollateral, 10 ether);
        assertEq(bondat.getAvailableCollateral(agentId), 10 ether);
        assertEq(address(bondat).balance, 10 ether);
    }

    // --- 2. COLLATERAL DEPOSITS ---

    function test_CollateralDeposit() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent(sampleMetadata);

        vm.prank(operator);
        bondat.depositCollateral{value: 5 ether}(agentId);

        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.totalCollateral, 5 ether);
        assertEq(bondat.getAvailableCollateral(agentId), 5 ether);
    }

    function test_RevertWhen_DepositZeroAmount() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent(sampleMetadata);

        vm.prank(operator);
        vm.expectRevert(BondatCore.ZeroAmount.selector);
        bondat.depositCollateral{value: 0}(agentId);
    }

    // --- 3. AVAILABLE COLLATERAL CALCULATION & 4. WITHDRAWAL ---

    function test_CollateralWithdrawal() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint256 balanceBefore = operator.balance;
        vm.prank(operator);
        bondat.withdrawAvailableCollateral(agentId, 4 ether);

        assertEq(operator.balance, balanceBefore + 4 ether);
        assertEq(bondat.getAvailableCollateral(agentId), 6 ether);
        assertEq(bondat.getAgent(agentId).totalCollateral, 6 ether);
    }

    // --- 5. INSUFFICIENT COLLATERAL REJECTION ---

    function test_RevertWhen_WithdrawExceedsAvailable() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 5 ether}(sampleMetadata);

        vm.prank(operator);
        vm.expectRevert(BondatCore.InsufficientCollateral.selector);
        bondat.withdrawAvailableCollateral(agentId, 6 ether);
    }

    // --- 6. COVERAGE PURCHASE & 7. PREMIUM CALCULATION & 8. LOCKING ---

    function test_CoveragePurchase_AndExcessRefund() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 20 ether}(sampleMetadata);

        uint128 coverAmount = 10 ether;
        uint256 expectedPremium = (uint256(coverAmount) * initialPremiumRateBps) / 10000; // 0.5 ether
        assertEq(bondat.calculatePremium(coverAmount), expectedPremium);

        uint64 deadline = uint64(block.timestamp + 1 days);
        uint32 claimWindow = 72 hours;

        uint256 custBalanceBefore = customer.balance;

        // Customer pays 1.0 ether (overpaying by 0.5 ether to test refund)
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 1.0 ether}(
            agentId,
            sampleCommitment,
            coverAmount,
            deadline,
            claimWindow
        );

        assertEq(policyId, 1);
        assertEq(customer.balance, custBalanceBefore - expectedPremium); // 0.5 ether refunded

        // Check policy state
        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertEq(policy.customer, customer);
        assertEq(policy.agentId, agentId);
        assertEq(policy.coverageAmount, coverAmount);
        assertTrue(policy.status == BondatCore.PolicyStatus.ACTIVE);
        assertTrue(policy.claimStatus == BondatCore.ClaimStatus.NONE);

        // Check agent collateral accounting
        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.lockedCollateral, coverAmount);
        assertEq(bondat.getAvailableCollateral(agentId), 10 ether);

        // Check protocol revenue
        assertEq(bondat.totalProtocolRevenue(), expectedPremium);
    }

    function test_RevertWhen_CoverageExceedsAvailableCollateral() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 5 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        vm.expectRevert(BondatCore.InsufficientCollateral.selector);
        bondat.purchaseCoverage{value: 1 ether}(
            agentId,
            sampleCommitment,
            6 ether, // Exceeds 5 ether available
            deadline,
            72 hours
        );
    }

    // --- 9. EVIDENCE SUBMISSION ---

    function test_SubmitEvidence() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertEq(policy.evidenceHash, sampleEvidence);
        assertEq(policy.evidenceTimestamp, uint64(block.timestamp));
    }

    function test_RevertWhen_DuplicateEvidenceSubmitted() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        vm.prank(operator);
        vm.expectRevert(BondatCore.EvidenceAlreadySubmitted.selector);
        bondat.submitEvidence(policyId, keccak256("new-evidence"));
    }

    // --- 10. SUCCESSFUL SERVICE CONFIRMATION ---

    function test_ConfirmService_ReleasesCollateral() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        assertEq(bondat.getAvailableCollateral(agentId), 0);

        vm.prank(customer);
        bondat.confirmService(policyId);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertTrue(policy.status == BondatCore.PolicyStatus.SETTLED);
        assertEq(bondat.getAvailableCollateral(agentId), 10 ether);
    }

    // --- 11. MISSED DELIVERY CLAIM (AUTOMATIC SETTLEMENT) ---

    function test_MissedDelivery_AutomaticPayout_WhenNoEvidence() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        uint32 claimWindow = 72 hours;

        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            claimWindow
        );

        // Warp to post-deadline within claim window
        vm.warp(deadline + 1 hours);

        uint256 custBalanceBefore = customer.balance;

        // Customer files MISSED_DELIVERY claim without any agent evidence submitted
        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.MISSED_DELIVERY, bytes32(0));

        // Automatic settlement verification
        assertEq(customer.balance, custBalanceBefore + 10 ether);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertTrue(policy.claimStatus == BondatCore.ClaimStatus.PAID);
        assertTrue(policy.status == BondatCore.PolicyStatus.SETTLED);
        assertEq(policy.payoutAmount, 10 ether);

        // Operator lost collateral
        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.totalCollateral, 0);
        assertEq(agent.lockedCollateral, 0);
    }

    // --- 12. INVALID OUTPUT CLAIM & 14. APPROVAL BY ARBITRATOR ---

    function test_InvalidOutputClaim_ArbitratorApproval() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            72 hours
        );

        // Operator submits output evidence
        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        vm.warp(deadline + 1 hours);

        // Customer disputes invalid output with counter-evidence
        bytes32 customerEvidence = keccak256("counter-evidence-schema-drift");
        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.INVALID_OUTPUT, customerEvidence);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertTrue(policy.claimStatus == BondatCore.ClaimStatus.SUBMITTED);
        assertTrue(policy.status == BondatCore.PolicyStatus.ACTIVE);

        // Arbitrator approves partial payout (8 ether)
        uint256 custBalanceBefore = customer.balance;
        vm.prank(arbitrator);
        bondat.resolveClaim(policyId, true, 8 ether);

        assertEq(customer.balance, custBalanceBefore + 8 ether);

        // Remaining 2 ether returned to operator available collateral
        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.totalCollateral, 2 ether);
        assertEq(agent.lockedCollateral, 0);
        assertEq(bondat.getAvailableCollateral(agentId), 2 ether);
    }

    // --- 13. DOWNTIME CLAIM & 15. REJECTION BY ARBITRATOR ---

    function test_DowntimeClaim_ArbitratorRejection() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            72 hours
        );

        vm.warp(deadline + 2 hours);

        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.SERVICE_DOWNTIME, sampleEvidence);

        // Arbitrator rejects claim
        vm.prank(arbitrator);
        bondat.resolveClaim(policyId, false, 0);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertTrue(policy.claimStatus == BondatCore.ClaimStatus.REJECTED);
        assertTrue(policy.status == BondatCore.PolicyStatus.SETTLED);

        // Entire 10 ether unlocked back to operator
        assertEq(bondat.getAvailableCollateral(agentId), 10 ether);
    }

    // --- 18. DUPLICATE CLAIM PREVENTION ---

    function test_RevertWhen_DuplicateClaimFiled() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            72 hours
        );

        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        vm.warp(deadline + 1 hours);

        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.INVALID_OUTPUT, sampleEvidence);

        vm.prank(customer);
        vm.expectRevert(BondatCore.ClaimAlreadyFiled.selector);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.INVALID_OUTPUT, sampleEvidence);
    }

    // --- 19. UNAUTHORIZED ACCESS CHECKS ---

    function test_RevertWhen_UnauthorizedArbitrator() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            72 hours
        );

        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        vm.warp(deadline + 1 hours);
        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.INVALID_OUTPUT, sampleEvidence);

        // Stranger attempts arbitration
        vm.prank(stranger);
        vm.expectRevert(BondatCore.OnlyArbitrator.selector);
        bondat.resolveClaim(policyId, true, 5 ether);
    }

    // --- 20. REENTRANCY PROTECTION ---

    function test_ReentrancyProtection_OnWithdraw() public {
        MaliciousAttacker attacker = new MaliciousAttacker(bondat);
        vm.deal(address(attacker), 10 ether);

        vm.prank(address(attacker));
        uint32 agentId = bondat.registerAgent{value: 5 ether}(sampleMetadata);

        // Attacker attempts reentrant withdrawal during receive
        vm.prank(address(attacker));
        attacker.attackWithdraw(agentId, 2 ether);

        // Verify reentrancy guard successfully intercepted and blocked the nested call
        assertTrue(attacker.reentrancyBlocked());
        assertEq(bondat.getAvailableCollateral(agentId), 3 ether);
    }

    // --- 21. ATTEMPTED WITHDRAWAL OF LOCKED COLLATERAL ---

    function test_RevertWhen_WithdrawLockedCollateral() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        // Lock 8 ether in coverage
        vm.prank(customer);
        bondat.purchaseCoverage{value: 0.4 ether}(
            agentId,
            sampleCommitment,
            8 ether,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        // Operator tries to withdraw 5 ether (only 2 ether is available)
        vm.prank(operator);
        vm.expectRevert(BondatCore.InsufficientCollateral.selector);
        bondat.withdrawAvailableCollateral(agentId, 5 ether);

        // Withdrawing 2 ether should succeed
        vm.prank(operator);
        bondat.withdrawAvailableCollateral(agentId, 2 ether);
        assertEq(bondat.getAvailableCollateral(agentId), 0);
    }

    // --- 22. PROTOCOL REVENUE WITHDRAWAL ---

    function test_ProtocolRevenue_Withdrawal() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        vm.prank(customer);
        bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        assertEq(bondat.totalProtocolRevenue(), 0.5 ether);

        // Non-owner cannot withdraw
        vm.prank(stranger);
        vm.expectRevert(BondatCore.Unauthorized.selector);
        bondat.withdrawRevenue(payable(stranger), 0.5 ether);

        // Owner withdraws revenue
        address payable treasury = payable(address(0x999));
        vm.prank(owner);
        bondat.withdrawRevenue(treasury, 0.5 ether);

        assertEq(treasury.balance, 0.5 ether);
        assertEq(bondat.totalProtocolRevenue(), 0);
        // Collateral of 10 ether remains unaffected!
        assertEq(bondat.getAgent(agentId).totalCollateral, 10 ether);
    }

    // --- 23. UNCHALLENGED POLICY FINALIZATION ---

    function test_FinalizePolicy_AfterClaimWindow() public {
        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: 10 ether}(sampleMetadata);

        uint64 deadline = uint64(block.timestamp + 1 days);
        uint32 claimWindow = 72 hours;

        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: 0.5 ether}(
            agentId,
            sampleCommitment,
            10 ether,
            deadline,
            claimWindow
        );

        assertEq(bondat.getAvailableCollateral(agentId), 0);

        // Warp past deadline + claim window
        vm.warp(deadline + claimWindow + 1);

        // Anyone / operator can finalize policy
        bondat.finalizePolicy(policyId);

        BondatCore.Policy memory policy = bondat.getPolicy(policyId);
        assertTrue(policy.status == BondatCore.PolicyStatus.SETTLED);
        assertEq(bondat.getAvailableCollateral(agentId), 10 ether);
    }

    // --- 24. FUZZ TEST: COLLATERAL ACCOUNTING INVARIANT ---

    function testFuzz_CollateralAccountingInvariant(uint64 initialDeposit, uint64 coverAmount) public {
        vm.assume(initialDeposit > 0.01 ether && initialDeposit < 50 ether);
        vm.assume(coverAmount > 0.001 ether && coverAmount <= initialDeposit);

        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: initialDeposit}(sampleMetadata);

        uint256 premium = bondat.calculatePremium(coverAmount);
        vm.deal(customer, premium + 1 ether);

        vm.prank(customer);
        bondat.purchaseCoverage{value: premium}(
            agentId,
            sampleCommitment,
            coverAmount,
            uint64(block.timestamp + 1 days),
            72 hours
        );

        BondatCore.Agent memory agent = bondat.getAgent(agentId);
        assertEq(agent.totalCollateral, initialDeposit);
        assertEq(agent.lockedCollateral, coverAmount);
        assertEq(bondat.getAvailableCollateral(agentId), initialDeposit - coverAmount);
        assertEq(uint256(agent.lockedCollateral) + uint256(bondat.getAvailableCollateral(agentId)), uint256(agent.totalCollateral));
    }

    // --- 25. FUZZ TEST: ARBITRATION PAYOUT LIMIT INVARIANT ---

    function testFuzz_ArbitratorCannotExceedCoverage(uint64 coverAmount, uint64 excessPayout) public {
        vm.assume(coverAmount > 0.01 ether && coverAmount < 20 ether);
        vm.assume(excessPayout > 0 && excessPayout < 100 ether);

        vm.prank(operator);
        uint32 agentId = bondat.registerAgent{value: coverAmount}(sampleMetadata);

        uint256 premium = bondat.calculatePremium(coverAmount);
        vm.deal(customer, premium + 1 ether);

        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(customer);
        uint32 policyId = bondat.purchaseCoverage{value: premium}(
            agentId,
            sampleCommitment,
            coverAmount,
            deadline,
            72 hours
        );

        vm.prank(operator);
        bondat.submitEvidence(policyId, sampleEvidence);

        vm.warp(deadline + 1 hours);

        vm.prank(customer);
        bondat.fileClaim(policyId, BondatCore.ClaimReason.INVALID_OUTPUT, sampleEvidence);

        // Attempting to pay more than coverAmount must revert
        uint128 illegalPayout = uint128(coverAmount) + uint128(excessPayout);
        vm.prank(arbitrator);
        vm.expectRevert(BondatCore.PayoutExceedsCoverage.selector);
        bondat.resolveClaim(policyId, true, illegalPayout);
    }
}
