# RWA Launchpad - 完整RWA生态系统

## 📋 项目概述

RWA Launchpad是一个完整的去中心化交易所(DEX)生态系统，通过工厂模式实现一键部署，包含完整的代币经济、交易市场、借贷银行、质押池和辅助工具系统。

### 🌟 项目愿景
- **一键部署**: 通过工厂合约快速创建完整DEX系统
- **模块化设计**: 核心功能分离，便于维护和扩展
- **多场景支持**: 从原型验证到生产部署的完整解决方案
- **生态完整**: 代币、交易、借贷、质押的完整DeFi闭环

### 🎯 目标用户
- **DeFi项目方**: 快速部署自己的DEX系统
- **开发者**: 学习和研究DEX架构
- **投资机构**: 批量部署多个项目
- **个人用户**: 体验完整的DeFi生态系统

## 🚀 核心特性

### 🏗️ 工厂化部署
- **一键部署**: `deployWithPreset()` 单函数调用创建完整DEX
- **分步部署**: 支持4阶段部署：创建→代币→核心→完成
- **双模式支持**: 快速原型模式(MockToken) + 生产部署模式(Clones)
- **预设配置**: 保守型、平衡型、激进型三种风险配置

### 💰 代币经济系统
- **三币架构**: RWA(治理代币) + prRWA(质押奖励) + STABLE_RWA(借贷代币)
- **动态铸造**: 基于质押量的prRWA按日铸造分配
- **权限控制**: 基于AccessControl的精细权限管理
- **经济模型**: 可配置的铸造率、费用和分配权重

### 🔄 智能交易机制
- **动态定价**: 基于AMM算法的自适应价格发现
- **资金率管理**: 目标资金率自动调节机制
- **地板价保护**: 只涨不跌的地板价机制
- **多稳定币**: 支持USDC、USDT等主流稳定币

### 🏦 借贷系统
- **质押借贷**: 基于质押RWA的STABLE_RWA借贷服务
- **动态额度**: 借款上限 = 质押RWA × 地板价
- **费用管理**: 可配置借款费率(推荐3-5%)
- **债务跟踪**: 实时用户债务管理和可提取额度计算

## 🏛️ 技术架构

```
RWA Launchpad/
├── 📁 contracts/
│   ├── 📁 core/                    # 核心业务合约
│   │   ├── 📁 Bank/               # 借贷银行
│   │   │   └── Bank.sol           # 借贷核心合约
│   │   ├── 📁 Market/             # 交易市场
│   │   │   └── MarketV2.sol       # 市场V2版本（可升级）
│   │   └── 📁 StakePool/          # 质押池
│   │       ├── StakePool.sol      # 质押池核心合约
│   │       ├── DelegateGuard.sol  # 委托保护
│   │       └── Initializer.sol    # 初始化器
│   ├── 📁 GLA/                    # 创世启动拍卖
│   │   └── GLA.sol                # 拍卖合约
│   ├── 📁 Helper/                 # 辅助合约
│   │   └── Helper.sol             # 用户交互辅助
│   ├── 📁 RWA/                    # 代币合约
│   │   └── RWA.sol                # 核心代币
│   ├── 📁 prRWA/                  # 质押奖励代币
│   │   └── 📁 contracts/
│   │       └── prRWA.sol          # 质押奖励代币
│   ├── 📁 STABLE_RWA/             # 稳定代币
│   │   └── 📁 contracts/
│   │       └── StableRwa.sol      # 稳定代币
│   ├── 📁 interfaces/             # 接口定义
│   │   ├── 📁 common/             # 通用接口
│   │   └── 📁 Market/             # 市场接口
│   ├── 📁 mocks/                  # 模拟合约
│   │   └── MockToken.sol          # 模拟代币
│   ├── 📁 shared/                 # 共享组件
│   │   ├── 📁 libraries/          # 工具库
│   │   ├── 📁 proxy/              # 代理组件
│   │   └── 📁 utils/              # 工具函数
│   ├── RWALaunchpad.sol           # 主工厂合约
│   ├── ProjectParameters.sol      # 参数配置合约
│   └── ProjectRegistry.sol        # 项目注册表合约
├── 📁 test/                       # 测试文件
├── 📁 scripts/                    # 部署脚本
├── 📁 docs/                       # 项目文档
└── README.md                      # 项目说明
```

