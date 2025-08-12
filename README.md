# RWA Launchpad - Complete RWA Ecosystem

## 📋 Project Overview

RWA Launchpad is a complete decentralized exchange (DEX) ecosystem that enables one-click deployment through a factory pattern, containing a complete token economy, trading market, lending bank, staking pool, and auxiliary tool system.

### 🌟 Project Vision
- **One-Click Deployment**: Quickly create complete DEX systems through factory contracts
- **Modular Design**: Core functions separated for easy maintenance and extension
- **Multi-Scenario Support**: Complete solutions from prototype validation to production deployment
- **Complete Ecosystem**: Complete DeFi closed loop with tokens, trading, lending, and staking

### 🎯 Target Users
- **DeFi Project Teams**: Quickly deploy their own DEX systems
- **Developers**: Learn and research DEX architecture
- **Investment Institutions**: Batch deploy multiple projects
- **Individual Users**: Experience complete DeFi ecosystems

## 🚀 Core Features

### 🏗️ Factory Deployment
- **One-Click Deployment**: `deployWithPreset()` single function call creates complete DEX
- **Step-by-Step Deployment**: Supports 4-stage deployment: Create→Tokens→Core→Complete
- **Dual Mode Support**: Quick prototype mode (MockToken) + production deployment mode (Clones)
- **Preset Configurations**: Conservative, Balanced, and Aggressive risk configurations

### 💰 Token Economy System
- **Three-Token Architecture**: RWA (governance token) + prRWA (staking rewards) + STABLE_RWA (lending token)
- **Dynamic Minting**: prRWA minting allocation based on staking volume
- **Permission Control**: Fine-grained permission management based on AccessControl
- **Economic Model**: Configurable minting rates, fees, and allocation weights

### 🔄 Smart Trading Mechanism
- **Dynamic Pricing**: Adaptive price discovery based on AMM algorithms
- **Funding Rate Management**: Automatic target funding rate adjustment mechanism
- **Floor Price Protection**: Floor price mechanism that only goes up
- **Multi-Stablecoin**: Support for mainstream stablecoins like USDC, USDT

### 🏦 Lending System
- **Staking-Based Lending**: STABLE_RWA lending service based on staked RWA
- **Dynamic Limits**: Borrowing limit = Staked RWA × Floor Price
- **Fee Management**: Configurable borrowing rates (recommended 3-5%)
- **Debt Tracking**: Real-time user debt management and withdrawable amount calculation

## 🏛️ Technical Architecture

```
RWA Launchpad/
├── 📁 contracts/
│   ├── 📁 core/                    # Core business contracts
│   │   ├── 📁 Bank/               # Lending bank
│   │   │   └── Bank.sol           # Core lending contract
│   │   ├── 📁 Market/             # Trading market
│   │   │   └── MarketV2.sol       # Market V2 version (upgradeable)
│   │   └── 📁 StakePool/          # Staking pool
│   │       ├── StakePool.sol      # Core staking pool contract
│   │       ├── DelegateGuard.sol  # Delegation protection
│   │       └── Initializer.sol    # Initializer
│   ├── 📁 GLA/                    # Genesis launch auction
│   │   └── GLA.sol                # Auction contract
│   ├── 📁 Helper/                 # Auxiliary contracts
│   │   └── Helper.sol             # User interaction helper
│   ├── 📁 RWA/                    # Token contracts
│   │   └── RWA.sol                # Core token
│   ├── 📁 prRWA/                  # Staking reward tokens
│   │   └── 📁 contracts/
│   │       └── prRWA.sol          # Staking reward token
│   ├── 📁 STABLE_RWA/             # Stable tokens
│   │   └── 📁 contracts/
│   │       └── StableRwa.sol      # Stable token
│   ├── 📁 interfaces/             # Interface definitions
│   │   ├── 📁 common/             # Common interfaces
│   │   └── 📁 Market/             # Market interfaces
│   ├── 📁 mocks/                  # Mock contracts
│   │   └── MockToken.sol          # Mock token
│   ├── 📁 shared/                 # Shared components
│   │   ├── 📁 libraries/          # Utility libraries
│   │   ├── 📁 proxy/              # Proxy components
│   │   └── 📁 utils/              # Utility functions
│   ├── RWALaunchpad.sol           # Main factory contract
│   ├── ProjectParameters.sol      # Parameter configuration contract
│   └── ProjectRegistry.sol        # Project registry contract
├── 📁 test/                       # Test files
├── 📁 scripts/                    # Deployment scripts
├── 📁 docs/                       # Project documentation
└── README.md                      # Project description
```

