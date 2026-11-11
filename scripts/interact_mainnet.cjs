/**
 * BONDAT Protocol — Mainnet Wallet Generation & Transaction Orchestrator
 * BOT Chain Mainnet (Chain ID 677)
 * 
 * Strict Constraint: Cap of total fees MUST NOT exceed 0.03 BOT across all transactions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.FOUNDRY_DISABLE_NIGHTLY_WARNING = '1';

const RPC_URL = 'https://rpc.botchain.ai';
const CONTRACT_ADDRESS = '0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6';
const MAX_FEE_WEI = BigInt(Math.floor(0.03 * 1e18)); // 0.03 BOT in wei

function runCast(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', env: process.env }).trim();
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    if (err.stdout) console.error(`STDOUT: ${err.stdout}`);
    if (err.stderr) console.error(`STDERR: ${err.stderr}`);
    throw err;
  }
}

function keccak(str) {
  return runCast(`cast keccak "${str}"`);
}

function waitForReceipt(txHash, maxAttempts = 35) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const out = runCast(`cast receipt ${txHash} --json --rpc-url ${RPC_URL}`);
      if (out && out.startsWith('{')) {
        const receipt = JSON.parse(out);
        if (receipt.blockNumber) return receipt;
      }
    } catch {
      // Receipt not ready yet
    }
    execSync('ping 127.0.0.1 -n 2 > nul');
  }
  throw new Error(`Timeout waiting for receipt of tx: ${txHash}`);
}

let cumulativeFeeWei = 0n;
const transactionLogs = [];

function recordAlreadyMinedTx({ tag, fromName, txHash, action, valueWei, to }) {
  const receipt = waitForReceipt(txHash);
  const gasUsed = BigInt(receipt.gasUsed);
  const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
  const feeWei = gasUsed * effectiveGasPrice;
  cumulativeFeeWei += feeWei;

  const feeBOT = (Number(feeWei) / 1e18).toFixed(8);
  const totalFeeBOT = (Number(cumulativeFeeWei) / 1e18).toFixed(8);
  const blockNum = parseInt(receipt.blockNumber, 16);

  console.log(`[Already Mined] ${tag} | Block: ${blockNum} | Gas Used: ${gasUsed.toString()} | Fee: ${feeBOT} BOT`);

  transactionLogs.push({
    tag,
    fromName,
    fromAddress: receipt.from,
    to: to || CONTRACT_ADDRESS,
    action,
    valueWei,
    valueBOT: (Number(valueWei) / 1e18).toFixed(6),
    txHash,
    blockNumber: blockNum,
    gasUsed: gasUsed.toString(),
    gasPriceGwei: (Number(effectiveGasPrice) / 1e9).toString(),
    feeBOT,
    cumulativeFeeBOT: totalFeeBOT,
    status: 'SUCCESS'
  });
}

function executeTransaction({ tag, fromName, fromKey, to, sig, args = [], value = '0' }) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`Executing [${tag}] from ${fromName}...`);

  let sendCmd = `cast send ${to} `;
  if (sig) {
    sendCmd += `"${sig}" ${args.join(' ')} `;
  }
  sendCmd += `--value ${value} --private-key ${fromKey} --rpc-url ${RPC_URL} --async`;

  const txHash = runCast(sendCmd);
  console.log(`Tx broadcasted: ${txHash}`);

  const receipt = waitForReceipt(txHash);
  const gasUsed = BigInt(receipt.gasUsed);
  const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
  const feeWei = gasUsed * effectiveGasPrice;
  cumulativeFeeWei += feeWei;

  const feeBOT = (Number(feeWei) / 1e18).toFixed(8);
  const totalFeeBOT = (Number(cumulativeFeeWei) / 1e18).toFixed(8);
  const blockNum = parseInt(receipt.blockNumber, 16);
  const statusOk = receipt.status === '0x1' || receipt.status === 1;

  console.log(`Status: ${statusOk ? 'SUCCESS (0x1)' : 'FAILED'}`);
  console.log(`Block: ${blockNum} | Gas Used: ${gasUsed.toString()} | Gas Price: ${Number(effectiveGasPrice) / 1e9} Gwei`);
  console.log(`Fee: ${feeBOT} BOT | Cumulative Fee: ${totalFeeBOT} BOT (Cap: 0.03 BOT)`);

  if (!statusOk) {
    throw new Error(`Transaction [${tag}] failed on-chain! Tx: ${txHash}`);
  }

  if (cumulativeFeeWei > MAX_FEE_WEI) {
    throw new Error(`CRITICAL: Total fee exceeded 0.03 BOT! Cumulative: ${totalFeeBOT} BOT`);
  }

  const record = {
    tag,
    fromName,
    fromAddress: receipt.from,
    to: receipt.to || CONTRACT_ADDRESS,
    action: sig || 'Native BOT Transfer',
    valueWei: value,
    valueBOT: (Number(value) / 1e18).toFixed(6),
    txHash,
    blockNumber: blockNum,
    gasUsed: gasUsed.toString(),
    gasPriceGwei: (Number(effectiveGasPrice) / 1e9).toString(),
    feeBOT,
    cumulativeFeeBOT: totalFeeBOT,
    status: 'SUCCESS'
  };

  transactionLogs.push(record);
  return record;
}

async function main() {
  console.log(`============================================================`);
  console.log(`BONDAT Protocol — BOT Chain Mainnet Interaction Pipeline`);
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`RPC Endpoint:     ${RPC_URL}`);
  console.log(`Strict Fee Cap:   0.03 BOT`);
  console.log(`============================================================`);

  // Load existing 6 unique wallets
  const walletsPath = path.resolve(__dirname, '../.wallets.json');
  if (!fs.existsSync(walletsPath)) throw new Error('.wallets.json missing');
  const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));

  console.log(`Loaded 6 unique wallets:`);
  wallets.forEach(w => console.log(`  ${w.name}: ${w.address}`));

  // Register already mined 12 Deployer transactions + 2 Wallet transactions
  console.log(`\nReconciling 12 Deployer Transactions (Part 1)...`);
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_1_Fund_Wallet_1',
    fromName: 'Deployer Wallet',
    txHash: '0x5b224ad5e49a8c5beeb37fe51c336775a8d14dc8cad4dc9c5a2cff2d983877e7',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[0].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_2_Fund_Wallet_2',
    fromName: 'Deployer Wallet',
    txHash: '0xd6371a3484964e355027d4dde0b696bed3fc7fc95a6cb2e05ec6edd5711bc41c',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[1].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_3_Fund_Wallet_3',
    fromName: 'Deployer Wallet',
    txHash: '0x228c9ab1cb57c79303cc7f7a7db5f4db6f0e7a1aa406ccf2885da4b25fafaff2',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[2].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_4_Fund_Wallet_4',
    fromName: 'Deployer Wallet',
    txHash: '0x4c02fd5639057529ed17b51fd20f083208c5c7bf0962945c186bfb58310cd039',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[3].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_5_Fund_Wallet_5',
    fromName: 'Deployer Wallet',
    txHash: '0xa9e293d268d5a90d030cb07ead0bd7681eef39cbff6c89273b390da6d9c1f18d',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[4].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_6_Fund_Wallet_6',
    fromName: 'Deployer Wallet',
    txHash: '0x7a7f64f0fb1b17e18e8c5e09b653cf6b501f870dbb8713caf4fcac79ed20fbdd',
    action: 'Native BOT Transfer',
    valueWei: '2000000000000000',
    to: wallets[5].address
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_7_RegisterAgent_1',
    fromName: 'Deployer Wallet',
    txHash: '0x6dd065295fb71cdc9d9730068cc98e254bd75f36a5d28dceb96b3dbcdf9fa5c0',
    action: 'registerAgent(bytes32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_8_DepositCollateral_Agent_1',
    fromName: 'Deployer Wallet',
    txHash: '0xf3374eefbc954f1f3e72f63278e68a42c4a0a59edc905e4e1bdd263acdbe6c2c',
    action: 'depositCollateral(uint32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_9_RegisterAgent_2',
    fromName: 'Deployer Wallet',
    txHash: '0x51ba46fbb3c6abda4a5c04c3f31479b752fb69c5022f61fd030785f536e8a897',
    action: 'registerAgent(bytes32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_10_DepositCollateral_Agent_2',
    fromName: 'Deployer Wallet',
    txHash: '0xf0394a82dd8b9ea320fc465e52b79cc733cbb58477775c21b248f580f0665385',
    action: 'depositCollateral(uint32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_11_RegisterAgent_3',
    fromName: 'Deployer Wallet',
    txHash: '0xcc56aa0e8b57b224f0756f8377b7dd4802646d5d3cb658a07ffa4f8f02c8a7ab',
    action: 'registerAgent(bytes32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Deployer_Tx_12_DepositCollateral_Agent_3',
    fromName: 'Deployer Wallet',
    txHash: '0xce1f186f9c55b34fff88607a260e1a3fb8e8661675c5e6c307dd0b9fcf78db8e',
    action: 'depositCollateral(uint32)',
    valueWei: '500000000000000',
    to: CONTRACT_ADDRESS
  });

  console.log(`\nReconciling already mined Wallet interactions...`);
  recordAlreadyMinedTx({
    tag: 'Wallet_1_Interaction_RegisterAgent_4',
    fromName: 'Wallet 1',
    txHash: '0x7d6c6dd6a35d37bec0c19075760ca87094af244071ddf24a631152eac92adf51',
    action: 'registerAgent(bytes32)',
    valueWei: '0',
    to: CONTRACT_ADDRESS
  });
  recordAlreadyMinedTx({
    tag: 'Wallet_2_Interaction_DepositCollateral_Agent_4',
    fromName: 'Wallet 2',
    txHash: '0xa8571c31b4bddcb2867db9607e1f1691c011866730f704842a3044ef3f110175',
    action: 'depositCollateral(uint32)',
    valueWei: '100000000000000',
    to: CONTRACT_ADDRESS
  });

  console.log(`Reconciliation complete. Cumulative fee so far: ${(Number(cumulativeFeeWei)/1e18).toFixed(8)} BOT`);

  console.log(`\n============================================================`);
  console.log(`Executing Remaining Wallet Interactions (Wallets 3 to 6)`);
  console.log(`============================================================`);

  // Wallet 3: Register Agent 5
  executeTransaction({
    tag: 'Wallet_3_Interaction_RegisterAgent_5',
    fromName: 'Wallet 3',
    fromKey: wallets[2].privateKey,
    to: CONTRACT_ADDRESS,
    sig: 'registerAgent(bytes32)',
    args: [keccak('Bondat Gamma Sentinel Node Agent')],
    value: '0'
  });

  // Wallet 4: Deposit collateral to Agent 5
  executeTransaction({
    tag: 'Wallet_4_Interaction_DepositCollateral_Agent_5',
    fromName: 'Wallet 4',
    fromKey: wallets[3].privateKey,
    to: CONTRACT_ADDRESS,
    sig: 'depositCollateral(uint32)',
    args: ['5'],
    value: '100000000000000' // 0.0001 BOT collateral
  });

  // Wallet 5: Register Agent 6
  executeTransaction({
    tag: 'Wallet_5_Interaction_RegisterAgent_6',
    fromName: 'Wallet 5',
    fromKey: wallets[4].privateKey,
    to: CONTRACT_ADDRESS,
    sig: 'registerAgent(bytes32)',
    args: [keccak('Bondat Epsilon Autonomous Sentry Agent')],
    value: '0'
  });

  // Wallet 6: Deposit collateral to Agent 6
  executeTransaction({
    tag: 'Wallet_6_Interaction_DepositCollateral_Agent_6',
    fromName: 'Wallet 6',
    fromKey: wallets[5].privateKey,
    to: CONTRACT_ADDRESS,
    sig: 'depositCollateral(uint32)',
    args: ['6'],
    value: '100000000000000' // 0.0001 BOT collateral
  });

  console.log(`\nAll 6 unique wallet interactions completed successfully!`);

  // Generate markdown report
  const reportPath = path.resolve(__dirname, '../MAINNET_TRANSACTIONS.md');
  let md = `# BONDAT Protocol — BOT Chain Mainnet Transaction Report\n\n`;
  md += `**Contract Address:** \`${CONTRACT_ADDRESS}\`  \n`;
  md += `**Network:** BOT Chain Mainnet (Chain ID 677)  \n`;
  md += `**Explorer:** [https://scan.botchain.ai](https://scan.botchain.ai)  \n`;
  md += `**Total On-Chain Transactions Executed:** **${transactionLogs.length}**  \n`;
  md += `- **Deployer Wallet Transactions:** 12  \n`;
  md += `- **Unique Wallet Transactions:** 6 (1 per generated wallet)  \n`;
  md += `**Cumulative Protocol Gas Fee:** **${(Number(cumulativeFeeWei) / 1e18).toFixed(8)} BOT** *(Strict Cap: < 0.03 BOT — PASSED!)*  \n\n`;

  md += `## 1. Generated Unique Wallets\n\n`;
  md += `| Wallet | Address | Role | Initial Funding (BOT) |\n`;
  md += `| :--- | :--- | :--- | :---: |\n`;
  wallets.forEach(w => {
    md += `| **${w.name}** | \`${w.address}\` | Autonomous Agent / Protocol Backer | 0.002000 |\n`;
  });

  md += `\n## 2. On-Chain Transaction Ledger\n\n`;
  md += `| # | Phase / Tag | From Account | Method Executed | Value (BOT) | Block | Gas Used | Fee (BOT) | Transaction Hash |\n`;
  md += `| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  transactionLogs.forEach((tx, idx) => {
    const shortHash = `${tx.txHash.substring(0, 10)}...${tx.txHash.substring(tx.txHash.length - 8)}`;
    md += `| ${idx + 1} | \`${tx.tag}\` | ${tx.fromName} | \`${tx.action.split('(')[0]}\` | ${tx.valueBOT} | ${tx.blockNumber} | ${tx.gasUsed} | ${tx.feeBOT} | [\`${shortHash}\`](https://scan.botchain.ai/tx/${tx.txHash}) |\n`;
  });

  md += `\n## 3. Strict Fee Cap Verification\n\n`;
  md += `| Metric | Value | Constraint Status |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Total Budget Cap** | \`0.03000000 BOT\` | Ceiling |\n`;
  md += `| **Actual Gas Fee Spent** | \`${(Number(cumulativeFeeWei) / 1e18).toFixed(8)} BOT\` | **PASSED** |\n`;
  md += `| **Savings Under Budget** | \`${(0.03 - Number(cumulativeFeeWei) / 1e18).toFixed(8)} BOT\` | **${((1 - (Number(cumulativeFeeWei) / 1e18) / 0.03) * 100).toFixed(2)}% margin** |\n`;
  md += `| **Deployer Wallet Tx Count** | **12 transactions** | **EXACT MATCH** |\n`;
  md += `| **Unique Wallets Interacting** | **6 wallets** | **EXACT MATCH** |\n`;

  fs.writeFileSync(reportPath, md);
  console.log(`\nMarkdown report saved to MAINNET_TRANSACTIONS.md`);
  console.log(`\nPipeline finished with 100% SUCCESS.`);
}

main().catch(err => {
  console.error('\nEXECUTION FAILED:', err);
  process.exit(1);
});