## 🔧 核心合约详解

### RWALaunchpad - 主工厂合约
**文件位置**: `contracts/RWALaunchpad.sol`

#### 主要功能
- **项目创建**: 生成唯一项目ID，管理项目生命周期
- **一键部署**: `deployWithPreset()` 单函数创建完整DEX
- **分步部署**: 支持4阶段部署流程
- **双模式支持**: 快速原型模式 + 生产部署模式

#### 核心特性
- **超轻量设计**: 仅18KB，完全符合EVM限制
- **地址预测**: 使用CREATE2确定性地址
- **项目管理**: 完整的项目注册、查询、管理功能
- **费用系统**: 可配置部署费用，支持费用提取

#### 关键函数
```solidity
// 一键部署
function deployWithPreset(
    string memory projectName,
    uint8 presetType // 0=保守型, 1=平衡型, 2=激进型
) external payable returns (uint256 projectId);

// 分步部署
function createProject(string memory projectName) external payable returns (uint256 projectId);
function deployTokens(uint256 projectId, bytes memory rwaBytecode, ...) external;
function deployCoreContracts(uint256 projectId, bytes memory bankBytecode, ...) external;
function deployHelper(uint256 projectId, bytes memory helperBytecode) external;

// 查询功能
function getProject(uint256 projectId) external view returns (...);
function getAllContracts(uint256 projectId) external view returns (...);
function getProjectCount() external view returns (uint256);
```

### ProjectParameters - 参数配置合约
**文件位置**: `contracts/ProjectParameters.sol`

#### 主要功能
- **参数模板**: 提供三种预设配置模板
- **参数验证**: 自动验证配置的合理性
- **灵活配置**: 支持完全自定义参数配置

#### 预设配置
- **保守型(Conservative)**: 低风险、稳定收益配置
- **平衡型(Balanced)**: 中等风险、平衡收益配置
- **激进型(Aggressive)**: 高风险、高收益配置

#### 配置结构
```solidity
struct ProjectConfig {
    TokenConfig tokens;           // 代币配置
    BankConfig bank;             // 银行配置
    MarketPriceConfig marketPrice; // 市场价格配置
    MarketFeeConfig marketFee;   // 市场费用配置
    MarketPriceFormula priceFormula; // 价格公式配置
    StakePoolRewardConfig stakeReward; // 质押奖励配置
    StakePoolFeeConfig stakeFee; // 质押费用配置
    StablecoinConfig stablecoins; // 稳定币配置
    RoleConfig roles;            // 角色配置
    GLAConfig gla;               // GLA拍卖配置
    bool enableGLA;              // 是否启用GLA
}
```

### ProjectRegistry - 项目注册表合约
**文件位置**: `contracts/ProjectRegistry.sol`

#### 主要功能
- **项目注册**: 记录所有通过工厂创建的项目信息
- **地址映射**: 维护项目ID到合约地址的映射关系
- **状态管理**: 项目生命周期状态跟踪
- **查询统计**: 丰富的查询和统计功能

#### 核心特性
- **完整索引**: 支持名称、地址、所有者等多维度查询
- **状态管理**: 创建中、活跃、暂停、废弃四种状态
- **统计分析**: 项目数量、年龄、活跃度等统计信息
- **分页查询**: 支持大规模项目的分页查询

### MarketV2 - 交易市场合约
**文件位置**: `contracts/core/Market/MarketV2.sol`

#### 主要功能
- **代币交易**: 处理RWA代币的买卖交易
- **价格发现**: 基于AMM算法的动态价格发现
- **流动性管理**: 自动化的流动性提供和移除
- **债务管理**: 完善的债务跟踪和清算机制

