/**
 * BONDAT Protocol — Centralized Network & Contract Configuration
 *
 * Target: BOT Chain Mainnet
 * Chain ID: 677
 * RPC: https://rpc.botchain.ai
 * Currency: BOT
 * Explorer: https://scan.botchain.ai
 */

import BONDAT_ABI from './abi.json';

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
  address: string;
  status: 'DEPLOYED';
  isDeployed: true;
  deploymentTxHash: string;
  blockNumber: number;
  arbitrator: string;
  deploymentNotes: string;
  protocolFeePercent: number;
  standardPremiumRatePercent: number;
  abi: unknown[];
}

/**
 * Official BondatCore Smart Contract Configuration
 * Verified on BOT Chain Mainnet (Chain ID 677)
 */
export const CONTRACT_CONFIG: ContractConfig = {
  address: '0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6',
  status: 'DEPLOYED',
  isDeployed: true,
  deploymentTxHash: '0x79ad87df9c63d575063c53a3c1daed865cfbf337695c4f7ba24d08ea2507bcbb',
  blockNumber: 29778552,
  arbitrator: '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51',
  deploymentNotes: 'Official BondatCore contract live on BOT Chain Mainnet.',
  protocolFeePercent: 1.5,
  standardPremiumRatePercent: 5.0,
  abi: BONDAT_ABI,
};

export function getExplorerAddressUrl(address: string): string {
  return `${BOT_CHAIN_MAINNET.blockExplorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${BOT_CHAIN_MAINNET.blockExplorerUrl}/tx/${txHash}`;
}
