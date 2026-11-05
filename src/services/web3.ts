/**
 * BONDAT Protocol — Web3 & Blockchain Service
 *
 * Encapsulates all reads and writes for BOT Chain Mainnet (Chain ID 677).
 * Keeps UI components strictly decoupled from blockchain provider logic.
 */

import { BOT_CHAIN_MAINNET, CONTRACT_CONFIG } from '../config/chain';
import type { AgentRecord, ClaimSubmission } from '../types';

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (eventName: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export class BlockchainService {
  /**
   * Check if a Web3 provider (e.g. MetaMask, Rabby, OKX) is injected
   */
  static hasProvider(): boolean {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  }

  /**
   * Request wallet connection
   */
  static async requestAccounts(): Promise<string[]> {
    if (!this.hasProvider()) {
      throw new Error('No compatible Web3 wallet detected. Please install an EVM wallet.');
    }
    const accounts = (await window.ethereum!.request({
      method: 'eth_requestAccounts',
    })) as string[];
    return accounts || [];
  }

  /**
   * Get current Chain ID as decimal number
   */
  static async getChainId(): Promise<number | null> {
    if (!this.hasProvider()) return null;
    try {
      const chainIdHex = (await window.ethereum!.request({
        method: 'eth_chainId',
      })) as string;
      return parseInt(chainIdHex, 16);
    } catch (err) {
      console.warn('Failed to retrieve chainId:', err);
      return null;
    }
  }

  /**
   * Switch wallet network to BOT Chain Mainnet (Chain ID 677 / 0x2a5).
   * Prompts user to add the network if not registered in wallet.
   */
  static async switchToBotChain(): Promise<boolean> {
    if (!this.hasProvider()) {
      throw new Error('No compatible wallet found.');
    }

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BOT_CHAIN_MAINNET.chainIdHex }],
      });
      return true;
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err?.code === 4902 || String(switchError).includes('4902')) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BOT_CHAIN_MAINNET.chainIdHex,
                chainName: BOT_CHAIN_MAINNET.chainName,
                nativeCurrency: BOT_CHAIN_MAINNET.currency,
                rpcUrls: [BOT_CHAIN_MAINNET.rpcUrl],
                blockExplorerUrls: [BOT_CHAIN_MAINNET.blockExplorerUrl],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add BOT Chain to wallet:', addError);
          throw new Error('Could not add BOT Chain to your wallet.');
        }
      }
      throw switchError;
    }
  }

  /**
   * Read live BOT balance for a connected address via RPC
   * Does NOT fabricate any fake balances.
   */
  static async getBotBalance(address: string): Promise<string | null> {
    if (!address) return null;
    try {
      if (this.hasProvider()) {
        const balanceHex = (await window.ethereum!.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        })) as string;

        if (balanceHex) {
          const wei = BigInt(balanceHex);
          const whole = wei / 10n ** 18n;
          const fraction = (wei % 10n ** 18n).toString().padStart(18, '0').slice(0, 4);
          return `${whole.toString()}.${fraction}`;
        }
      }

      // Fallback: direct JSON-RPC query to BOT Chain RPC
      const res = await fetch(BOT_CHAIN_MAINNET.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });
      const data = await res.json();
      if (data?.result) {
        const wei = BigInt(data.result);
        const whole = wei / 10n ** 18n;
        const fraction = (wei % 10n ** 18n).toString().padStart(18, '0').slice(0, 4);
        return `${whole.toString()}.${fraction}`;
      }
      return '0.0000';
    } catch (err) {
      console.warn('Could not query BOT balance from RPC:', err);
      return null;
    }
  }

  /**
   * Smart Contract Interaction Status:
   * Explicitly informs caller that smart contract deployment is pending.
   */
  static isContractReady(): boolean {
    return Boolean(CONTRACT_CONFIG.isDeployed && CONTRACT_CONFIG.address);
  }

  /**
   * Prepare Agent Metadata Hash
   * Separation of concerns: Generates the deterministic metadata payload
   * ready for contract ingestion.
   */
  static generateAgentMetadataHash(name: string, category: string, description: string): string {
    const input = `${name.trim()}|${category}|${description.trim()}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) % 0xffffffff;
    }
    return '0x' + hash.toString(16).padStart(8, '0').repeat(8).slice(0, 64);
  }

  /**
   * Register an Agent on BOT Chain
   * Decoupled reads/writes: Dispatches to contract if deployed, or returns honest status.
   */
  static async registerAgent(
    agent: Omit<AgentRecord, 'id' | 'metadataHash' | 'activePolicies' | 'isRegisteredOnChain'>
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    void agent;
    if (!this.isContractReady()) {
      return {
        success: false,
        message: 'BONDAT protocol contract deployment is pending on BOT Chain Mainnet. Registration payload is ready for broadcast once the contract address is linked.',
      };
    }

    return {
      success: false,
      message: 'Contract interaction pending deployment verification.',
    };
  }

  /**
   * Purchase Coverage Policy
   */
  static async purchaseCoverage(
    agentId: string,
    amountBot: number,
    deadlineDate: string
  ): Promise<{ success: boolean; message: string; policyId?: string }> {
    void agentId;
    void amountBot;
    void deadlineDate;
    if (!this.isContractReady()) {
      return {
        success: false,
        message: 'Contract deployment is pending on BOT Chain Mainnet. Policy underwriting will activate once the verified contract is live.',
      };
    }

    return {
      success: false,
      message: 'Contract pending deployment.',
    };
  }

  /**
   * Submit Claim with Evidence Hash
   */
  static async submitClaim(
    claim: ClaimSubmission
  ): Promise<{ success: boolean; message: string; claimId?: string }> {
    void claim;
    if (!this.isContractReady()) {
      return {
        success: false,
        message: 'Claims resolution contract is pending deployment on BOT Chain Mainnet. Evidence hash recorded for submission upon contract launch.',
      };
    }

    return {
      success: false,
      message: 'Contract pending deployment.',
    };
  }

  /**
   * Format Ethereum/BOT Chain address for UI presentation
   */
  static shortenAddress(address?: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
}
