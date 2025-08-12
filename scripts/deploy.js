// SPDX-License-Identifier: MIT
require('dotenv').config();
const { ethers, upgrades, network } = require("hardhat");
const config = require("./config");
const fs = require('fs');
const path = require('path');

async function generateDeploymentReport(deploymentData) {
  // 创建部署报告目录
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const deploymentDir = path.join(__dirname, '..', 'deployment-reports', `${deploymentData.network}-${timestamp}`);
  
  try {
    fs.mkdirSync(deploymentDir, { recursive: true });
    console.log(`\nCreating deployment report directory: ${deploymentDir}`);
    
    // 生成部署报告
    const reportContent = `# RWA Launchpad Protocol Deployment Report

## Deployment Environment

- **Network**: ${deploymentData.network}
- **Chain ID**: ${deploymentData.chainId}
- **RPC URL**: ${deploymentData.rpcUrl}
- **Deployer**: ${deploymentData.deployer}
- **Block Number**: ${deploymentData.blockNumber}
- **Deployment Date**: ${new Date().toISOString()}
- **Solidity Version**: ${deploymentData.solidityVersion}

## Contract Addresses

| Contract | Type | Address | Implementation |
|----------|------|---------|----------------|
| RWA | Token | ${deploymentData.rwa} | N/A |
| prRWA | Token | ${deploymentData.prRWA} | N/A |
| STABLE_RWA | Token | ${deploymentData.stableRwa} | N/A |
| Market | Proxy | ${deploymentData.marketProxy} | ${deploymentData.marketImplementation} |
| StakePool | Proxy | ${deploymentData.stakePoolProxy} | ${deploymentData.stakePoolImplementation} |
| Bank | Proxy | ${deploymentData.bankProxy} | ${deploymentData.bankImplementation} |
| Helper | Utility | ${deploymentData.helper} | N/A |
| GLA | Sale | ${deploymentData.gla} | N/A |

## Contract Details

### 1. RWA Token
- **Standard**: ERC20
- **Description**: Core governance token of the DEX protocol
- **Features**: Mintable, Burnable, AccessControl

### 2. prRWA Token
- **Standard**: ERC20 with AccessControl
- **Description**: Pre-RWA token, staking reward token
- **Features**: Mintable by StakePool (MINT_ROLE)

### 3. STABLE_RWA Token
- **Standard**: ERC20
- **Description**: StableRwa token, used for bank operations
- **Features**: Owned by Bank contract

### 4. Market Contract (Proxy)
- **Description**: Core market mechanism for price discovery
- **Features**: Bonding curve, debt tracking, bond purchases
- **Init Status**: ${deploymentData.marketInitialized ? 'Initialized' : 'Manual initialization required'}

### 5. StakePool Contract (Proxy)
- **Description**: Staking mechanism for RWA token
- **Initialization Parameters**:
  - RWA Token: ${deploymentData.rwa}
  - prRWA Token: ${deploymentData.prRWA}
  - Bank: ${deploymentData.bankProxy}
  - Owner: ${deploymentData.deployer}
- **Options**:
  - Mint Percent Per Day: ${deploymentData.stakePoolOptions?.mintPercentPerDay || 'Not set'}/10000 (${deploymentData.stakePoolOptions ? (deploymentData.stakePoolOptions.mintPercentPerDay / 100).toFixed(2) : '?'}%)
  - Blocks Per Day: ${deploymentData.stakePoolOptions?.blocksPerDay || 'Not set'}
  - Dev Address: ${deploymentData.stakePoolOptions?.dev || 'Not set'}
  - Withdraw Fee: ${deploymentData.stakePoolOptions?.withdrawFee || 'Not set'}/10000 (${deploymentData.stakePoolOptions ? (deploymentData.stakePoolOptions.withdrawFee / 100).toFixed(2) : '?'}%)
  - Mint Fee: ${deploymentData.stakePoolOptions?.mintFee || 'Not set'}/10000 (${deploymentData.stakePoolOptions ? (deploymentData.stakePoolOptions.mintFee / 100).toFixed(2) : '?'}%)

### 6. Bank Contract (Proxy)
- **Description**: Banking operations for the protocol
- **Initialization Parameters**:
  - STABLE_RWA Token: ${deploymentData.stableRwa}
  - Market: ${deploymentData.marketProxy}
  - StakePool: ${deploymentData.stakePoolProxy}
  - Helper: ${deploymentData.helper}
  - Owner: ${deploymentData.deployer}
- **Options**:
  - Dev Address: ${deploymentData.bankOptions?.dev || 'Not set'}
  - Borrow Fee: ${deploymentData.bankOptions?.borrowFee || 'Not set'}/10000 (${deploymentData.bankOptions ? (deploymentData.bankOptions.borrowFee / 100).toFixed(2) : '?'}%)

### 7. Helper Contract
- **Description**: Utility contract to simplify user interactions
- **Linked Contracts**:
  - RWA: ${deploymentData.rwa}
  - prRWA: ${deploymentData.prRWA}
  - STABLE_RWA: ${deploymentData.stableRwa}
  - Market: ${deploymentData.marketProxy}
  - Bank: ${deploymentData.bankProxy}
  - StakePool: ${deploymentData.stakePoolProxy}

### 8. GLA Contract (Genesis Launch Auction)
- **Description**: Token sale and initial protocol launch mechanism
- **Parameters**:
  - RWA Token: ${deploymentData.rwa}
  - USDC Token: ${deploymentData.usdc}
  - Market: ${deploymentData.marketProxy}
  - Before Whitelist Interval: ${deploymentData.glaParams?.beforeWhitelistInterval || 'Not set'} seconds
  - Whitelist Interval: ${deploymentData.glaParams?.whitelistInterval || 'Not set'} seconds
  - Public Offering Interval: ${deploymentData.glaParams?.publicOfferingInterval || 'Not set'} seconds
  - Init Interval: ${deploymentData.glaParams?.initInterval || 'Not set'} seconds
  - Whitelist Price: ${deploymentData.glaParams?.whitelistPrice || 'Not set'} (in USDC decimals)
  - Public Offering Price: ${deploymentData.glaParams?.publicOfferingPrice || 'Not set'} (in USDC decimals)
  - Soft Cap: ${deploymentData.glaParams?.softCap || 'Not set'} (in USDC decimals)
  - Hard Cap: ${deploymentData.glaParams?.hardCap || 'Not set'} (in USDC decimals)
  - Whitelist Max Cap Per User: ${deploymentData.glaParams?.whitelistMaxCapPerUser || 'Not set'} (in USDC decimals)

## Permissions and Roles

### Token Permissions
- RWA ownership: ${deploymentData.rwaOwner || deploymentData.deployer}
- prRWA MINT_ROLE granted to: ${deploymentData.stakePoolProxy}
- STABLE_RWA ownership: ${deploymentData.bankProxy}

### Contract Admin Roles
- Market Roles:
  - DEFAULT_ADMIN_ROLE: ${deploymentData.deployer}
  - ADD_STABLECOIN_ROLE: Not explicitly set during deployment
  - MANAGER_ROLE: Not explicitly set during deployment
  - STARTUP_ROLE: Not explicitly set during deployment

- StakePool Admin: ${deploymentData.deployer}
- Bank Admin: ${deploymentData.deployer}

## Upgrade Information

All core contracts (Market, StakePool, Bank) are deployed as transparent upgradeable proxies using the OpenZeppelin upgrades plugin. 

- **Proxy Admin**: Deployed by the OpenZeppelin upgrades plugin
- **Upgrade Method**: Using ProxyAdmin contract's upgrade function
- **Upgrade Governance**: Controlled by the deployer

## Additional Notes

1. The Market contract initialization is the most complex part and requires manual verification.
2. All contracts are deployed using Solidity version ${deploymentData.solidityVersion}.
3. The deployment script handles existing deployments and can be run multiple times.
4. Core contracts use the OpenZeppelin transparent proxy pattern for upgradeability.
5. MarketV2 includes debt tracking and bond purchasing capabilities.

## Next Steps

1. Verify all contracts on the block explorer.
2. Conduct a thorough security review before mainnet launch.
3. Set up appropriate access controls for all admin roles.
4. Test all contract functionality extensively.
5. Initialize Market contract with appropriate parameters if needed.
`;

    // 将报告写入文件
    fs.writeFileSync(path.join(deploymentDir, 'deployment-report.md'), reportContent);
    console.log(`Deployment report saved to: ${path.join(deploymentDir, 'deployment-report.md')}`);
    
    // 创建环境变量文件供将来使用
    const envContent = `# Deployment Environment Variables - ${deploymentData.network} - ${timestamp}
NETWORK=${deploymentData.network}
RWA_ADDRESS=${deploymentData.rwa}
PRRWA_ADDRESS=${deploymentData.prRWA}
STABLE_RWA_ADDRESS=${deploymentData.stableRwa}
MARKET_PROXY_ADDRESS=${deploymentData.marketProxy}
STAKEPOOL_PROXY_ADDRESS=${deploymentData.stakePoolProxy}
BANK_PROXY_ADDRESS=${deploymentData.bankProxy}
HELPER_ADDRESS=${deploymentData.helper}
GLA_ADDRESS=${deploymentData.gla}
`;
    
    fs.writeFileSync(path.join(deploymentDir, '.env.deployment'), envContent);
    console.log(`Environment variables saved to: ${path.join(deploymentDir, '.env.deployment')}`);
    
    return deploymentDir;
  } catch (error) {
    console.error(`Error generating deployment report: ${error.message}`);
    return null;
  }
}