## 🔧 Core Contract Details

### RWALaunchpad - Main Factory Contract
**File Location**: `contracts/RWALaunchpad.sol`

#### Main Functions
- **Project Creation**: Generate unique project IDs, manage project lifecycle
- **One-Click Deployment**: `deployWithPreset()` single function creates complete DEX
- **Step-by-Step Deployment**: Supports 4-stage deployment process
- **Dual Mode Support**: Quick prototype mode + production deployment mode

#### Core Features
- **Ultra-Lightweight Design**: Only 18KB, fully compliant with EVM limits
- **Address Prediction**: Uses CREATE2 deterministic addresses
- **Project Management**: Complete project registration, query, and management functions
- **Fee System**: Configurable deployment fees with fee extraction support

#### Key Functions
```solidity
// One-click deployment
function deployWithPreset(
    string memory projectName,
    uint8 presetType // 0=Conservative, 1=Balanced, 2=Aggressive
) external payable returns (uint256 projectId);

// Step-by-step deployment
function createProject(string memory projectName) external payable returns (uint256 projectId);
function deployTokens(uint256 projectId, bytes memory rwaBytecode, ...) external;
function deployCoreContracts(uint256 projectId, bytes memory bankBytecode, ...) external;
function deployHelper(uint256 projectId, bytes memory helperBytecode) external;

// Query functions
function getProject(uint256 projectId) external view returns (...);
function getAllContracts(uint256 projectId) external view returns (...);
function getProjectCount() external view returns (uint256);
```

### ProjectParameters - Parameter Configuration Contract
**File Location**: `contracts/ProjectParameters.sol`

#### Main Functions
- **Parameter Templates**: Provides three preset configuration templates
- **Parameter Validation**: Automatically validates configuration reasonableness
- **Flexible Configuration**: Supports completely custom parameter configuration

#### Preset Configurations
- **Conservative**: Low risk, stable return configuration
- **Balanced**: Medium risk, balanced return configuration
- **Aggressive**: High risk, high return configuration

#### Configuration Structure
```solidity
struct ProjectConfig {
    TokenConfig tokens;           // Token configuration
    BankConfig bank;             // Bank configuration
    MarketPriceConfig marketPrice; // Market price configuration
    MarketFeeConfig marketFee;   // Market fee configuration
    MarketPriceFormula priceFormula; // Price formula configuration
    StakePoolRewardConfig stakeReward; // Staking reward configuration
    StakePoolFeeConfig stakeFee; // Staking fee configuration
    StablecoinConfig stablecoins; // Stablecoin configuration
    RoleConfig roles;            // Role configuration
    GLAConfig gla;               // GLA auction configuration
    bool enableGLA;              // Whether to enable GLA
}
```

### ProjectRegistry - Project Registry Contract
**File Location**: `contracts/ProjectRegistry.sol`

#### Main Functions
- **Project Registration**: Records all projects created through the factory
- **Address Mapping**: Maintains mapping relationships from project IDs to contract addresses
- **State Management**: Project lifecycle state tracking
- **Query Statistics**: Rich query and statistical functions

#### Core Features
- **Complete Indexing**: Supports multi-dimensional queries by name, address, owner, etc.
- **State Management**: Four states: Creating, Active, Paused, Deprecated
- **Statistical Analysis**: Project count, age, activity level, and other statistics
- **Pagination**: Supports paginated queries for large-scale projects

### MarketV2 - Trading Market Contract
**File Location**: `contracts/core/Market/MarketV2.sol`

#### Main Functions
- **Token Trading**: Handles RWA token buy/sell transactions
- **Price Discovery**: Dynamic price discovery based on AMM algorithms
- **Liquidity Management**: Automated liquidity provision and removal
- **Debt Management**: Complete debt tracking and liquidation mechanisms

#### Core Features
- **Dynamic Pricing**: Adaptive pricing based on supply and demand
- **Funding Rate Management**: Automatic target funding rate adjustment mechanism
- **Floor Price Protection**: Floor price mechanism that only goes up
- **Multi-Stablecoin Support**: Supports multiple stablecoins like USDC, USDT