#### 核心特性
- **动态定价**: 基于供需关系的自适应价格
- **资金率管理**: 目标资金率自动调节机制
- **地板价保护**: 只涨不跌的地板价机制
- **多稳定币支持**: 支持USDC、USDT等多种稳定币

#### 价格机制
```solidity
// 价格公式
// 当总供应量 ≤ p: 价格 = f (底价)
// 当总供应量 > p: 价格 = f + (总供应量 - p) / k

// 资金率计算
// 当前资金率 = PSF / (PSF + FSF)
// PSF = 价格支撑资金 = (当前价格 - 底价) × (当前供应量 - 底价供应量) / 2
// FSF = 底价支撑资金 = 底价 × 底价供应量
```

#### 主要函数
```solidity
// 交易函数
function buy(address token, uint256 tokenWorth, uint256 desired) 
    external returns (uint256 amount, uint256 fee);

function sell(uint256 amount, address token, uint256 desired) 
    external returns (uint256 worth, uint256 repaidDebt1e18, uint256 fee);

// 价格估算
function estimateBuy(address token, uint256 tokenWorth) 
    external view returns (uint256 amount, uint256 fee, uint256 worth1e18, uint256 newPrice);

function estimateSell(uint256 amount, address token) 
    external view returns (uint256 fee, uint256 worth1e18, uint256 worth, uint256 newPrice, uint256 repaidDebt1e18);
```

### StakePool - 质押池合约
**文件位置**: `contracts/core/StakePool/StakePool.sol`

#### 主要功能
- **质押管理**: 管理用户质押和奖励分发
- **奖励计算**: 自动计算和分配质押奖励
- **流动性提供**: 支持流动性挖矿
- **治理参与**: 质押者参与协议治理

#### 核心特性
- **多池支持**: 支持多个质押池
- **动态奖励**: 根据质押量和时间动态调整奖励
- **权重分配**: 可配置的池权重分配系统
- **费用管理**: 灵活的提现和铸造费用机制

#### 奖励机制
```solidity
// 奖励计算公式
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt

// 日铸造率配置
Conservative: 0.3%/天 ≈ 110%年化
Balanced: 0.5%/天 ≈ 200%年化
Aggressive: 0.8%/天 ≈ 300%年化
```

#### 主要函数
```solidity
// 质押相关
function deposit(uint256 _pid, uint256 _amount) external;
function withdraw(uint256 _pid, uint256 _amount) external;
function emergencyWithdraw(uint256 _pid) external;

// 奖励相关
function pendingReward(uint256 _pid, address _user) external view returns (uint256);
function claimReward(uint256 _pid) external;

// 池管理
function add(uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate) external onlyOwner;
function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) external onlyOwner;
```

### Bank - 借贷银行合约
**文件位置**: `contracts/core/Bank/Bank.sol`

#### 主要功能
- **质押借贷**: 基于质押RWA的STABLE_RWA借贷服务
- **债务管理**: 用户债务跟踪和管理
- **可提取计算**: 基于地板价的提取额度计算
- **费用管理**: 借贷费用的收取和分配

#### 核心特性
- **超额抵押**: 基于质押的RWA进行借贷
- **动态额度**: 借款上限 = 质押RWA × 地板价
- **固定费率**: 基于质押量的借贷费用
- **债务跟踪**: 用户债务的实时跟踪

#### 借贷机制
```solidity
// 借贷限制
require(
    userDebt + amount <= (amountRWA * floorPrice) / 1e18,
    "Bank: exceeds available"
);

// 可提取额度计算
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

#### 主要函数
```solidity
// 借贷相关
function borrow(uint256 amount) external returns (uint256 borrowed, uint256 fee);
function borrowFrom(address user, uint256 amount) external returns (uint256 borrowed, uint256 fee);
function repay(uint256 amount) external;

// 查询函数
function available(address user) public view returns (uint256);
function withdrawable(address user) external view returns (uint256);

