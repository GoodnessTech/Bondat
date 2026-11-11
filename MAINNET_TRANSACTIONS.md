# BONDAT Protocol — BOT Chain Mainnet Transaction Report

- **Contract Address:** [`0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6`](https://scan.botchain.ai/address/0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6)
- **Network:** BOT Chain Mainnet (Chain ID `677`)
- **Block Explorer:** [https://scan.botchain.ai](https://scan.botchain.ai)
- **Total On-Chain Transactions Executed:** **18**
  - **Deployer Wallet Transactions:** 12
  - **Unique Wallet Transactions:** 6 (1 interaction per generated wallet)
- **Total Protocol Gas Fee Spent:** **`0.01808772 BOT`** *(Strict Cap: `< 0.03000000 BOT` — Passed with 39.71% margin)*

---

## 1. Generated Unique Wallets

Six cryptographically unique wallets were generated to autonomously interact with the mainnet contract:

| Wallet Identifier | Public Address | Initial Funding (BOT) | Role in Protocol |
| :--- | :--- | :---: | :--- |
| **Wallet 1** | [`0xBE78743782Dc2e52B73D3DfE00887B0Fb8798267`](https://scan.botchain.ai/address/0xBE78743782Dc2e52B73D3DfE00887B0Fb8798267) | 0.002000 | Agent Operator (Agent #4) |
| **Wallet 2** | [`0xa05637b87Dcff42dF33B37620677Ba8153335684`](https://scan.botchain.ai/address/0xa05637b87Dcff42dF33B37620677Ba8153335684) | 0.002000 | Protocol Underwriter / Collateral Backer |
| **Wallet 3** | [`0x38ba7719Ff7b7ECB12CF3A7343CE2031A2C6FE7B`](https://scan.botchain.ai/address/0x38ba7719Ff7b7ECB12CF3A7343CE2031A2C6FE7B) | 0.002000 | Agent Operator (Agent #5) |
| **Wallet 4** | [`0xdc2d8e0d0831b81bD5b682cC196dD3A0Fb62C0dd`](https://scan.botchain.ai/address/0xdc2d8e0d0831b81bD5b682cC196dD3A0Fb62C0dd) | 0.002000 | Protocol Underwriter / Collateral Backer |
| **Wallet 5** | [`0xcA72D543D631C76C2d9Af52cC57F08a7E06DB740`](https://scan.botchain.ai/address/0xcA72D543D631C76C2d9Af52cC57F08a7E06DB740) | 0.002000 | Agent Operator (Agent #6) |
| **Wallet 6** | [`0xAbDEceb667D9c3922FDA2EB204198EC9f991C259`](https://scan.botchain.ai/address/0xAbDEceb667D9c3922FDA2EB204198EC9f991C259) | 0.002000 | Protocol Underwriter / Collateral Backer |

---

## 2. On-Chain Transaction Ledger

### Part A: 12 Transactions from Deployer Wallet (`0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`)

| # | Action / Tag | Target / Function | Value (BOT) | Block | Gas Used | Gas Fee (BOT) | Transaction Hash |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | `Deployer_Tx_1_Fund_Wallet_1` | Native Transfer to Wallet 1 | 0.002000 | 29787679 | 21,000 | 0.00042000 | [`0x5b224ad5...83877e7`](https://scan.botchain.ai/tx/0x5b224ad5e49a8c5beeb37fe51c336775a8d14dc8cad4dc9c5a2cff2d983877e7) |
| **2** | `Deployer_Tx_2_Fund_Wallet_2` | Native Transfer to Wallet 2 | 0.002000 | 29787706 | 21,000 | 0.00042000 | [`0xd6371a34...711bc41c`](https://scan.botchain.ai/tx/0xd6371a3484964e355027d4dde0b696bed3fc7fc95a6cb2e05ec6edd5711bc41c) |
| **3** | `Deployer_Tx_3_Fund_Wallet_3` | Native Transfer to Wallet 3 | 0.002000 | 29787726 | 21,000 | 0.00042000 | [`0x228c9ab1...5fafaff2`](https://scan.botchain.ai/tx/0x228c9ab1cb57c79303cc7f7a7db5f4db6f0e7a1aa406ccf2885da4b25fafaff2) |
| **4** | `Deployer_Tx_4_Fund_Wallet_4` | Native Transfer to Wallet 4 | 0.002000 | 29787744 | 21,000 | 0.00042000 | [`0x4c02fd56...310cd039`](https://scan.botchain.ai/tx/0x4c02fd5639057529ed17b51fd20f083208c5c7bf0962945c186bfb58310cd039) |
| **5** | `Deployer_Tx_5_Fund_Wallet_5` | Native Transfer to Wallet 5 | 0.002000 | 29787758 | 21,000 | 0.00042000 | [`0xa9e293d2...d9c1f18d`](https://scan.botchain.ai/tx/0xa9e293d268d5a90d030cb07ead0bd7681eef39cbff6c89273b390da6d9c1f18d) |
| **6** | `Deployer_Tx_6_Fund_Wallet_6` | Native Transfer to Wallet 6 | 0.002000 | 29787771 | 21,000 | 0.00042000 | [`0x7a7f64f0...ed20fbdd`](https://scan.botchain.ai/tx/0x7a7f64f0fb1b17e18e8c5e09b653cf6b501f870dbb8713caf4fcac79ed20fbdd) |
| **7** | `Deployer_Tx_7_RegisterAgent_1` | `registerAgent(bytes32)` (Agent #1) | 0.000500 | 29787783 | 98,615 | 0.00197230 | [`0x6dd06529...bcdf9fa5`](https://scan.botchain.ai/tx/0x6dd065295fb71cdc9d9730068cc98e254bd75f36a5d28dceb96b3dbcdf9fa5c0) |
| **8** | `Deployer_Tx_8_DepositCollateral_Agent_1` | `depositCollateral(uint32)` (Agent #1) | 0.000500 | 29788510 | 33,418 | 0.00066836 | [`0xf3374eef...cdbe6c2c`](https://scan.botchain.ai/tx/0xf3374eefbc954f1f3e72f63278e68a42c4a0a59edc905e4e1bdd263acdbe6c2c) |
| **9** | `Deployer_Tx_9_RegisterAgent_2` | `registerAgent(bytes32)` (Agent #2) | 0.000500 | 29788864 | 98,615 | 0.00197230 | [`0x51ba46fb...36e8a897`](https://scan.botchain.ai/tx/0x51ba46fbb3c6abda4a5c04c3f31479b752fb69c5022f61fd030785f536e8a897) |
| **10** | `Deployer_Tx_10_DepositCollateral_Agent_2` | `depositCollateral(uint32)` (Agent #2) | 0.000500 | 29788898 | 33,418 | 0.00066836 | [`0xf0394a82...f0665385`](https://scan.botchain.ai/tx/0xf0394a82dd8b9ea320fc465e52b79cc733cbb58477775c21b248f580f0665385) |
| **11** | `Deployer_Tx_11_RegisterAgent_3` | `registerAgent(bytes32)` (Agent #3) | 0.000500 | 29788915 | 98,615 | 0.00197230 | [`0xcc56aa0e...02c8a7ab`](https://scan.botchain.ai/tx/0xcc56aa0e8b57b224f0756f8377b7dd4802646d5d3cb658a07ffa4f8f02c8a7ab) |
| **12** | `Deployer_Tx_12_DepositCollateral_Agent_3` | `depositCollateral(uint32)` (Agent #3) | 0.000500 | 29788950 | 33,418 | 0.00066836 | [`0xce1f186f...cf78db8e`](https://scan.botchain.ai/tx/0xce1f186f9c55b34fff88607a260e1a3fb8e8661675c5e6c307dd0b9fcf78db8e) |

*Subtotal Deployer Gas Fee: `0.01044198 BOT`*

---

### Part B: 6 Unique Wallets Interacting with Mainnet Contract CA (`0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6`)

| # | Originating Wallet | Method Executed | Value (BOT) | Block | Gas Used | Gas Fee (BOT) | Transaction Hash |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **13** | **Wallet 1** (`0xBE78...8267`) | `registerAgent(bytes32)` (Agent #4) | 0.000000 | 29789048 | 76,915 | 0.00153830 | [`0x7d6c6dd6...c92adf51`](https://scan.botchain.ai/tx/0x7d6c6dd6a35d37bec0c19075760ca87094af244071ddf24a631152eac92adf51) |
| **14** | **Wallet 2** (`0xa056...5684`) | `depositCollateral(uint32)` (Agent #4) | 0.000100 | 29789063 | 50,518 | 0.00101036 | [`0xa8571c31...3f110175`](https://scan.botchain.ai/tx/0xa8571c31b4bddcb2867db9607e1f1691c011866730f704842a3044ef3f110175) |
| **15** | **Wallet 3** (`0x38ba...FE7B`) | `registerAgent(bytes32)` (Agent #5) | 0.000000 | 29789786 | 76,903 | 0.00153806 | [`0x45e91bf3...32679772`](https://scan.botchain.ai/tx/0x45e91bf3f4fa1a515fc47c541df81f65790ae6a5d85e9dec45ad94da32679772) |
| **16** | **Wallet 4** (`0xdc2d...C0dd`) | `depositCollateral(uint32)` (Agent #5) | 0.000100 | 29789916 | 50,518 | 0.00101036 | [`0xc887b058...0bac0c36`](https://scan.botchain.ai/tx/0xc887b05857742226eb86763f40fd976607561ea206bbcac270f8064c0bac0c36) |
| **17** | **Wallet 5** (`0xcA72...B740`) | `registerAgent(bytes32)` (Agent #6) | 0.000000 | 29790271 | 76,915 | 0.00153830 | [`0xb3882acc...1275ce48`](https://scan.botchain.ai/tx/0xb3882accc00f8eed0966ae492a7f5d356cbe7fe41d951c98f52d8ab21275ce48) |
| **18** | **Wallet 6** (`0xAbDE...C259`) | `depositCollateral(uint32)` (Agent #6) | 0.000100 | 29790766 | 50,518 | 0.00101036 | [`0x281eb075...e6110de8`](https://scan.botchain.ai/tx/0x281eb0752d613a9f10427c4dab5e48153a1778c13f83330240ecdf10e6110de8) |

*Subtotal Unique Wallets Gas Fee: `0.00764574 BOT`*

---

## 3. Strict Fee Cap & Verification Summary

| Constraint | Limit / Requirement | Actual Result | Verification Status |
| :--- | :---: | :---: | :---: |
| **Maximum Total Fee Budget** | `< 0.03000000 BOT` | **`0.01808772 BOT`** | **PASSED (39.71% margin)** |
| **Deployer Wallet Transactions** | Exactly 12 | **12 Transactions** | **PASSED (Exact match)** |
| **Unique Wallets Created** | Exactly 6 | **6 Wallets** | **PASSED (Exact match)** |
| **Unique Wallet Interactions** | 6 Interactions with CA | **6 Contract Transactions** | **PASSED (Exact match)** |
| **Contract Address** | `0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6` | All interactions on CA | **PASSED** |
| **Network** | BOT Chain Mainnet (`677`) | All mined on Chain ID 677 | **PASSED** |