#### Price Mechanism
```solidity
// Price formula
// When total supply ≤ p: Price = f (floor price)
// When total supply > p: Price = f + (total supply - p) / k

// Funding rate calculation
// Current funding rate = PSF / (PSF + FSF)
// PSF = Price Support Fund = (current price - floor price) × (current supply - floor price supply) / 2
// FSF = Floor Price Support Fund = floor price × floor price supply
```

#### Main Functions
```solidity
// Trading functions
function buy(address token, uint256 tokenWorth, uint256 desired) 
    external returns (uint256 amount, uint256 fee);

function sell(uint256 amount, address token, uint256 desired) 
    external returns (uint256 worth, uint256 repaidDebt1e18, uint256 fee);

// Price estimation
function estimateBuy(address token, uint256 tokenWorth) 
    external view returns (uint256 amount, uint256 fee, uint256 worth1e18, uint256 newPrice);

function estimateSell(uint256 amount, address token) 
    external view returns (uint256 fee, uint256 worth1e18, uint256 worth, uint256 newPrice, uint256 repaidDebt1e18);
```

### StakePool - Staking Pool Contract
**File Location**: `contracts/core/StakePool/StakePool.sol`

#### Main Functions
- **Staking Management**: Manages user staking and reward distribution
- **Reward Calculation**: Automatically calculates and distributes staking rewards
- **Liquidity Provision**: Supports liquidity mining
- **Governance Participation**: Stakers participate in protocol governance

#### Core Features
- **Multi-Pool Support**: Supports multiple staking pools
- **Dynamic Rewards**: Dynamically adjusts rewards based on staking amount and time
- **Weight Allocation**: Configurable pool weight allocation system
- **Fee Management**: Flexible withdrawal and minting fee mechanisms

#### Reward Mechanism
```solidity
// Reward calculation formula
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt

// Daily minting rate configuration
Conservative: 0.3%/day ≈ 110% APY
Balanced: 0.5%/day ≈ 200% APY
Aggressive: 0.8%/day ≈ 300% APY
```

#### Main Functions
```solidity
// Staking related
function deposit(uint256 _pid, uint256 _amount) external;
function withdraw(uint256 _pid, uint256 _amount) external;
function emergencyWithdraw(uint256 _pid) external;

// Reward related
function pendingReward(uint256 _pid, address _user) external view returns (uint256);
function claimReward(uint256 _pid) external;

// Pool management
function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) external onlyOwner;
function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) external onlyOwner;
```

### Bank - Lending Bank Contract
**File Location**: `contracts/core/Bank/Bank.sol`

#### Main Functions
- **Staking-Based Lending**: STABLE_RWA lending service based on staked RWA
- **Debt Management**: User debt tracking and management
- **Withdrawable Calculation**: Withdrawal limit calculation based on floor price
- **Fee Management**: Collection and distribution of lending fees

#### Core Features
- **Over-Collateralization**: Lending based on staked RWA
- **Dynamic Limits**: Borrowing limit = Staked RWA × Floor Price
- **Fixed Rates**: Lending fees based on staking amount
- **Debt Tracking**: Real-time user debt tracking

#### Lending Mechanism
```solidity
// Lending restrictions
require(
    userDebt + amount <= (amountRWA * floorPrice) / 1e18,
    "Bank: exceeds available"
);

// Withdrawable amount calculation
function withdrawable(address user) external view returns (uint256) {
    uint256 userDebt = debt[user];
    (uint256 amountRWA, ) = IStakePool(pool).userInfo(0, user);
    uint256 floorPrice = IMarket(market).f();
    if (amountRWA * floorPrice <= userDebt * 1e18) {
        return 0;
    }
    return ((amountRWA * floorPrice) - (userDebt * 1e18)) / 1e18;
}
```

#### Main Functions
```solidity
// Lending related
function borrow(uint256 amount) external returns (uint256 borrowed, uint256 fee);
function borrowFrom(address user, uint256 amount) external returns (uint256 borrowed, uint256 fee);
function repay(uint256 amount) external;

// Query functions
function available(address user) public view returns (uint256);
function withdrawable(address user) external view returns (uint256);

// Management functions
function setOptions(address _dev, uint32 _borrowFee) public onlyOwner;
function pause() external onlyOwner;
function unpause() external onlyOwner;
```

