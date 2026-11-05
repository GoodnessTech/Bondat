/**
 * BONDAT Protocol — Centralized Network & Contract Configuration
 *
 * Target: BOT Chain Mainnet
 * Chain ID: 677
 * RPC: https://rpc.botchain.ai
 * Currency: BOT
 * Explorer: https://scan.botchain.ai
 */

export interface ChainConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export const BOT_CHAIN_MAINNET: ChainConfig = {
  chainId: 677,
  chainIdHex: '0x2a5', // 677 in hex
  chainName: 'BOT Chain Mainnet',
  rpcUrl: 'https://rpc.botchain.ai',
  currency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  blockExplorerUrl: 'https://scan.botchain.ai',
};

export interface ContractConfig {
  address: string | null;
  status: 'UNSET_PENDING_DEPLOYMENT' | 'DEPLOYED';
  isDeployed: boolean;
  deploymentNotes: string;
  protocolFeePercent: number;
  standardPremiumRatePercent: number;
}

/**
 * Smart Contract Configuration
 * 
 * NOTE: The contract address is explicitly unset (null) until the official
 * verified deployment on BOT Chain Mainnet (Chain ID 677) is finalized.
 * Do not invent or fabricate a placeholder address.
 */
export const CONTRACT_CONFIG: ContractConfig = {
  address: null,
  status: 'UNSET_PENDING_DEPLOYMENT',
  isDeployed: false,
  deploymentNotes: 'Official Bondat core contract address is pending verified deployment on BOT Chain Mainnet.',
  protocolFeePercent: 1.5,
  standardPremiumRatePercent: 5.0,
};

export function getExplorerAddressUrl(address: string): string {
  return `${BOT_CHAIN_MAINNET.blockExplorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${BOT_CHAIN_MAINNET.blockExplorerUrl}/tx/${txHash}`;
}

