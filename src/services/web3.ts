/**
 * BONDAT Protocol — Web3 & Blockchain Service
 *
 * Encapsulates all reads and writes for BOT Chain Mainnet (Chain ID 677).
 * Connects directly to the live verified BondatCore contract on BOT Chain.
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

  // --- ABI CALL HELPERS ---

  private static toBytes32(hexOrStr: string): string {
    const clean = hexOrStr.startsWith('0x') ? hexOrStr.slice(2) : hexOrStr;
    return clean.padEnd(64, '0').slice(0, 64);
  }

  private static toUint256Hex(val: bigint | number | string): string {
    const bn = BigInt(val);
    return bn.toString(16).padStart(64, '0');
  }

  private static toWei(amountBot: string | number): bigint {
    const numStr = String(amountBot).trim();
    if (!numStr || isNaN(Number(numStr))) return 0n;
    const parts = numStr.split('.');
    const whole = BigInt(parts[0] || '0') * 10n ** 18n;
    let fraction = 0n;
    if (parts[1]) {
      const decimals = parts[1].padEnd(18, '0').slice(0, 18);
      fraction = BigInt(decimals);
    }
    return whole + fraction;
  }

  /**
   * Send Transaction to Contract
   */
  private static async sendTx(data: string, valueWei: bigint = 0n): Promise<string> {
    if (!this.hasProvider()) {
      throw new Error('Please connect your Web3 wallet.');
    }
    const accounts = (await window.ethereum!.request({ method: 'eth_accounts' })) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error('No authorized wallet account.');
    }

    const txParams: Record<string, unknown> = {
      from: accounts[0],
      to: CONTRACT_CONFIG.address,
      data,
    };
    if (valueWei > 0n) {
      txParams.value = '0x' + valueWei.toString(16);
    }

    const txHash = (await window.ethereum!.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    })) as string;

    return txHash;
  }

  // --- REAL ON-CHAIN CONTRACT WRITES ---

  /**
   * Register an Agent on BOT Chain
   * Method: registerAgent(bytes32) -> 0xb19b03a1
   */
  static async registerAgent(
    agent: Omit<AgentRecord, 'id' | 'metadataHash' | 'activePolicies' | 'isRegisteredOnChain'>
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const metaHash = this.generateAgentMetadataHash(agent.name, agent.category, agent.description);
      const data = '0xb19b03a1' + this.toBytes32(metaHash);
      const valueWei = this.toWei(agent.collateralPledged || '0');

      const txHash = await this.sendTx(data, valueWei);
      return {
        success: true,
        message: `Agent registered on BOT Chain Mainnet! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Registration failed: ${msg}`,
      };
    }
  }

  /**
   * Deposit Additional Collateral
   * Method: depositCollateral(uint32) -> 0x8a1ebc1c
   */
  static async depositCollateral(
    agentId: number,
    amountBot: string
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const data = '0x8a1ebc1c' + this.toUint256Hex(agentId);
      const valueWei = this.toWei(amountBot);

      const txHash = await this.sendTx(data, valueWei);
      return {
        success: true,
        message: `Deposited ${amountBot} BOT collateral! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Deposit failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Withdraw Available Collateral
   * Method: withdrawAvailableCollateral(uint32,uint128) -> 0x0a4e2080
   */
  static async withdrawAvailableCollateral(
    agentId: number,
    amountBot: string
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const amountWei = this.toWei(amountBot);
      const data = '0x0a4e2080' + this.toUint256Hex(agentId) + this.toUint256Hex(amountWei);

      const txHash = await this.sendTx(data, 0n);
      return {
        success: true,
        message: `Withdrew ${amountBot} BOT collateral! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Withdrawal failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Purchase Coverage Policy
   * Method: purchaseCoverage(uint32,bytes32,uint128,uint64,uint32) -> 0x3f88ce77
   */
  static async purchaseCoverage(
    agentId: number,
    coverageAmountBot: number,
    deadlineDate: string
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const commitmentHash = this.generateAgentMetadataHash('policy', String(agentId), deadlineDate);
      const coverageWei = this.toWei(coverageAmountBot);
      const deadlineSec = deadlineDate ? Math.floor(new Date(deadlineDate).getTime() / 1000) : Math.floor(Date.now() / 1000) + 86400;
      const claimWindowSec = 259200; // 72 hours

      // 5% standard premium
      const premiumWei = (coverageWei * 500n) / 10000n;

      const data =
        '0x3f88ce77' +
        this.toUint256Hex(agentId) +
        this.toBytes32(commitmentHash) +
        this.toUint256Hex(coverageWei) +
        this.toUint256Hex(deadlineSec) +
        this.toUint256Hex(claimWindowSec);

      const txHash = await this.sendTx(data, premiumWei);
      return {
        success: true,
        message: `Coverage policy purchased on BOT Chain Mainnet! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Purchase failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Submit Claim with Evidence Hash
   * Method: fileClaim(uint32,uint8,bytes32) -> 0x455dc804
   */
  static async submitClaim(
    claim: ClaimSubmission
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const policyIdNum = parseInt(claim.policyId, 10) || 1;
      let reasonCode = 0; // MISSED_DELIVERY
      if (claim.failureReason === 'Invalid output') reasonCode = 1;
      else if (claim.failureReason === 'Service downtime') reasonCode = 2;

      const cleanEvidence = claim.evidenceHash.startsWith('0x') ? claim.evidenceHash.slice(2) : claim.evidenceHash;
      const data =
        '0x455dc804' +
        this.toUint256Hex(policyIdNum) +
        this.toUint256Hex(reasonCode) +
        this.toBytes32(cleanEvidence);

      const txHash = await this.sendTx(data, 0n);
      return {
        success: true,
        message: `Claim filed on BOT Chain Mainnet! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Claim submission failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Submit Agent Service Evidence
   * Method: submitEvidence(uint32,bytes32) -> 0x93e6c891
   */
  static async submitEvidence(
    policyId: number,
    evidenceHash: string
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const data = '0x93e6c891' + this.toUint256Hex(policyId) + this.toBytes32(evidenceHash);
      const txHash = await this.sendTx(data, 0n);
      return {
        success: true,
        message: `Evidence submitted! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Evidence submission failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Customer Confirms Successful Service
   * Method: confirmService(uint32) -> 0xa18c774c
   */
  static async confirmService(
    policyId: number
  ): Promise<{ success: boolean; message: string; txHash?: string }> {
    try {
      const data = '0xa18c774c' + this.toUint256Hex(policyId);
      const txHash = await this.sendTx(data, 0n);
      return {
        success: true,
        message: `Service confirmed and collateral released! TX: ${this.shortenAddress(txHash)}`,
        txHash,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: `Confirmation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // --- READ-ONLY CONTRACT QUERIES ---

  /**
   * Query contract for total registered agents
   */
  static async getNextAgentId(): Promise<number> {
    try {
      const res = await fetch(BOT_CHAIN_MAINNET.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: CONTRACT_CONFIG.address, data: '0x30efc498' }, 'latest'],
          id: 1,
        }),
      });
      const data = await res.json();
      if (data?.result) {
        return parseInt(data.result, 16);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Prepare Agent Metadata Hash
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
   * Format Ethereum/BOT Chain address for UI presentation
   */
  static shortenAddress(address?: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
}