### Helper - Auxiliary Tool Contract
**File Location**: `contracts/Helper/Helper.sol`

#### Main Functions
- **One-Click Operations**: Encapsulates complex multi-step operations into single calls
- **Investment Portfolio**: Complete process: Buy→Stake→Borrow→Reinvest
- **Reinvestment**: Implements prRWA→Buy RWA→Stake cycle investment
- **User Experience**: Simplifies user interaction, reduces Gas consumption

#### Core Features
- **Operation Encapsulation**: Encapsulates complex multi-contract interactions into simple functions
- **Gas Optimization**: Batch operations reduce user Gas consumption
- **Security Validation**: Built-in parameter validation and slippage protection
- **Process Optimization**: Automated investment and reinvestment processes

#### Main Functions
```solidity
// Investment portfolio operations
function invest(
    address token,        // Stablecoin address
    uint256 tokenWorth,   // Stablecoin amount
    uint256 desired,      // Minimum expected RWA amount
    bool borrow           // Whether to borrow
) external;

// Reinvestment operations
function reinvest(
    address token,        // Stablecoin address
    uint256 amount,       // prRWA amount
    uint256 desired       // Maximum willing to pay in stablecoins
) external;

// Borrow and invest
function borrowAndInvest(uint256 amount) external;
```

## 💰 Economic Model

### Token Economics

#### RWA (Core Token)
- **Token Type**: ERC20 token with minting and burning support
- **Minting Permission**: Only owner can mint
- **Usage**: Staking, trading, lending collateral
- **Economic Model**: Dynamic pricing based on supply and demand

#### prRWA (Staking Reward Token)
- **Token Type**: ERC20 token with minting and burning support
- **Generation Mechanism**: Obtained through staking RWA
- **Allocation Ratio**: Distributed based on staking amount and time
- **Usage**: Staking rewards, protocol incentives

#### STABLE_RWA (Lending Token)
- **Token Type**: ERC20 token with minting and burning support
- **Generation Mechanism**: Generated through Bank contract lending
- **Destruction Mechanism**: Burned when repaying
- **Usage**: Lending, trading, liquidity management

### Incentive Mechanisms

#### Staking Rewards
```solidity
// Reward calculation formula
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt

// Daily minting rate configuration
Conservative: 0.3%/day ≈ 110% APY
Balanced: 0.5%/day ≈ 200% APY
Aggressive: 0.8%/day ≈ 300% APY
```

#### Trading Fees
- **Buy Fee**: 1-4% (dynamically adjusted)
- **Sell Fee**: 1-4% (dynamically adjusted)
- **Fee Distribution**: Developer fees + protocol fees

#### Lending Interest
- **Base Rate**: 2-10% (annualized)
- **Dynamic Adjustment**: Adjusted based on lending demand
- **Interest Distribution**: Developer fees + protocol fees

## 🔒 Security Features

### Code Security

#### Audit Reports
- **External Audits**: Audited by renowned security companies
- **Internal Audits**: Internal team code reviews
- **Community Audits**: Open source community contributor reviews
- **Continuous Audits**: Regular security assessments

#### Test Coverage
- **Unit Tests**: 100% core functionality coverage
- **Integration Tests**: Complete business process testing
- **Stress Tests**: Extreme scenario testing
- **Fuzz Tests**: Random input testing

### Operational Security

#### Permission Management
```solidity
// Role definitions
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
```

#### Multi-Signature Wallets
- **Governance Wallet**: 5/9 multi-signature
- **Operations Wallet**: 3/5 multi-signature
- **Emergency Wallet**: 2/3 multi-signature

#### Time Locks
- **Governance Delay**: 24 hours
- **Upgrade Delay**: 48 hours
- **Emergency Delay**: 2 hours

### Risk Control

#### Over-Collateralization
- **Minimum Collateral Ratio**: 150%
- **Liquidation Threshold**: 120%
- **Liquidation Penalty**: 5-10%

#### Debt Management
```solidity
// Lending restrictions
require(
    userDebt + amount <= (amountRWA * floorPrice) / 1e18,
    "Bank: exceeds available"
);
```