async function main() {
  const networkName = network.name;
  const provider = ethers.provider;
  const networkInfo = await provider.getNetwork();
  const currentBlock = await provider.getBlockNumber();
  
  // 收集部署环境信息
  const deploymentData = {
    network: networkName,
    chainId: networkInfo.chainId,
    rpcUrl: network.config.url || 'localhost',
    blockNumber: currentBlock,
    solidityVersion: '0.8.19', // 从hardhat.config.js中获取
    deployer: '',
    marketInitialized: false
  };

  console.log(`Deploying RWA Launchpad protocol contracts to ${deploymentData.network}...`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  deploymentData.deployer = deployer.address;
  console.log(`Deployer address: ${deployer.address}`);
  
  // Deploy basic tokens
  console.log("\n1. Deploying basic tokens...");
  
  // 1.1 Deploy RWA token
  let rwa;
  if (config.rwa) {
    console.log(`Using existing RWA token at: ${config.rwa}`);
    rwa = await ethers.getContractAt("RWA", config.rwa);
  } else {
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();
    console.log(`RWA token deployed to: ${rwa.address}`);
  }
  deploymentData.rwa = rwa.address;
  
  // 1.2 Deploy prRWA token
  let prRWA;
  if (config.prRWA) {
    console.log(`Using existing prRWA token at: ${config.prRWA}`);
    prRWA = await ethers.getContractAt("prRWA", config.prRWA);
  } else {
    const PrRWA = await ethers.getContractFactory("prRWA");
    prRWA = await PrRWA.deploy();
    await prRWA.deployed();
    console.log(`prRWA token deployed to: ${prRWA.address}`);
  }
  deploymentData.prRWA = prRWA.address;
  
  // 1.3 Deploy STABLE_RWA token
  let stableRwa;
  if (config.stableRwa) {
    console.log(`Using existing STABLE_RWA token at: ${config.stableRwa}`);
    stableRwa = await ethers.getContractAt("StableRwa", config.stableRwa);
  } else {
    const StableRwa = await ethers.getContractFactory("StableRwa");
    stableRwa = await StableRwa.deploy();
    await stableRwa.deployed();
    console.log(`STABLE_RWA token deployed to: ${stableRwa.address}`);
  }
  deploymentData.stableRwa = stableRwa.address;
  
  // 2. Deploy core implementation contracts
  console.log("\n2. Deploying core implementation contracts...");
  
  // 2.1 Deploy MarketV2 implementation
  const MarketV2 = await ethers.getContractFactory("MarketV2");
  const marketV2Implementation = await MarketV2.deploy();
  await marketV2Implementation.deployed();
  console.log(`MarketV2 implementation deployed to: ${marketV2Implementation.address}`);
  deploymentData.marketImplementation = marketV2Implementation.address;
  
  // 2.2 Deploy StakePool implementation
  const StakePool = await ethers.getContractFactory("StakePool");
  const stakePoolImplementation = await StakePool.deploy();
  await stakePoolImplementation.deployed();
  console.log(`StakePool implementation deployed to: ${stakePoolImplementation.address}`);
  deploymentData.stakePoolImplementation = stakePoolImplementation.address;
  
  // 2.3 Deploy Bank implementation
  const Bank = await ethers.getContractFactory("Bank");
  const bankImplementation = await Bank.deploy();
  await bankImplementation.deployed();
  console.log(`Bank implementation deployed to: ${bankImplementation.address}`);
  deploymentData.bankImplementation = bankImplementation.address;
  
  // 3. Deploy core proxy contracts
  console.log("\n3. Deploying core proxy contracts...");
  
  // 3.1 Deploy MarketV2 proxy
  let marketProxy;
  if (config.marketProxy) {
    console.log(`Using existing MarketV2 proxy at: ${config.marketProxy}`);
    marketProxy = await ethers.getContractAt("MarketV2", config.marketProxy);
  } else {
    marketProxy = await upgrades.deployProxy(MarketV2, [], {
      initializer: false,
      unsafeAllowLinkedLibraries: true,
      unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable", "state-variable-assignment"],
      kind: 'transparent',
      skipIfAlreadyDeployed: true
    });
    await marketProxy.deployed();
    console.log(`MarketV2 proxy deployed to: ${marketProxy.address}`);
  }
  deploymentData.marketProxy = marketProxy.address;
  
  // 3.2 Deploy StakePool proxy
  let stakePoolProxy;
  if (config.stakePoolProxy) {
    console.log(`Using existing StakePool proxy at: ${config.stakePoolProxy}`);
    stakePoolProxy = await ethers.getContractAt("StakePool", config.stakePoolProxy);
  } else {
    stakePoolProxy = await upgrades.deployProxy(StakePool, [], {
      initializer: false,
      unsafeAllowLinkedLibraries: true,
      unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable", "state-variable-assignment"],
      kind: 'transparent',
      skipIfAlreadyDeployed: true
    });
    await stakePoolProxy.deployed();
    console.log(`StakePool proxy deployed to: ${stakePoolProxy.address}`);
  }
  deploymentData.stakePoolProxy = stakePoolProxy.address;
  
  // 3.3 Deploy Bank proxy
  let bankProxy;
  if (config.bankProxy) {
    console.log(`Using existing Bank proxy at: ${config.bankProxy}`);
    bankProxy = await ethers.getContractAt("Bank", config.bankProxy);
  } else {
    bankProxy = await upgrades.deployProxy(Bank, [], {
      initializer: false,
      unsafeAllowLinkedLibraries: true,
      unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable", "state-variable-assignment"],
      kind: 'transparent',
      skipIfAlreadyDeployed: true
    });
    await bankProxy.deployed();
    console.log(`Bank proxy deployed to: ${bankProxy.address}`);
  }
  deploymentData.bankProxy = bankProxy.address;
  
  // 4. Deploy Helper contract
  console.log("\n4. Deploying Helper contract...");
  let helper;
  if (config.helper) {
    console.log(`Using existing Helper contract at: ${config.helper}`);
    helper = await ethers.getContractAt("Helper", config.helper);
  } else {
    const Helper = await ethers.getContractFactory("Helper");
    helper = await Helper.deploy(
      rwa.address,
      prRWA.address,
      stableRwa.address,
      marketProxy.address,
      bankProxy.address,
      stakePoolProxy.address
    );
    await helper.deployed();
    console.log(`Helper contract deployed to: ${helper.address}`);
  }
  deploymentData.helper = helper.address;
  
  // 5. Initialize core contracts
  console.log("\n5. Initializing core contracts...");
  
  // Check if contracts need initialization
  const stakePool = await ethers.getContractAt("StakePool", stakePoolProxy.address);
  const bank = await ethers.getContractAt("Bank", bankProxy.address);
  const market = await ethers.getContractAt("MarketV2", marketProxy.address);
  
  // Check if StakePool is already initialized
  let isStakePoolInitialized = false;
  try {
    // Try to get pool length - this will fail if not initialized
    await stakePool.poolLength();
    isStakePoolInitialized = true;
    console.log("StakePool is already initialized");
  } catch (error) {
    console.log("StakePool needs initialization");
  }
  
  // 保存StakePool选项
  deploymentData.stakePoolOptions = {
    mintPercentPerDay: config.stakePool.mintPercentPerDay,
    blocksPerDay: config.stakePool.blocksPerDay,
    dev: deployer.address,
    withdrawFee: config.stakePool.withdrawFee,
    mintFee: config.stakePool.mintFee
  };
  
  if (!isStakePoolInitialized) {
    // 5.1 Initialize StakePool
    console.log("Initializing StakePool...");
    
    // Using the constructor1 function for initialization
    const stakePoolInitTx = await stakePool.constructor1(
      rwa.address,
      prRWA.address,
      bankProxy.address,
      deployer.address // owner
    );
    await stakePoolInitTx.wait();
    console.log("StakePool initialized");
    
    // Set StakePool options
    const setStakePoolOptionsTx = await stakePool.setOptions(
      config.stakePool.mintPercentPerDay,
      config.stakePool.blocksPerDay,
      deployer.address, // dev address
      config.stakePool.withdrawFee,
      config.stakePool.mintFee,
      false // don't update pools since none exist yet
    );
    await setStakePoolOptionsTx.wait();
    console.log("StakePool options set");
    
    // Add RWA pool to StakePool (pid=0)
    const addStakePoolTx = await stakePool.add(
      1000, // allocPoint
      rwa.address, // lpToken
      false // don't update pools
    );
    await addStakePoolTx.wait();
    console.log("RWA pool added to StakePool");
  }
  
  // Check if Bank is already initialized
  let isBankInitialized = false;
  try {
    // Try to get dev address - this will fail if not initialized
    await bank.dev();
    isBankInitialized = true;
    console.log("Bank is already initialized");
  } catch (error) {
    console.log("Bank needs initialization");
  }
  
  // 保存Bank选项
  deploymentData.bankOptions = {
    dev: deployer.address,
    borrowFee: config.bank.borrowFee
  };
  
  if (!isBankInitialized) {
    // 5.2 Initialize Bank
    console.log("Initializing Bank...");
    
    // Using the constructor1 function for initialization
    const bankInitTx = await bank.constructor1(
      stableRwa.address,
      marketProxy.address,
      stakePoolProxy.address,
      helper.address,
      deployer.address // owner
    );
    await bankInitTx.wait();
    console.log("Bank initialized");
    
    // Set Bank options
    const setBankOptionsTx = await bank.setOptions(
      deployer.address, // dev address
      config.bank.borrowFee
    );
    await setBankOptionsTx.wait();
    console.log("Bank options set");
  }
  
  // 5.3 Initialize MarketV2 
  // Note: Market initialization would be handled here
  // Since the MarketV2 contract has specific initialization requirements,
  // you should implement the proper initialization based on the contract's design
  
  console.log("Market core contracts initialization needs to be manually verified");
  
  // 6. Deploy GLA contract
  console.log("\n6. Deploying GLA contract...");
  let gla;
  if (config.gla && typeof config.gla === 'string' && config.gla !== "") {
    console.log(`Using existing GLA contract at: ${config.gla}`);
    gla = await ethers.getContractAt("GenesisLaunchAuction", config.gla);
  } else {
    const GLA = await ethers.getContractFactory("GenesisLaunchAuction");
    
    // Get USDC address from config
    const usdcAddress = config.usdc;
    deploymentData.usdc = usdcAddress;
    
    // 保存GLA参数
    deploymentData.glaParams = {
      beforeWhitelistInterval: config.gla.beforeWhitelistInterval,
      whitelistInterval: config.gla.whitelistInterval,
      publicOfferingInterval: config.gla.publicOfferingInterval,
      initInterval: config.gla.initInterval,
      whitelistPrice: config.gla.whitelistPrice,
      publicOfferingPrice: config.gla.publicOfferingPrice,
      softCap: config.gla.softCap,
      hardCap: config.gla.hardCap,
      whitelistMaxCapPerUser: config.gla.whitelistMaxCapPerUser
    };
    
    gla = await GLA.deploy(
      rwa.address,
      usdcAddress, // USDC
      marketProxy.address,
      config.gla.beforeWhitelistInterval,
      config.gla.whitelistInterval,
      config.gla.publicOfferingInterval,
      config.gla.initInterval,
      config.gla.whitelistPrice,
      config.gla.publicOfferingPrice,
      config.gla.softCap,
      config.gla.hardCap,
      config.gla.whitelistMaxCapPerUser
    );
    await gla.deployed();
    console.log(`GLA contract deployed to: ${gla.address}`);
  }
  deploymentData.gla = gla.address;
  
  // 7. Set permissions and roles
  console.log("\n7. Setting permissions and roles...");
  
  // Grant minting roles to relevant contracts
  if (!config.rwa) {
    // RWA token: grant minting role to deployer and potentially GLA
    await rwa.transferOwnership(deployer.address);
    deploymentData.rwaOwner = deployer.address;
    console.log("RWA ownership transferred to deployer");
  }
  
  if (!config.prRWA) {
    // prRWA token: grant MINT_ROLE to StakePool
    const MINT_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINT_ROLE"));
    
    // Check if StakePool already has MINT_ROLE
    const hasRole = await prRWA.hasRole(MINT_ROLE, stakePoolProxy.address);
    if (!hasRole) {
      await prRWA.grantRole(MINT_ROLE, stakePoolProxy.address);
      console.log("prRWA MINT_ROLE granted to StakePool");
    } else {
      console.log("StakePool already has MINT_ROLE for prRWA");
    }
  }
  
  if (!config.stableRwa) {
    // STABLE_RWA token: grant minting role to Bank
    const currentOwner = await stableRwa.owner();
    if (currentOwner.toLowerCase() !== bankProxy.address.toLowerCase()) {
      await stableRwa.transferOwnership(bankProxy.address);
      console.log("STABLE_RWA ownership transferred to Bank");
    } else {
      console.log("Bank already owns STABLE_RWA token");
    }
  }
  
  console.log("\nRWA Launchpad protocol deployment complete!");
  
  // 生成部署报告
  const deploymentReportDir = await generateDeploymentReport(deploymentData);
  
  // Print deployed addresses summary
  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`RWA Token: ${rwa.address}`);
  console.log(`prRWA Token: ${prRWA.address}`);
  console.log(`STABLE_RWA Token: ${stableRwa.address}`);
  console.log(`Market Proxy: ${marketProxy.address}`);
  console.log(`StakePool Proxy: ${stakePoolProxy.address}`);
  console.log(`Bank Proxy: ${bankProxy.address}`);
  console.log(`Helper: ${helper.address}`);
  console.log(`GLA: ${gla.address}`);
  
  // 显示部署报告位置
  if (deploymentReportDir) {
    console.log(`\nDetailed deployment report saved to: ${deploymentReportDir}/deployment-report.md`);
  }
  
  // Save these values to .env file for future reference
  console.log(`
To save these addresses for future use, add them to your .env file:

RWA_ADDRESS=${rwa.address}
PRRWA_ADDRESS=${prRWA.address}
STABLE_RWA_ADDRESS=${stableRwa.address}
MARKET_PROXY_ADDRESS=${marketProxy.address}
STAKEPOOL_PROXY_ADDRESS=${stakePoolProxy.address}
BANK_PROXY_ADDRESS=${bankProxy.address}
HELPER_ADDRESS=${helper.address}
GLA_ADDRESS=${gla.address}
  `);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 