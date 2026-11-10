// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title BondatCore
 * @notice Collateral-backed AI agent protection protocol for BOT Chain Mainnet.
 * @dev Single-contract, gas-optimized architecture for agent registration,
 *      collateral custody, coverage underwriting, cryptographic claims, and settlement.
 */
contract BondatCore {
    // --- ENUMS ---

    enum AgentStatus {
        INACTIVE,
        ACTIVE
    }

    enum PolicyStatus {
        ACTIVE,
        SETTLED
    }

    enum ClaimReason {
        MISSED_DELIVERY,
        INVALID_OUTPUT,
        SERVICE_DOWNTIME
    }

    enum ClaimStatus {
        NONE,
        SUBMITTED,
        APPROVED,
        REJECTED,
        PAID
    }

    // --- STRUCTS (Packed for Gas Efficiency) ---

    struct Agent {
        address operator;          // 20 bytes
        AgentStatus status;        // 1 byte
        uint128 totalCollateral;   // 16 bytes
        uint128 lockedCollateral;  // 16 bytes
        bytes32 metadataHash;      // 32 bytes
    }

    struct Policy {
        address customer;          // 20 bytes
        PolicyStatus status;       // 1 byte
        ClaimStatus claimStatus;   // 1 byte
        ClaimReason claimReason;   // 1 byte
        uint64 deadline;           // 8 bytes (timestamp)
        uint32 claimWindow;        // 4 bytes (seconds post-deadline)
        uint32 agentId;            // 4 bytes
        uint128 coverageAmount;    // 16 bytes (in native BOT wei)
        uint128 payoutAmount;      // 16 bytes
        uint64 evidenceTimestamp;  // 8 bytes
        bytes32 commitmentHash;    // 32 bytes
        bytes32 evidenceHash;      // 32 bytes
    }

    // --- CUSTOM ERRORS ---

    error ReentrantCall();
    error Unauthorized();
    error OnlyArbitrator();
    error OnlyOperator();
    error OnlyCustomer();
    error AgentNotFound();
    error AgentNotActive();
    error PolicyNotFound();
    error PolicyNotActive();
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientCollateral();
    error InsufficientPayment();
    error InvalidDeadline();
    error InvalidClaimWindow();
    error PremiumRateExceedsMax();
    error EvidenceAlreadySubmitted();
    error ClaimAlreadyFiled();
    error ClaimNotSubmitted();
    error DeadlineNotPassed();
    error ClaimWindowExpired();
    error ClaimWindowNotExpired();
    error PayoutExceedsCoverage();
    error TransferFailed();
    error InsufficientRevenue();

    // --- CONSTANTS ---

    uint16 public constant MAX_PREMIUM_RATE_BPS = 1000; // Strict maximum 10.00%
    uint16 public constant BPS_DENOMINATOR = 10000;

    // --- STATE VARIABLES ---

    address public owner;
    address public arbitrator;
    uint16 public premiumRateBps;
    uint8 private _locked;        // 0 = unlocked, 1 = locked

    uint32 public nextAgentId;
    uint32 public nextPolicyId;
    uint128 public totalProtocolRevenue;

    mapping(uint32 => Agent) public agents;
    mapping(uint32 => Policy) public policies;

    // --- EVENTS ---

    event AgentRegistered(uint32 indexed agentId, address indexed operator, bytes32 metadataHash, uint128 initialCollateral);
    event AgentStatusUpdated(uint32 indexed agentId, AgentStatus status);
    event CollateralDeposited(uint32 indexed agentId, address indexed operator, uint128 amount);
    event CollateralWithdrawn(uint32 indexed agentId, address indexed operator, uint128 amount);
    event CoveragePurchased(
        uint32 indexed policyId,
        uint32 indexed agentId,
        address indexed customer,
        uint128 coverageAmount,
        uint256 premiumPaid,
        uint64 deadline,
        uint32 claimWindow
    );
    event EvidenceSubmitted(uint32 indexed policyId, bytes32 evidenceHash, uint64 timestamp);
    event ClaimFiled(uint32 indexed policyId, ClaimReason reason, bytes32 evidenceHash);
    event ClaimResolved(uint32 indexed policyId, ClaimStatus status, uint128 payoutAmount);
    event PolicySettled(uint32 indexed policyId, address indexed customer);
    event RevenueWithdrawn(address indexed to, uint128 amount);
    event ArbitratorUpdated(address indexed previousArbitrator, address indexed newArbitrator);
    event PremiumRateUpdated(uint16 previousRate, uint16 newRate);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // --- MODIFIERS ---

    modifier nonReentrant() {
        if (_locked != 0) revert ReentrantCall();
        _locked = 1;
        _;
        _locked = 0;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyArbitrator() {
        if (msg.sender != arbitrator) revert OnlyArbitrator();
        _;
    }

    // --- CONSTRUCTOR ---

    constructor(address _arbitrator, uint16 _initialPremiumRateBps) {
        if (_arbitrator == address(0)) revert ZeroAddress();
        if (_initialPremiumRateBps > MAX_PREMIUM_RATE_BPS) revert PremiumRateExceedsMax();

        owner = msg.sender;
        arbitrator = _arbitrator;
        premiumRateBps = _initialPremiumRateBps;
    }

    // --- INTERNAL HELPERS ---

    function _getPolicyAndAgent(uint32 policyId) private view returns (Policy storage policy, Agent storage agent) {
        policy = policies[policyId];
        if (policy.customer == address(0)) revert PolicyNotFound();
        if (policy.status != PolicyStatus.ACTIVE) revert PolicyNotActive();
        agent = agents[policy.agentId];
    }

    function _settleCollateral(uint32 policyId, Policy storage policy, Agent storage agent) private {
        agent.lockedCollateral -= policy.coverageAmount;
        policy.status = PolicyStatus.SETTLED;
        emit PolicySettled(policyId, policy.customer);
    }

    function _safeTransfer(address to, uint256 amount) private {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // --- AGENT REGISTRATION ---

    function registerAgent(bytes32 metadataHash) external payable nonReentrant returns (uint32 agentId) {
        agentId = ++nextAgentId;
        uint128 depositAmount = uint128(msg.value);

        agents[agentId] = Agent({
            operator: msg.sender,
            status: AgentStatus.ACTIVE,
            totalCollateral: depositAmount,
            lockedCollateral: 0,
            metadataHash: metadataHash
        });

        emit AgentRegistered(agentId, msg.sender, metadataHash, depositAmount);
        if (depositAmount > 0) {
            emit CollateralDeposited(agentId, msg.sender, depositAmount);
        }
    }

    function setAgentStatus(uint32 agentId, AgentStatus status) external {
        Agent storage agent = agents[agentId];
        if (agent.operator == address(0)) revert AgentNotFound();
        if (msg.sender != agent.operator) revert OnlyOperator();

        agent.status = status;
        emit AgentStatusUpdated(agentId, status);
    }

    // --- COLLATERAL VAULT ---

    function depositCollateral(uint32 agentId) external payable nonReentrant {
        Agent storage agent = agents[agentId];
        if (agent.operator == address(0)) revert AgentNotFound();
        if (agent.status != AgentStatus.ACTIVE) revert AgentNotActive();
        if (msg.value == 0) revert ZeroAmount();

        uint128 amount = uint128(msg.value);
        agent.totalCollateral += amount;

        emit CollateralDeposited(agentId, msg.sender, amount);
    }

    function withdrawAvailableCollateral(uint32 agentId, uint128 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Agent storage agent = agents[agentId];
        if (agent.operator == address(0)) revert AgentNotFound();
        if (msg.sender != agent.operator) revert OnlyOperator();

        uint128 available = agent.totalCollateral - agent.lockedCollateral;
        if (amount > available) revert InsufficientCollateral();

        agent.totalCollateral -= amount;
        emit CollateralWithdrawn(agentId, msg.sender, amount);

        _safeTransfer(msg.sender, amount);
    }

    function getAvailableCollateral(uint32 agentId) public view returns (uint128) {
        Agent storage agent = agents[agentId];
        if (agent.totalCollateral <= agent.lockedCollateral) return 0;
        return agent.totalCollateral - agent.lockedCollateral;
    }

    // --- COVERAGE UNDERWRITING ---

    function calculatePremium(uint128 coverageAmount) public view returns (uint256) {
        return (uint256(coverageAmount) * premiumRateBps) / BPS_DENOMINATOR;
    }

    function purchaseCoverage(
        uint32 agentId,
        bytes32 commitmentHash,
        uint128 coverageAmount,
        uint64 deadline,
        uint32 claimWindow
    ) external payable nonReentrant returns (uint32 policyId) {
        if (coverageAmount == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (claimWindow == 0) revert InvalidClaimWindow();

        Agent storage agent = agents[agentId];
        if (agent.operator == address(0)) revert AgentNotFound();
        if (agent.status != AgentStatus.ACTIVE) revert AgentNotActive();

        uint128 available = agent.totalCollateral - agent.lockedCollateral;
        if (coverageAmount > available) revert InsufficientCollateral();

        uint256 requiredPremium = calculatePremium(coverageAmount);
        if (msg.value < requiredPremium) revert InsufficientPayment();

        agent.lockedCollateral += coverageAmount;
        totalProtocolRevenue += uint128(requiredPremium);

        policyId = ++nextPolicyId;
        policies[policyId] = Policy({
            customer: msg.sender,
            status: PolicyStatus.ACTIVE,
            claimStatus: ClaimStatus.NONE,
            claimReason: ClaimReason.MISSED_DELIVERY,
            deadline: deadline,
            claimWindow: claimWindow,
            agentId: agentId,
            coverageAmount: coverageAmount,
            payoutAmount: 0,
            evidenceTimestamp: 0,
            commitmentHash: commitmentHash,
            evidenceHash: bytes32(0)
        });

        emit CoveragePurchased(policyId, agentId, msg.sender, coverageAmount, requiredPremium, deadline, claimWindow);

        if (msg.value > requiredPremium) {
            _safeTransfer(msg.sender, msg.value - requiredPremium);
        }
    }

    // --- SERVICE EXECUTION & EVIDENCE ---

    function submitEvidence(uint32 policyId, bytes32 evidenceHash) external nonReentrant {
        if (evidenceHash == bytes32(0)) revert ZeroAmount();
        (Policy storage policy, Agent storage agent) = _getPolicyAndAgent(policyId);

        if (msg.sender != agent.operator) revert OnlyOperator();
        if (policy.evidenceHash != bytes32(0)) revert EvidenceAlreadySubmitted();

        policy.evidenceHash = evidenceHash;
        policy.evidenceTimestamp = uint64(block.timestamp);

        emit EvidenceSubmitted(policyId, evidenceHash, uint64(block.timestamp));
    }

    // --- CLAIMS RESOLUTION ---

    function fileClaim(
        uint32 policyId,
        ClaimReason reason,
        bytes32 evidenceHash
    ) external nonReentrant {
        (Policy storage policy, Agent storage agent) = _getPolicyAndAgent(policyId);

        if (msg.sender != policy.customer) revert OnlyCustomer();
        if (policy.claimStatus != ClaimStatus.NONE) revert ClaimAlreadyFiled();

        if (block.timestamp < policy.deadline) revert DeadlineNotPassed();
        if (block.timestamp > policy.deadline + policy.claimWindow) revert ClaimWindowExpired();

        policy.claimReason = reason;

        // AUTOMATIC SETTLEMENT for MISSED_DELIVERY:
        // Conditions: 1. Deadline passed, 2. No evidence submitted, 3. In claim window, 4. Policy active
        if (reason == ClaimReason.MISSED_DELIVERY && policy.evidenceHash == bytes32(0)) {
            uint128 payout = policy.coverageAmount;

            policy.claimStatus = ClaimStatus.PAID;
            policy.payoutAmount = payout;

            agent.lockedCollateral -= payout;
            agent.totalCollateral -= payout;
            policy.status = PolicyStatus.SETTLED;

            emit ClaimFiled(policyId, reason, evidenceHash);
            emit ClaimResolved(policyId, ClaimStatus.APPROVED, payout);
            emit PolicySettled(policyId, policy.customer);

            _safeTransfer(policy.customer, payout);
            return;
        }

        policy.claimStatus = ClaimStatus.SUBMITTED;
        emit ClaimFiled(policyId, reason, evidenceHash);
    }

    function resolveClaim(
        uint32 policyId,
        bool approved,
        uint128 payoutAmount
    ) external onlyArbitrator nonReentrant {
        (Policy storage policy, Agent storage agent) = _getPolicyAndAgent(policyId);
        if (policy.claimStatus != ClaimStatus.SUBMITTED) revert ClaimNotSubmitted();

        uint128 reserved = policy.coverageAmount;

        if (approved) {
            if (payoutAmount > reserved) revert PayoutExceedsCoverage();
            if (payoutAmount == 0) revert ZeroAmount();

            policy.claimStatus = ClaimStatus.PAID;
            policy.payoutAmount = payoutAmount;
            policy.status = PolicyStatus.SETTLED;

            agent.lockedCollateral -= reserved;
            agent.totalCollateral -= payoutAmount;

            emit ClaimResolved(policyId, ClaimStatus.APPROVED, payoutAmount);
            emit PolicySettled(policyId, policy.customer);

            _safeTransfer(policy.customer, payoutAmount);
        } else {
            policy.claimStatus = ClaimStatus.REJECTED;
            _settleCollateral(policyId, policy, agent);
            emit ClaimResolved(policyId, ClaimStatus.REJECTED, 0);
        }
    }

    function confirmService(uint32 policyId) external nonReentrant {
        (Policy storage policy, Agent storage agent) = _getPolicyAndAgent(policyId);
        if (msg.sender != policy.customer) revert OnlyCustomer();

        _settleCollateral(policyId, policy, agent);
    }

    function finalizePolicy(uint32 policyId) external nonReentrant {
        (Policy storage policy, Agent storage agent) = _getPolicyAndAgent(policyId);
        if (policy.claimStatus != ClaimStatus.NONE) revert ClaimAlreadyFiled();
        if (block.timestamp <= policy.deadline + policy.claimWindow) revert ClaimWindowNotExpired();

        _settleCollateral(policyId, policy, agent);
    }

    // --- PROTOCOL REVENUE ---

    function withdrawRevenue(address payable to, uint128 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > totalProtocolRevenue) revert InsufficientRevenue();

        totalProtocolRevenue -= amount;
        emit RevenueWithdrawn(to, amount);

        _safeTransfer(to, amount);
    }

    // --- ADMIN CONFIGURATION ---

    function setArbitrator(address newArbitrator) external onlyOwner {
        if (newArbitrator == address(0)) revert ZeroAddress();
        address oldArbitrator = arbitrator;
        arbitrator = newArbitrator;
        emit ArbitratorUpdated(oldArbitrator, newArbitrator);
    }

    function setPremiumRateBps(uint16 newRateBps) external onlyOwner {
        if (newRateBps > MAX_PREMIUM_RATE_BPS) revert PremiumRateExceedsMax();
        uint16 oldRate = premiumRateBps;
        premiumRateBps = newRateBps;
        emit PremiumRateUpdated(oldRate, newRateBps);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // --- VIEW GETTERS ---

    function getAgent(uint32 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function getPolicy(uint32 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }
}