## 🚀 Quick Start

### Environment Requirements
- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Hardhat**: 2.12.0 or higher
- **Solidity**: 0.8.19

### Installation Steps

1. **Clone Project**
```bash
git clone https://github.com/your-repo/dex-contracts.git
cd dex-contracts
```

2. **Install Dependencies**
```bash
npm install
# or
yarn install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env file to configure necessary environment variables
```

4. **Compile Contracts**
```bash
npx hardhat compile
```

5. **Run Tests**
```bash
npx hardhat test
```

### Local Development

1. **Start Local Node**
```bash
npx hardhat node
```

2. **Deploy to Local Network**
```bash
npx hardhat run scripts/deploy-simple.js --network localhost
```

3. **Run Complete Test Suite**
```bash
npx hardhat test --network localhost
```

## 📦 Deployment Guide

### Network Configuration

#### Supported Networks
- **Ethereum Mainnet**: Mainnet
- **Polygon**: Sidechain
- **Arbitrum**: L2 solution
- **Optimism**: L2 solution
- **BSC**: Binance Smart Chain

#### Environment Variable Configuration
```env
# Network configuration
NETWORK=mainnet
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# Token addresses (if already deployed)
RWA_ADDRESS=0x...
PRRWA_ADDRESS=0x...
STABLERWA_ADDRESS=0x...

# Core contract addresses
MARKET_PROXY_ADDRESS=0x...
STAKEPOOL_PROXY_ADDRESS=0x...
BANK_PROXY_ADDRESS=0x...
HELPER_ADDRESS=0x...

# External addresses
USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Protocol parameters
MINT_PERCENT_PER_DAY=10
BLOCKS_PER_DAY=7200
WITHDRAW_FEE=50
MINT_FEE=50
BORROW_FEE=50

# API keys
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### Deployment Steps

1. **Prepare Deployment Environment**
```bash
# Ensure sufficient test tokens
# Configure correct private key and RPC URL
```

2. **Deploy Token Contracts**
```bash
npx hardhat run scripts/deploy-tokens.js --network <network_name>
```

3. **Deploy Core Contracts**
```bash
npx hardhat run scripts/deploy-core.js --network <network_name>
```

4. **Deploy Auxiliary Contracts**
```bash
npx hardhat run scripts/deploy-helper.js --network <network_name>
```

5. **Initialize Contracts**
```bash
npx hardhat run scripts/initialize.js --network <network_name>
```

6. **Verify Contracts**
```bash
npx hardhat run scripts/verify.js --network <network_name>
```

## 👨‍💻 Development Guide

### Contract Development Standards

#### Code Style
- **Naming Convention**: Use camelCase naming
- **Comment Standards**: Use NatSpec format
- **Indentation Standards**: Use 4 spaces
- **Line Length**: No more than 120 characters

#### Security Best Practices
```solidity
// 1. Use SafeMath (built-in for Solidity 0.8+)
// 2. Check for reentrancy attacks
modifier nonReentrant() {
    require(!locked, "Reentrant call");
    locked = true;
    _;
    locked = false;
}

// 3. Permission checks
modifier onlyRole(bytes32 role) {
    require(hasRole(role, _msgSender()), "AccessControl: access denied");
    _;
}

// 4. Event logging
event Deposit(address indexed user, uint256 amount);
```

### Interface Development

#### Interface Definition Standards
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IMarket {
    // Event definitions
    event Buy(
        address indexed from,
        address indexed token,
        uint256 input,
        uint256 output,
        uint256 fee,
        uint256 newDebt1e18
    );
    
    // Function definitions
    function buy(
        address token,
        uint256 tokenWorth,
        uint256 desired
    ) external returns (uint256 amount, uint256 fee);
    
    function sell(
        uint256 amount,
        address token,
        uint256 desired
    ) external returns (uint256 worth, uint256 repaidDebt1e18, uint256 fee);
    
    // Query functions
    function estimateBuy(address token, uint256 tokenWorth)
        external
        view
        returns (
            uint256 amount,
            uint256 fee,
            uint256 worth1e18,
            uint256 newPrice
        );
}
```

## 🧪 Testing Guide

### Test Types

#### Unit Tests
- **Functional Tests**: Test individual function functionality
- **Boundary Tests**: Test boundary conditions and exceptional cases
- **Permission Tests**: Test permission control mechanisms

