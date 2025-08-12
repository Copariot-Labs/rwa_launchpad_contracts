require("dotenv").config();

/**
 * Configuration helper for deployment scripts
 */
const config = {
  // Network
  network: process.env.NETWORK || "hardhat",
  
  // Token addresses (if already deployed)
  rwa: process.env.RWA_ADDRESS || "",
  prRWA: process.env.PRRWA_ADDRESS || "",
  stableRwa: process.env.STABLE_RWA_ADDRESS || "",
  
  // Core contract addresses (if already deployed)
  marketProxy: process.env.MARKET_PROXY_ADDRESS || "",
  stakePoolProxy: process.env.STAKEPOOL_PROXY_ADDRESS || "",
  bankProxy: process.env.BANK_PROXY_ADDRESS || "",
  helper: process.env.HELPER_ADDRESS || "",
  gla: process.env.GLA_ADDRESS || "",
  
  // External addresses
  usdc: process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Default to mainnet USDC
  
  // StakePool parameters
  stakePool: {
    mintPercentPerDay: parseInt(process.env.MINT_PERCENT_PER_DAY || "10"), // 0.1%
    blocksPerDay: parseInt(process.env.BLOCKS_PER_DAY || "7200"), // ~12 seconds per block
    withdrawFee: parseInt(process.env.WITHDRAW_FEE || "50"), // 0.5%
    mintFee: parseInt(process.env.MINT_FEE || "50"), // 0.5%
  },
  
  // Bank parameters
  bank: {
    borrowFee: parseInt(process.env.BORROW_FEE || "50"), // 0.5%
  },
  
  // GLA parameters
  gla: {
    beforeWhitelistInterval: parseInt(process.env.BEFORE_WHITELIST_INTERVAL || "86400"), // 1 day
    whitelistInterval: parseInt(process.env.WHITELIST_INTERVAL || "259200"), // 3 days
    publicOfferingInterval: parseInt(process.env.PUBLIC_OFFERING_INTERVAL || "604800"), // 7 days
    initInterval: parseInt(process.env.INIT_INTERVAL || "86400"), // 1 day
    whitelistPrice: process.env.WHITELIST_PRICE || "1000000", // $1 per RWA (in USDC decimals)
    publicOfferingPrice: process.env.PUBLIC_OFFERING_PRICE || "1200000", // $1.2 per RWA (in USDC decimals)
    softCap: process.env.SOFT_CAP || "500000000000", // $500,000 (in USDC decimals)
    hardCap: process.env.HARD_CAP || "2000000000000", // $2,000,000 (in USDC decimals)
    whitelistMaxCapPerUser: process.env.WHITELIST_MAX_CAP_PER_USER || "5000000000", // $5,000 per whitelist user (in USDC decimals)
  },
  
  // Check if we're using a testnet
  isTestnet() {
    return ["hardhat", "localhost", "fuji"].includes(this.network);
  },
  
  // Check if contracts are already deployed
  hasDeployedContracts() {
    return !!(this.rwa && this.prRWA && this.stableRwa && 
             this.marketProxy && this.stakePoolProxy && this.bankProxy);
  },
};

module.exports = config; 