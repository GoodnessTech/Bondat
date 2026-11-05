export type Page =
  | 'home'
  | 'dashboard'
  | 'agents'
  | 'agent-details'
  | 'marketplace'
  | 'coverage-details'
  | 'claims'
  | 'docs';

export interface RouteState {
  page: Page;
  params: Record<string, string>;
}

export type ServiceCategory =
  | 'All categories'
  | 'General service'
  | 'Data & research'
  | 'Execution'
  | 'Monitoring';

export interface AgentRecord {
  id: string;
  name: string;
  operatorAddress: string;
  category: ServiceCategory;
  description: string;
  metadataHash: string;
  collateralPledged: string; // in BOT
  activePolicies: number;
  failureCondition: string;
  slaWindowHours: number;
  isRegisteredOnChain: boolean;
}

export interface CoveragePolicyPreview {
  agentId: string;
  agentName: string;
  coverageAmount: number; // in BOT
  premiumAmount: number;
  protocolFeeAmount: number;
  totalCost: number;
  deadlineDate: string;
  slaWindowHours: number;
}

export interface ClaimSubmission {
  policyId: string;
  agentName: string;
  failureReason: 'Missed delivery' | 'Invalid output' | 'Service downtime' | 'Other';
  evidenceHash: string;
  summary: string;
  claimAmountBot: string;
}

export interface Web3Status {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  balanceBot: string | null;
}