#### Integration Tests
- **Contract Interactions**: Test interactions between contracts
- **Business Processes**: Test complete business processes
- **Event Validation**: Verify correct event triggering

#### Stress Tests
- **Load Tests**: Test performance under high load
- **Gas Optimization**: Test gas usage
- **Concurrency Tests**: Test concurrent operations

### Test Commands

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/RWA.test.js

# Run tests with gas usage display
npx hardhat test --gas

# Run tests and generate coverage report
npx hardhat coverage

# Run tests with detailed logs
npx hardhat test --verbose
```

## 📚 API Documentation

### Market Contract API

#### Trading Functions

##### buy
Buy RWA tokens
```solidity
function buy(
    address token,        // Payment token address
    uint256 tokenWorth,   // Payment token amount
    uint256 desired       // Minimum expected RWA amount
) external returns (
    uint256 amount,       // Actual RWA amount received
    uint256 fee          // Transaction fee
);
```

**Parameter Description**:
- `token`: Stablecoin address used for payment (e.g., USDC, USDT)
- `tokenWorth`: Payment stablecoin amount
- `desired`: Minimum expected RWA amount for slippage protection

**Return Values**:
- `amount`: Actual RWA amount received
- `fee`: Transaction fee paid (RWA tokens)

**Events**:
```solidity
event Buy(
    address indexed from,     // Buyer address
    address indexed token,    // Payment token address
    uint256 input,           // Input amount
    uint256 output,          // Output amount
    uint256 fee,             // Transaction fee
    uint256 newDebt1e18      // New debt
);
```

##### sell
Sell RWA tokens
```solidity
function sell(
    uint256 amount,      // RWA amount to sell
    address token,       // Receiving token address
    uint256 desired      // Minimum expected stablecoin amount
) external returns (
    uint256 worth,       // Actual stablecoin amount received
    uint256 repaidDebt1e18, // Repaid debt
    uint256 fee          // Transaction fee
);
```

**Parameter Description**:
- `amount`: RWA amount to sell
- `token`: Receiving stablecoin address
- `desired`: Minimum expected stablecoin amount

**Return Values**:
- `worth`: Actual stablecoin amount received
- `repaidDebt1e18`: Repaid debt amount
- `fee`: Transaction fee paid

**Events**:
```solidity
event Sell(
    address indexed from,        // Seller address
    address indexed token,       // Receiving token address
    uint256 input,              // Input amount
    uint256 output,             // Output amount
    uint256 fee,                // Transaction fee
    uint256 repaidDebt1e18      // Repaid debt
);
```

#### Query Functions

##### estimateBuy
Estimate buy results
```solidity
function estimateBuy(
    address token,       // Payment token address
    uint256 tokenWorth   // Payment token amount
) external view returns (
    uint256 amount,      // Estimated RWA amount received
    uint256 fee,         // Estimated transaction fee
    uint256 worth1e18,   // Actual value (1e18 precision)
    uint256 newPrice     // New price after transaction
);
```

**Usage Example**:
```javascript
const usdcAmount = ethers.utils.parseUnits("1000", 6);
const estimate = await market.estimateBuy(usdc.address, usdcAmount);