// 管理函数
function setOptions(address _dev, uint32 _borrowFee) public onlyOwner;
function pause() external onlyOwner;
function unpause() external onlyOwner;
```

### Helper - 辅助工具合约
**文件位置**: `contracts/Helper/Helper.sol`

#### 主要功能
- **一键操作**: 将复杂的多步骤操作封装为单次调用
- **投资组合**: 买入→质押→借贷→复投的完整流程
- **再投资**: 实现prRWA→买入RWA→质押的循环投资
- **用户体验**: 简化用户交互，减少Gas消耗

#### 核心特性
- **操作封装**: 复杂的多合约交互封装为简单函数
- **Gas优化**: 批量操作减少用户Gas消耗
- **安全验证**: 内置参数验证和滑点保护
- **流程优化**: 自动化的投资和再投资流程

#### 主要函数
```solidity
// 投资组合操作
function invest(
    address token,        // 稳定币地址
    uint256 tokenWorth,   // 稳定币数量
    uint256 desired,      // 期望获得的最小RWA数量
    bool borrow           // 是否借贷
) external;

// 再投资操作
function reinvest(
    address token,        // 稳定币地址
    uint256 amount,       // prRWA数量
    uint256 desired       // 最大愿意支付的稳定币数量
) external;

// 借贷投资
function borrowAndInvest(uint256 amount) external;
```

## 💰 经济模型

### 代币经济学

#### RWA (核心代币)
- **代币类型**: ERC20代币，支持铸造和销毁
- **铸造权限**: 仅所有者可铸造
- **用途**: 质押、交易、借贷抵押品
- **经济模型**: 基于供需关系的动态价格

#### prRWA (质押奖励代币)
- **代币类型**: ERC20代币，支持铸造和销毁
- **产生机制**: 通过质押RWA获得
- **分配比例**: 根据质押量和时间分配
- **用途**: 质押奖励、协议激励

#### STABLE_RWA (借贷代币)
- **代币类型**: ERC20代币，支持铸造和销毁
- **产生机制**: 通过Bank合约借贷产生
- **销毁机制**: 还款时销毁
- **用途**: 借贷、交易、流动性管理

### 激励机制

#### 质押奖励
```solidity
// 奖励计算公式
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt

// 日铸造率配置
Conservative: 0.3%/天 ≈ 110%年化
Balanced: 0.5%/天 ≈ 200%年化
Aggressive: 0.8%/天 ≈ 300%年化
```

#### 交易费用
- **买入费用**: 1-4% (动态调整)
- **卖出费用**: 1-4% (动态调整)
- **费用分配**: 开发者费用 + 协议费用

#### 借贷利息
- **基础利率**: 2-10% (年化)
- **动态调整**: 根据借贷需求调整
- **利息分配**: 开发者费用 + 协议费用

## 🔒 安全特性

### 代码安全

#### 审计报告
- **外部审计**: 由知名安全公司进行审计
- **内部审计**: 团队内部代码审查
- **社区审计**: 开源社区贡献者审查
- **持续审计**: 定期安全评估

#### 测试覆盖
- **单元测试**: 100% 核心功能覆盖
- **集成测试**: 完整业务流程测试
- **压力测试**: 极端情况测试
- **模糊测试**: 随机输入测试

### 运营安全

#### 权限管理
```solidity
// 角色定义
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
```

#### 多签名钱包
- **治理钱包**: 5/9 多签名
- **运营钱包**: 3/5 多签名
- **紧急钱包**: 2/3 多签名

#### 时间锁
- **治理延迟**: 24小时
- **升级延迟**: 48小时
- **紧急延迟**: 2小时

### 风险控制

#### 超额抵押
- **最低抵押率**: 150%
- **清算阈值**: 120%
- **清算惩罚**: 5-10%

#### 债务管理
```solidity
// 借贷限制
require(
    userDebt + amount <= (amountRWA * floorPrice) / 1e18,
    "Bank: exceeds available"
);
```

## 🚀 快速开始

### 环境要求
- **Node.js**: 16.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **Hardhat**: 2.12.0 或更高版本
- **Solidity**: 0.8.19

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-repo/dex-contracts.git
cd dex-contracts
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

4. **编译合约**
```bash
npx hardhat compile
```

5. **运行测试**
```bash
npx hardhat test
```

### 本地开发

1. **启动本地节点**
```bash
npx hardhat node
```

2. **部署到本地网络**
```bash
npx hardhat run scripts/deploy-simple.js --network localhost
```

3. **运行完整测试套件**
```bash
npx hardhat test --network localhost
```

## 📦 部署指南

### 网络配置

#### 支持的网络
- **Ethereum Mainnet**: 主网
- **Polygon**: 侧链
- **Arbitrum**: L2解决方案
- **Optimism**: L2解决方案
- **BSC**: 币安智能链

#### 环境变量配置
```env
# 网络配置
NETWORK=mainnet
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# 代币地址（如果已部署）
RWA_ADDRESS=0x...
PRRWA_ADDRESS=0x...
STABLERWA_ADDRESS=0x...

