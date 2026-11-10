# BONDAT Protocol — Mainnet Deployment Record

## 1. Official Network Configuration

- **Network**: BOT Chain Mainnet
- **Chain ID**: `677` (`0x2a5`)
- **RPC URL**: `https://rpc.botchain.ai`
- **Native Currency**: `BOT` (18 Decimals)
- **Block Explorer**: [scan.botchain.ai](https://scan.botchain.ai)

---

## 2. Verified Deployment Details

| Field | Value |
| :--- | :--- |
| **Contract Name** | `BondatCore` |
| **Contract Address** | [`0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6`](https://scan.botchain.ai/address/0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6) |
| **Deployment Transaction** | [`0x79ad87df9c63d575063c53a3c1daed865cfbf337695c4f7ba24d08ea2507bcbb`](https://scan.botchain.ai/tx/0x79ad87df9c63d575063c53a3c1daed865cfbf337695c4f7ba24d08ea2507bcbb) |
| **Block Number** | `29778552` |
| **Deployer / Owner** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Designated Arbitrator**| `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Initial Premium Rate** | `500 bps` (5.00%) |

---

## 3. Strict Budget Compliance

- **Budget Limit**: `< 0.05 BOT`
- **Estimated Deployment Cost**: `0.0338918 BOT`
- **Actual Gas Used**: `1,694,818 gas`
- **Effective Gas Price**: `20 gwei` (`20,000,000,000 wei`)
- **Actual Deployment Expenditure**: **`0.03389636 BOT`**
- **Budget Margin**: **32.2% below maximum budget ceiling**

---

## 4. Live On-Chain Verification

Direct read queries executed on BOT Chain Mainnet post-deployment:

```bash
# 1. Verify Contract Owner
cast call 0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6 "owner()(address)" --rpc-url https://rpc.botchain.ai
# Output: 0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51

# 2. Verify Arbitrator
cast call 0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6 "arbitrator()(address)" --rpc-url https://rpc.botchain.ai
# Output: 0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51

# 3. Verify Initial Premium Rate
cast call 0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6 "premiumRateBps()(uint16)" --rpc-url https://rpc.botchain.ai
# Output: 500 (5.00%)

# 4. Verify Next Agent ID counter
cast call 0xd5edd56DCe98f777C20435D7DafF9DAb70269FC6 "nextAgentId()(uint32)" --rpc-url https://rpc.botchain.ai
# Output: 0
```