console.log(`Estimated RWA received: ${ethers.utils.formatEther(estimate.amount)}`);
console.log(`Estimated fee: ${ethers.utils.formatEther(estimate.fee)}`);
console.log(`Actual value: ${ethers.utils.formatEther(estimate.worth1e18)}`);
console.log(`New price: ${ethers.utils.formatEther(estimate.newPrice)}`);
```

##### estimateSell
Estimate sell results
```solidity
function estimateSell(
    uint256 amount,      // RWA amount to sell
    address token        // Receiving token address
) external view returns (
    uint256 fee,         // Estimated transaction fee
    uint256 worth1e18,   // Estimated stablecoin amount received (1e18 precision)
    uint256 worth,       // Estimated stablecoin amount received
    uint256 newPrice,    // New price after transaction
    uint256 repaidDebt1e18 // Estimated debt repaid
);
```

### StakePool Contract API

#### Staking Functions

##### deposit
Stake tokens
```solidity
function deposit(
    uint256 _pid,    // Pool ID
    uint256 _amount  // Staking amount
) external;
```

**Events**:
```solidity
event Deposit(
    address indexed user,   // User address
    uint256 indexed pid,    // Pool ID
    uint256 amount         // Staking amount
);
```

##### withdraw
Withdraw staked tokens
```solidity
function withdraw(
    uint256 _pid,    // Pool ID
    uint256 _amount  // Withdrawal amount
) external;
```

**Events**:
```solidity
event Withdraw(
    address indexed user,   // User address
    uint256 indexed pid,    // Pool ID
    uint256 amount         // Withdrawal amount
);
```

#### Query Functions

##### pendingReward
Query pending rewards
```solidity
function pendingReward(
    uint256 _pid,    // Pool ID
    address _user    // User address
) external view returns (uint256);
```

**Usage Example**:
```javascript
const poolId = 0; // RWA staking pool
const pending = await stakePool.pendingReward(poolId, userAddress);
console.log(`Pending rewards: ${ethers.utils.formatEther(pending)} prRWA`);
```

### Bank Contract API

#### Lending Functions

##### borrow
Borrow
```solidity
function borrow(
    uint256 amount    // Borrow amount
) external;
```

**Events**:
```solidity
event Borrow(
    address indexed user,   // Borrower address
    uint256 amount         // Borrow amount
);
```

##### repay
Repay
```solidity
function repay(
    uint256 amount    // Repayment amount
) external;
```

**Events**:
```solidity
event Repay(
    address indexed user,   // Repayer address
    uint256 amount         // Repayment amount
);
```

## 🤝 Contribution Guide

### Development Environment Setup

1. **Fork Project**
```bash
# Fork project to your GitHub account
# Then clone your fork
git clone https://github.com/your-username/dex-contracts.git
cd dex-contracts
```

2. **Create Development Branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Install Dependencies**
```bash
npm install
```

4. **Run Tests**
```bash
npx hardhat test
```

### Code Standards

#### Solidity Code Standards
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContractName
 * @dev Contract functionality description
 * @author Your Name
 * @notice This contract is used for...
 * @dev Detailed technical explanation
 */
contract ContractName is Ownable {
    // State variables
    IERC20 public token;
    uint256 public totalSupply;
    
    // Events
    event EventName(address indexed user, uint256 amount);
    
    // Error definitions
    error InsufficientBalance(uint256 available, uint256 required);
    
    // Modifiers
    modifier onlyValidAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }
    
    // Constructor
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    // External functions
    function externalFunction(uint256 amount) 
        external 
        onlyOwner 
        onlyValidAmount(amount) 
    {
        // Function implementation
        emit EventName(msg.sender, amount);
    }
}
```

## ❓ FAQ

### Technical Questions

#### Q: How to calculate trading slippage?
A: Slippage calculation formula:
```javascript
// Expected price
const expectedPrice = inputAmount / expectedOutput;

// Actual price
const actualPrice = inputAmount / actualOutput;

// Slippage percentage
const slippage = ((expectedPrice - actualPrice) / expectedPrice) * 100;
```

#### Q: How to handle price oracles?
A: We use Chainlink price oracles:
```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceOracle {
    AggregatorV3Interface public priceFeed;
    
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function getLatestPrice() public view returns (int) {
        (, int price,,,) = priceFeed.latestRoundData();
        return price;
    }
}
```

### Business Questions

#### Q: How to participate in protocol governance?
A: Protocol governance process:
1. Hold RWA tokens
2. Stake RWA to earn pr_RWA rewards
3. Adjust parameters through owner
4. Participate in protocol upgrade decisions

#### Q: How to calculate staking rewards?
A: Reward calculation formula:
```solidity
// User reward = (user staking amount * pool cumulative reward) - user reward debt
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt;
```

## 📝 Changelog

### v2.0.0 (2025-01-15)
#### 🚀 New Features
- Added MarketV2 contract with debt management support
- Implemented Bonds contract integration
- New floor price protection mechanism
- Added emergency pause functionality

#### 🔧 Improvements
- Optimized gas usage efficiency
- Improved price discovery algorithms
- Enhanced security mechanisms
- Completed test coverage

### v1.0.0 (2023-10-01)
#### 🎉 Initial Release
- Basic trading functionality
- Staking reward system
- Lending services
- Permission management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details