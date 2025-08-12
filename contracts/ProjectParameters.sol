// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

/**
 * @title ProjectParameters
 * @dev Project parameter configuration contract for unified management of all initialization parameters during factory mode deployment
 * Contains initialization parameters and configuration parameters for all contracts
 */
contract ProjectParameters {
    
    // ============ Token Configuration Parameters ============
    struct TokenConfig {
        string rwaName;           // RWA token name
        string rwaSymbol;         // RWA token symbol
        string prRwaName;         // prRwa token name
        string prRwaSymbol;       // prRwa token symbol
        string stableRwaName;     // STABLE_RWA token name
        string stableRwaSymbol;   // STABLE_RWA token symbol
    }
    
    // ============ Bank Contract Configuration Parameters ============
    struct BankConfig {
        address dev;              // Developer address, receives borrowing fees
        uint32 borrowFee;         // Borrowing fee ratio (based on 10000) 0-10000, recommended 300-500
    }
    
    // ============ Market Contract Price Adjustment Parameters ============
    struct MarketPriceConfig {
        uint32 target;            // Target funding ratio (based on 10000) 1000-8000, recommended 5000
        uint32 targetAdjusted;    // Adjusted target funding ratio (based on 10000) target-10000, recommended 6000
        uint32 minTarget;         // Minimum target funding ratio (based on 10000) 500-target, recommended 3000
        uint32 maxTargetAdjusted; // Maximum adjusted target funding ratio (based on 10000) targetAdjusted-10000, recommended 7000
        uint32 raiseStep;         // Step size for each increase (based on 10000) 100-2000, recommended 500
        uint32 lowerStep;         // Step size for each decrease (based on 10000) 50-1000, recommended 100
        uint32 lowerInterval;     // Decrease time interval (seconds) 1 hours-30 days, recommended 7 days
    }
    
    // ============ Market Contract Fee Parameters ============
    struct MarketFeeConfig {
        address dev;              // Developer address, receives trading fees
        uint32 buyFee;            // RWA purchase fee (based on 10000) 0-2000, recommended 200
        uint32 sellFee;           // RWA sale fee (based on 10000) 0-2000, recommended 300
    }
    
    // ============ Market Contract Price Formula Parameters ============
    struct MarketPriceFormula {
        uint256 k;                // Price function slope reciprocal × 1e18, 1e15-1e21, recommended 2e18
        uint256 initialPrice;     // Initial price (wei) 1e15-1e21, recommended 1e18
        uint256 floorPrice;       // Floor price (wei) 1e15-1e21, recommended 1e18  
        uint256 floorSupply;      // Floor supply (wei) 0-1e27, recommended 10000e18
        uint256 initialWorth;     // Initial total value (wei) 0-1e30, recommended 50000e18
    }
    
    // ============ StakePool Contract Reward Parameters ============
    struct StakePoolRewardConfig {
        uint32 mintPercentPerDay; // Daily minting ratio (based on 10000) 0-1000, recommended 50 (0.5%/day)
        uint256 blocksPerDay;     // Daily block count 1-100000, determined by network
        uint256 totalAllocPoint;  // Total allocation points 1-1000000, recommended 1000
        uint256 rwaPoolAlloc;     // RWA pool allocation points 0-totalAllocPoint, recommended 800
    }
    
    // ============ StakePool Contract Fee Parameters ============
    struct StakePoolFeeConfig {
        address dev;              // Developer address, receives fees
        uint32 withdrawFee;       // Withdrawal fee (based on 10000) 0-2000, recommended 100
        uint32 mintFee;           // Minting fee (based on 10000) 0-2000, recommended 1000
    }
    
    // ============ Supported Stablecoin Configuration ============
    struct StablecoinConfig {
        address[] buyTokens;      // List of stablecoin addresses that can be used for purchases
        address[] sellTokens;     // List of stablecoin addresses that can be used for sales
        uint8[] decimals;         // List of corresponding stablecoin precision
    }
    
    // ============ Permission Configuration ============
    struct RoleConfig {
        address admin;            // Default administrator
        address manager;          // Market manager
        address stablecoinManager; // Stablecoin manager
        address startupManager;   // Startup manager
    }
    
    // ============ GLA Auction Configuration ============
    struct GLAConfig {
        uint256 beforeWhitelistInterval;    // Pre-whitelist wait time (seconds) recommended 7 days
        uint256 whitelistInterval;          // Whitelist stage time (seconds) recommended 3 days
        uint256 publicOfferingInterval;     // Public offering stage time (seconds) recommended 7 days
        uint256 initInterval;               // Initialization stage time (seconds) recommended 1 day
        uint256 whitelistPrice;             // Whitelist price (1e6 precision) recommended 500000
        uint256 publicOfferingPrice;        // Public offering price (1e6 precision) recommended 1000000
        uint256 softCap;                    // Soft cap (USDC) recommended 50000e6
        uint256 hardCap;                    // Hard cap (USDC) recommended 200000e6
        uint256 whitelistMaxCapPerUser;     // Maximum purchase amount per whitelist user recommended 1000e6
        address usdcToken;                  // USDC token address
    }
    
    // ============ Complete Project Configuration ============
    struct ProjectConfig {
        TokenConfig tokens;
        BankConfig bank;
        MarketPriceConfig marketPrice;
        MarketFeeConfig marketFee;
        MarketPriceFormula priceFormula;
        StakePoolRewardConfig stakeReward;
        StakePoolFeeConfig stakeFee;
        StablecoinConfig stablecoins;
        RoleConfig roles;
        GLAConfig gla;
        bool enableGLA;           // Whether to enable GLA auction
    }
    
    // ============ Preset Configuration Templates ============
    
    /**
     * @dev Get conservative configuration template (low risk)
     * Suitable for projects pursuing stability
     */
    function getConservativeConfig() external pure returns (ProjectConfig memory config) {
        config.tokens = TokenConfig({
            rwaName: "Conservative Token",
            rwaSymbol: "CONS",
            prRwaName: "prConservative",
            prRwaSymbol: "prCONS",
            stableRwaName: "Conservative STABLE_RWA",
            stableRwaSymbol: "CONSR"
        });
        
        config.bank = BankConfig({
            dev: address(0), // Needs to be set during deployment
            borrowFee: 500   // 5%
        });
        
        config.marketPrice = MarketPriceConfig({
            target: 4000,           // 40%
            targetAdjusted: 5000,   // 50%
            minTarget: 3000,        // 30%
            maxTargetAdjusted: 6000, // 60%
            raiseStep: 300,         // 3%
            lowerStep: 50,          // 0.5%
            lowerInterval: 7 days
        });
        
        config.marketFee = MarketFeeConfig({
            dev: address(0), // Needs to be set during deployment
            buyFee: 300,     // 3%
            sellFee: 400     // 4%
        });
        
        config.priceFormula = MarketPriceFormula({
            k: 2e18,            // Slope = 0.5
            initialPrice: 1e18, // $1.0
            floorPrice: 1e18,   // $1.0
            floorSupply: 10000e18,
            initialWorth: 10000e18
        });
        
        config.stakeReward = StakePoolRewardConfig({
            mintPercentPerDay: 30,  // 0.3%/day ≈ 110% APY
            blocksPerDay: 43200,    // Avalanche
            totalAllocPoint: 1000,
            rwaPoolAlloc: 800     // 80% to RWA pool
        });
        
        config.stakeFee = StakePoolFeeConfig({
            dev: address(0), // Needs to be set during deployment
            withdrawFee: 200, // 2%
            mintFee: 1000    // 10%
        });
        
        config.enableGLA = false;
    }
    
    /**
     * @dev Get aggressive configuration template (high risk, high return)
     * Suitable for projects pursuing high returns
     */
    function getAggressiveConfig() external pure returns (ProjectConfig memory config) {
        config.tokens = TokenConfig({
            rwaName: "Aggressive Token",
            rwaSymbol: "AGGR",
            prRwaName: "prAggressive",
            prRwaSymbol: "prAGGR",
            stableRwaName: "Aggressive STABLE_RWA",
            stableRwaSymbol: "AGGSR"
        });
        
        config.bank = BankConfig({
            dev: address(0), // Needs to be set during deployment
            borrowFee: 200   // 2%
        });
        
        config.marketPrice = MarketPriceConfig({
            target: 6000,           // 60%
            targetAdjusted: 7000,   // 70%
            minTarget: 4000,        // 40%
            maxTargetAdjusted: 8000, // 80%
            raiseStep: 800,         // 8%
            lowerStep: 200,         // 2%
            lowerInterval: 3 days
        });
        
        config.marketFee = MarketFeeConfig({
            dev: address(0), // Needs to be set during deployment
            buyFee: 100,     // 1%
            sellFee: 200     // 2%
        });
        
        config.priceFormula = MarketPriceFormula({
            k: 1e18,            // Slope = 1.0
            initialPrice: 1e18, // $1.0
            floorPrice: 1e18,   // $1.0
            floorSupply: 5000e18,
            initialWorth: 5000e18
        });
        
        config.stakeReward = StakePoolRewardConfig({
            mintPercentPerDay: 80,  // 0.8%/day ≈ 300% APY
            blocksPerDay: 43200,    // Avalanche
            totalAllocPoint: 1000,
            rwaPoolAlloc: 900     // 90% to RWA pool
        });
        
        config.stakeFee = StakePoolFeeConfig({
            dev: address(0), // Needs to be set during deployment
            withdrawFee: 50,  // 0.5%
            mintFee: 500     // 5%
        });
        
        config.enableGLA = true;
        
        config.gla = GLAConfig({
            beforeWhitelistInterval: 3 days,
            whitelistInterval: 2 days,
            publicOfferingInterval: 5 days,
            initInterval: 1 days,
            whitelistPrice: 800000,     // $0.8
            publicOfferingPrice: 1000000, // $1.0
            softCap: 20000e6,           // $20,000
            hardCap: 100000e6,          // $100,000
            whitelistMaxCapPerUser: 500e6, // $500
            usdcToken: address(0)       // Needs to be set during deployment
        });
    }
    
    /**
     * @dev Get balanced configuration template (medium risk)
     * Standard configuration suitable for most projects
     */
    function getBalancedConfig() external pure returns (ProjectConfig memory config) {
        config.tokens = TokenConfig({
            rwaName: "Balanced Token",
            rwaSymbol: "BAL",
            prRwaName: "prBalanced",
            prRwaSymbol: "prBAL",
            stableRwaName: "Balanced STABLE_RWA",
            stableRwaSymbol: "BALSR"
        });
        
        config.bank = BankConfig({
            dev: address(0), // Needs to be set during deployment
            borrowFee: 300   // 3%
        });
        
        config.marketPrice = MarketPriceConfig({
            target: 5000,           // 50%
            targetAdjusted: 6000,   // 60%
            minTarget: 3000,        // 30%
            maxTargetAdjusted: 7000, // 70%
            raiseStep: 500,         // 5%
            lowerStep: 100,         // 1%
            lowerInterval: 7 days
        });
        
        config.marketFee = MarketFeeConfig({
            dev: address(0), // Needs to be set during deployment
            buyFee: 200,     // 2%
            sellFee: 300     // 3%
        });
        
        config.priceFormula = MarketPriceFormula({
            k: 2e18,            // Slope = 0.5
            initialPrice: 1e18, // $1.0
            floorPrice: 1e18,   // $1.0
            floorSupply: 10000e18,
            initialWorth: 10000e18
        });
        
        config.stakeReward = StakePoolRewardConfig({
            mintPercentPerDay: 50,  // 0.5%/day ≈ 200% APY
            blocksPerDay: 43200,    // Avalanche
            totalAllocPoint: 1000,
            rwaPoolAlloc: 800     // 80% to RWA pool
        });
        
        config.stakeFee = StakePoolFeeConfig({
            dev: address(0), // Needs to be set during deployment
            withdrawFee: 100, // 1%
            mintFee: 1000    // 10%
        });
        
        config.enableGLA = true;
        
        config.gla = GLAConfig({
            beforeWhitelistInterval: 7 days,
            whitelistInterval: 3 days,
            publicOfferingInterval: 7 days,
            initInterval: 1 days,
            whitelistPrice: 500000,     // $0.5
            publicOfferingPrice: 1000000, // $1.0
            softCap: 50000e6,           // $50,000
            hardCap: 200000e6,          // $200,000
            whitelistMaxCapPerUser: 1000e6, // $1,000
            usdcToken: address(0)       // Needs to be set during deployment
        });
    }
    
    // ============ Parameter Validation Functions ============
    
    /**
     * @dev Validate the validity of project configuration parameters
     */
    function validateConfig(ProjectConfig memory config) external pure returns (bool valid, string memory reason) {
        // Validate percentage parameter ranges
        if (config.bank.borrowFee > 10000) return (false, "borrowFee too high");
        if (config.marketFee.buyFee > 10000) return (false, "buyFee too high");
        if (config.marketFee.sellFee > 10000) return (false, "sellFee too high");
        if (config.stakeFee.withdrawFee > 10000) return (false, "withdrawFee too high");
        if (config.stakeFee.mintFee > 10000) return (false, "mintFee too high");
        
        // Validate market price parameter logic
        if (config.marketPrice.target >= config.marketPrice.targetAdjusted) 
            return (false, "target should be less than targetAdjusted");
        if (config.marketPrice.minTarget > config.marketPrice.target)
            return (false, "minTarget should be less than target");
        if (config.marketPrice.targetAdjusted > config.marketPrice.maxTargetAdjusted)
            return (false, "targetAdjusted should be less than maxTargetAdjusted");
        
        // Validate price formula parameters
        if (config.priceFormula.k == 0) return (false, "k cannot be zero");
        if (config.priceFormula.floorPrice == 0) return (false, "floorPrice cannot be zero");
        if (config.priceFormula.initialPrice < config.priceFormula.floorPrice)
            return (false, "initialPrice should be >= floorPrice");
        
        // Validate staking pool parameters
        if (config.stakeReward.blocksPerDay == 0) return (false, "blocksPerDay cannot be zero");
        if (config.stakeReward.totalAllocPoint == 0) return (false, "totalAllocPoint cannot be zero");
        if (config.stakeReward.rwaPoolAlloc > config.stakeReward.totalAllocPoint)
            return (false, "rwaPoolAlloc exceeds totalAllocPoint");
        
        // Validate GLA parameters (if enabled)
        if (config.enableGLA) {
            if (config.gla.softCap >= config.gla.hardCap)
                return (false, "softCap should be less than hardCap");
            if (config.gla.whitelistPrice > config.gla.publicOfferingPrice)
                return (false, "whitelist price should be <= public offering price");
        }
        
        return (true, "");
    }
} 