# 核心合约地址
MARKET_PROXY_ADDRESS=0x...
STAKEPOOL_PROXY_ADDRESS=0x...
BANK_PROXY_ADDRESS=0x...
HELPER_ADDRESS=0x...

# 外部地址
USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# 协议参数
MINT_PERCENT_PER_DAY=10
BLOCKS_PER_DAY=7200
WITHDRAW_FEE=50
MINT_FEE=50
BORROW_FEE=50

# API密钥
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### 部署步骤

1. **准备部署环境**
```bash
# 确保有足够的测试币
# 配置正确的私钥和RPC URL
```

2. **部署代币合约**
```bash
npx hardhat run scripts/deploy-tokens.js --network <network_name>
```

3. **部署核心合约**
```bash
npx hardhat run scripts/deploy-core.js --network <network_name>
```

4. **部署辅助合约**
```bash
npx hardhat run scripts/deploy-helper.js --network <network_name>
```

5. **初始化合约**
```bash
npx hardhat run scripts/initialize.js --network <network_name>
```

6. **验证合约**
```bash
npx hardhat run scripts/verify.js --network <network_name>
```

## 👨‍💻 开发指南

### 合约开发规范

#### 代码风格
- **命名规范**: 使用驼峰命名法
- **注释规范**: 使用NatSpec格式
- **缩进规范**: 使用4个空格
- **行长度**: 不超过120字符

#### 安全最佳实践
```solidity
// 1. 使用SafeMath (Solidity 0.8+ 已内置)
// 2. 检查重入攻击
modifier nonReentrant() {
    require(!locked, "Reentrant call");
    locked = true;
    _;
    locked = false;
}

// 3. 权限检查
modifier onlyRole(bytes32 role) {
    require(hasRole(role, _msgSender()), "AccessControl: access denied");
    _;
}

// 4. 事件记录
event Deposit(address indexed user, uint256 amount);
```

### 接口开发

#### 接口定义规范
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IMarket {
    // 事件定义
    event Buy(
        address indexed from,
        address indexed token,
        uint256 input,
        uint256 output,
        uint256 fee,
        uint256 newDebt1e18
    );
    
    // 函数定义
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
    
    // 查询函数
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

## 🧪 测试指南

### 测试类型

#### 单元测试
- **功能测试**: 测试单个函数的功能
- **边界测试**: 测试边界条件和异常情况
- **权限测试**: 测试权限控制机制

#### 集成测试
- **合约交互**: 测试合约间的交互
- **业务流程**: 测试完整的业务流程
- **事件验证**: 验证事件正确触发

#### 压力测试
- **负载测试**: 测试高负载下的性能
- **gas优化**: 测试gas使用情况
- **并发测试**: 测试并发操作

### 测试命令

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/RWA.test.js

# 运行测试并显示gas使用情况
npx hardhat test --gas

# 运行测试并生成覆盖率报告
npx hardhat coverage

# 运行测试并显示详细日志
npx hardhat test --verbose
```

## 📚 API文档

### Market合约API

#### 交易函数

##### buy
购买RWA代币
```solidity
function buy(
    address token,        // 支付代币地址
    uint256 tokenWorth,   // 支付代币数量
    uint256 desired       // 期望获得的最小RWA数量
) external returns (
    uint256 amount,       // 实际获得的RWA数量
    uint256 fee          // 手续费
);
```

**参数说明**:
- `token`: 用于支付的稳定币地址（如USDC、USDT）
- `tokenWorth`: 支付的稳定币数量
- `desired`: 期望获得的最小RWA数量，用于滑点保护

**返回值**:
- `amount`: 实际获得的RWA数量
- `fee`: 支付的手续费（RWA代币）

**事件**:
```solidity
event Buy(
    address indexed from,     // 购买者地址
    address indexed token,    // 支付代币地址
    uint256 input,           // 输入数量
    uint256 output,          // 输出数量
    uint256 fee,             // 手续费
    uint256 newDebt1e18      // 新增债务
);
```

##### sell
卖出RWA代币
```solidity
function sell(
    uint256 amount,      // 卖出的RWA数量
    address token,       // 接收代币地址
    uint256 desired      // 期望获得的最小稳定币数量
) external returns (
    uint256 worth,       // 实际获得的稳定币数量
    uint256 repaidDebt1e18, // 偿还的债务
    uint256 fee          // 手续费
);
```

**参数说明**:
- `amount`: 要卖出的RWA数量
- `token`: 接收的稳定币地址
- `desired`: 期望获得的最小稳定币数量

**返回值**:
- `worth`: 实际获得的稳定币数量
- `repaidDebt1e18`: 偿还的债务数量
- `fee`: 支付的手续费

**事件**:
```solidity
event Sell(
    address indexed from,        // 卖出者地址
    address indexed token,       // 接收代币地址
    uint256 input,              // 输入数量
    uint256 output,             // 输出数量
    uint256 fee,                // 手续费
    uint256 repaidDebt1e18      // 偿还的债务
);
```

#### 查询函数

##### estimateBuy
估算购买结果
```solidity
function estimateBuy(
    address token,       // 支付代币地址
    uint256 tokenWorth   // 支付代币数量
) external view returns (
    uint256 amount,      // 预计获得的RWA数量
    uint256 fee,         // 预计手续费
    uint256 worth1e18,   // 实际价值（1e18精度）
    uint256 newPrice     // 交易后的新价格
);
```

**使用示例**:
```javascript
const usdcAmount = ethers.utils.parseUnits("1000", 6);
const estimate = await market.estimateBuy(usdc.address, usdcAmount);

console.log(`预计获得RWA: ${ethers.utils.formatEther(estimate.amount)}`);
console.log(`预计手续费: ${ethers.utils.formatEther(estimate.fee)}`);
console.log(`实际价值: ${ethers.utils.formatEther(estimate.worth1e18)}`);
console.log(`新价格: ${ethers.utils.formatEther(estimate.newPrice)}`);
```

##### estimateSell
估算卖出结果
```solidity
function estimateSell(
    uint256 amount,      // 卖出的RWA数量
    address token        // 接收代币地址
) external view returns (
    uint256 fee,         // 预计手续费
    uint256 worth1e18,   // 预计获得的稳定币数量（1e18精度）
    uint256 worth,       // 预计获得的稳定币数量
    uint256 newPrice,    // 交易后的新价格
    uint256 repaidDebt1e18 // 预计偿还的债务
);
```

### StakePool合约API

#### 质押函数

##### deposit
质押代币
```solidity
function deposit(
    uint256 _pid,    // 池ID
    uint256 _amount  // 质押数量
) external;
```

**事件**:
```solidity
event Deposit(
    address indexed user,   // 用户地址
    uint256 indexed pid,    // 池ID
    uint256 amount         // 质押数量
);
```

##### withdraw
提取质押
```solidity
function withdraw(
    uint256 _pid,    // 池ID
    uint256 _amount  // 提取数量
) external;
```

**事件**:
```solidity
event Withdraw(
    address indexed user,   // 用户地址
    uint256 indexed pid,    // 池ID
    uint256 amount         // 提取数量
);
```

#### 查询函数

##### pendingReward
查询待领取奖励
```solidity
function pendingReward(
    uint256 _pid,    // 池ID
    address _user    // 用户地址
) external view returns (uint256);
```

**使用示例**:
```javascript
const poolId = 0; // RWA质押池
const pending = await stakePool.pendingReward(poolId, userAddress);
console.log(`待领取奖励: ${ethers.utils.formatEther(pending)} prRWA`);
```

### Bank合约API

#### 借贷函数

##### borrow
借款
```solidity
function borrow(
    uint256 amount    // 借款数量
) external;
```

**事件**:
```solidity
event Borrow(
    address indexed user,   // 借款人地址
    uint256 amount         // 借款数量
);
```

##### repay
还款
```solidity
function repay(
    uint256 amount    // 还款数量
) external;
```

**事件**:
```solidity
event Repay(
    address indexed user,   // 还款人地址
    uint256 amount         // 还款数量
);
```

## 🤝 贡献指南

### 开发环境设置

1. **Fork项目**
```bash
# Fork项目到你的GitHub账户
# 然后克隆你的fork
git clone https://github.com/your-username/dex-contracts.git
cd dex-contracts
```

2. **创建开发分支**
```bash
git checkout -b feature/your-feature-name
```

3. **安装依赖**
```bash
npm install
```

4. **运行测试**
```bash
npx hardhat test
```

### 代码规范

#### Solidity代码规范
```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContractName
 * @dev 合约功能描述
 * @author Your Name
 * @notice 这个合约用于...
 * @dev 详细的技术说明
 */
contract ContractName is Ownable {
    // 状态变量
    IERC20 public token;
    uint256 public totalSupply;
    
    // 事件
    event EventName(address indexed user, uint256 amount);
    
    // 错误定义
    error InsufficientBalance(uint256 available, uint256 required);
    
    // 修饰符
    modifier onlyValidAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }
    
    // 构造函数
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    // 外部函数
    function externalFunction(uint256 amount) 
        external 
        onlyOwner 
        onlyValidAmount(amount) 
    {
        // 函数实现
        emit EventName(msg.sender, amount);
    }
}
```

## ❓ 常见问题

### 技术问题

#### Q: 如何计算交易滑点？
A: 滑点计算公式如下：
```javascript
// 预期价格
const expectedPrice = inputAmount / expectedOutput;

// 实际价格
const actualPrice = inputAmount / actualOutput;

// 滑点百分比
const slippage = ((expectedPrice - actualPrice) / expectedPrice) * 100;
```

#### Q: 如何处理价格预言机？
A: 我们使用Chainlink价格预言机：
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

### 业务问题

#### Q: 如何参与协议管理？
A: 协议管理流程：
1. 持有RWA代币
2. 质押RWA获得pr_RWA奖励
3. 通过所有者进行参数调整
4. 参与协议升级决策

#### Q: 如何计算质押奖励？
A: 奖励计算公式：
```solidity
// 用户奖励 = (用户质押量 * 池累计奖励) - 用户奖励债务
reward = (user.amount * pool.accRewardPerShare) - user.rewardDebt;
```

## 📝 更新日志

### v2.0.0 (2025-01-15)
#### 🚀 新功能
- 添加MarketV2合约，支持债务管理
- 实现Bonds合约集成
- 新增地板价保护机制
- 添加紧急暂停功能

#### 🔧 改进
- 优化gas使用效率
- 改进价格发现算法
- 增强安全机制
- 完善测试覆盖

### v1.0.0 (2023-10-01)
#### 🎉 首次发布
- 基础交易功能
- 质押奖励系统
- 借贷服务
- 权限管理

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件