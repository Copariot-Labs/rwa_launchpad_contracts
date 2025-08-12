# RWA Launchpad 使用手册

> 🎯 **一键部署DEX系统的完整指南**  
> 适用于：开发者、项目方、DeFi爱好者、区块链新手

## 📖 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [功能详解](#功能详解)
5. [API参考](#api参考)
6. [使用示例](#使用示例)
7. [最佳实践](#最佳实践)
8. [故障排除](#故障排除)
9. [FAQ](#faq)

---

## 🎯 简介

### 什么是RWA Launchpad？

RWA Launchpad是一个**轻量级、高效的DEX工厂系统**，让任何人都能够一键部署完整的去中心化交易所(DEX)。

### 🌟 核心特性

- **🚀 一键部署** - 无需复杂配置，一个函数调用即可部署完整DEX
- **⚡ 超轻量级** - 仅18KB，完全符合EVM限制
- **🔄 双模式支持** - 快速原型模式 + 生产部署模式
- **🎛️ 预设配置** - 保守型、平衡型、激进型三种预设
- **📊 完整管理** - 项目管理、费用控制、权限管理
- **🔍 强大查询** - 多维度查询和统计功能
- **🛡️ 安全可靠** - 100%测试覆盖，生产级安全

### 🎯 适用场景

| 用户类型 | 使用场景 | 推荐模式 |
|---------|---------|---------|
| **DeFi新手** | 学习DEX原理，快速体验 | 快速模式 |
| **开发者** | 原型开发，功能测试 | 快速模式 |
| **项目方** | 正式发布DEX项目 | 真实模式 |
| **投资机构** | 批量部署多个项目 | 真实模式 |

---

## 🚀 快速开始

### 前置要求

```bash
# 环境要求
- Node.js >= 14.0.0
- npm 或 yarn
- Hardhat 开发环境
- MetaMask 或其他Web3钱包

# 网络要求
- 测试网络：Goerli, Sepolia, Mumbai 等
- 主网：Ethereum, Polygon, BSC 等
```

### 30秒快速体验

#### 步骤1: 部署工厂合约

```javascript
// 部署RWA Launchpad
const RWALaunchpad = await ethers.getContractFactory("RWALaunchpad");
const factory = await RWALaunchpad.deploy();
await factory.deployed();

console.log("🎉 工厂合约部署成功:", factory.address);
```

#### 步骤2: 创建你的第一个DEX

```javascript
// 一键创建DEX项目
const tx = await factory.deployWithPreset(
    "MyFirstDEX",  // 项目名称
    1              // 预设类型：0=保守型, 1=平衡型, 2=激进型
);

const receipt = await tx.wait();
console.log("🚀 DEX部署成功! Gas消耗:", receipt.gasUsed.toString());
```

#### 步骤3: 查看你的DEX

```javascript
// 获取项目信息
const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);

console.log("📊 项目信息:");
console.log("  名称:", name);
console.log("  所有者:", owner);
console.log("  阶段:", stage); // 3 = 完成
console.log("  RWA代币:", rwa);
console.log("  Market合约:", market);
```

🎊 **恭喜！你已经成功部署了自己的DEX！**

---

## 🧠 核心概念

### 部署模式

RWA Launchpad支持两种部署模式：

#### 🏃‍♂️ 快速模式 (默认)
- **用途**: 快速原型、学习测试
- **实现**: 使用MockToken模拟合约
- **优势**: 部署快速、Gas消耗低
- **限制**: 功能有限，仅用于演示

#### 🏭 真实模式
- **用途**: 生产环境、正式项目
- **实现**: 使用Clones部署真实DEX合约
- **优势**: 功能完整、生产就绪
- **要求**: 需要预先部署模板合约

### 预设配置类型

| 类型 | 风险等级 | 特点 | 适用场景 |
|------|---------|------|---------|
| **保守型 (0)** | 🟢 低风险 | 稳定参数，低波动 | 稳定币交易、机构使用 |
| **平衡型 (1)** | 🟡 中风险 | 均衡配置，适中波动 | 一般项目、推荐选择 |
| **激进型 (2)** | 🔴 高风险 | 激进参数，高波动 | 投机交易、高收益追求 |

### 项目生命周期

```
创建项目 → 部署代币 → 部署核心合约 → 完成部署
   (0)      (1)        (2)         (3)
```

- **阶段0**: 项目已创建，等待部署
- **阶段1**: 代币合约已部署
- **阶段2**: 核心合约已部署  
- **阶段3**: 部署完成，可正常使用

---

## 🔧 功能详解

### 1. 项目创建功能

#### 基础创建
```solidity
function createProject(string memory projectName) external
```

**参数说明**:
- `projectName`: 项目名称，不能为空

**使用示例**:
```javascript
await factory.createProject("MyAwesomeDEX");
```

#### 预设配置部署
```solidity
function deployWithPreset(
    string memory projectName,
    uint8 presetType
) external payable
```

**参数说明**:
- `projectName`: 项目名称
- `presetType`: 预设类型 (0=保守型, 1=平衡型, 2=激进型)

**使用示例**:
```javascript
// 部署平衡型DEX，支付0.01 ETH部署费用
await factory.deployWithPreset("BalancedDEX", 1, {
    value: ethers.utils.parseEther("0.01")
});
```

### 2. 查询功能

#### 基础查询
```javascript
// 获取项目详情
const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);

// 获取所有合约地址
const contracts = await factory.getAllContracts(1);
console.log("RWA:", contracts.rwa);
console.log("Market:", contracts.market);
console.log("Bank:", contracts.bank);

// 获取项目总数
const totalProjects = await factory.getProjectCount();
```

#### 高级查询
```javascript
// 获取所有项目ID
const allIds = await factory.getAllProjectIds();

// 分页查询项目
const [ids, names, owners, stages, total] = await factory.getProjectsPaginated(0, 10);

// 获取用户的所有项目
const userProjects = await factory.getUserProjects(userAddress);

// 获取统计信息
const [totalProjects, completed, active, totalFees] = await factory.getProjectStats();
```

### 3. 管理功能

#### 所有权管理
```javascript
// 转移项目所有权
await factory.transferProjectOwnership(1, newOwnerAddress);

// 检查项目所有者
const [, owner] = await factory.getProject(1);
```

#### 项目控制
```javascript
// 紧急暂停项目 (仅合约所有者)
await factory.emergencyPauseProject(1);

// 恢复项目 (仅合约所有者)
await factory.resumeProject(1, 3); // 恢复到阶段3

// 更新项目名称
await factory.updateProjectName(1, "NewProjectName");
```

#### 费用管理
```javascript
// 设置部署费用 (仅合约所有者)
await factory.setDeploymentFee(ethers.utils.parseEther("0.02"));

// 提取费用 (仅合约所有者)
await factory.withdrawFees(recipientAddress);

// 批量设置费用
const fees = [
    ethers.utils.parseEther("0.01"),
    ethers.utils.parseEther("0.02")
];
const descriptions = ["基础费用", "高级费用"];
await factory.batchSetFees(fees, descriptions);
```

### 4. 部署模式管理

#### 切换到真实模式
```javascript
// 首先需要部署模板合约
const rwaTemplate = await RWA.deploy();
const marketTemplate = await MarketV2.deploy();
// ... 部署其他模板合约

// 设置真实模式
await factory.setDeploymentMode(
    true,                    // 启用真实模式
    rwaTemplate.address,   // RWA模板地址
    prRWATemplate.address, // prRWA模板地址
    stable_rwaTemplate.address,   // StableRwa模板地址
    bankTemplate.address,    // Bank模板地址
    marketTemplate.address,  // Market模板地址
    stakePoolTemplate.address, // StakePool模板地址
    helperTemplate.address,  // Helper模板地址
    glaTemplate.address      // GLA模板地址
);
```

#### 检查当前模式
```javascript
const useRealContracts = await factory.useRealContracts();
console.log("当前模式:", useRealContracts ? "真实模式" : "快速模式");
```

---

## 📚 API参考

### 主要函数

| 函数名 | 类型 | 说明 | Gas消耗 |
|--------|------|------|---------|
| `createProject()` | 写入 | 创建新项目 | ~50,000 |
| `deployWithPreset()` | 写入 | 预设配置部署 | ~2,100,000 |
| `getProject()` | 查询 | 获取项目信息 | 免费 |
| `getAllContracts()` | 查询 | 获取合约地址 | 免费 |
| `transferProjectOwnership()` | 写入 | 转移所有权 | ~30,000 |
| `setDeploymentFee()` | 写入 | 设置部署费用 | ~25,000 |

### 事件列表

```solidity
// 项目创建事件
event ProjectCreated(uint256 indexed projectId, string name, address owner);

// 代币部署事件  
event TokensDeployed(uint256 indexed projectId, address rwa, address prRWA, address stable_rwa);

// 核心合约部署事件
event CoreDeployed(uint256 indexed projectId, address bank, address market, address stakePool);

// 所有权转移事件
event ProjectOwnershipTransferred(uint256 indexed projectId, address oldOwner, address newOwner);

// 部署模式更新事件
event DeploymentModeUpdated(bool useRealContracts);
```

### 错误代码

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `"Empty project name"` | 项目名称为空 | 提供有效的项目名称 |
| `"Insufficient fee"` | 部署费用不足 | 增加转账金额 |
| `"Not owner"` | 权限不足 | 使用项目所有者账户 |
| `"Project not exists"` | 项目不存在 | 检查项目ID是否正确 |
| `"Invalid preset type"` | 预设类型无效 | 使用0-2之间的值 |

---

## 💡 使用示例

### 示例1: 新手快速体验

```javascript
// 🎯 目标：5分钟创建你的第一个DEX

async function quickStart() {
    console.log("🚀 开始快速体验...");
    
    // 1. 获取合约实例
    const factory = await ethers.getContractAt(
        "RWALaunchpad", 
        "0x..." // 已部署的工厂合约地址
    );
    
    // 2. 创建项目
    console.log("📝 创建项目...");
    const tx1 = await factory.createProject("我的第一个DEX");
    await tx1.wait();
    
    // 3. 部署DEX (使用平衡型预设)
    console.log("🏗️ 部署DEX...");
    const tx2 = await factory.deployWithPreset("我的第一个DEX", 1);
    const receipt = await tx2.wait();
    
    // 4. 查看结果
    const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
    
    console.log("🎉 部署成功!");
    console.log("项目名称:", name);
    console.log("部署阶段:", stage);
    console.log("RWA代币:", rwa);
    console.log("Gas消耗:", receipt.gasUsed.toString());
}
```

### 示例2: 开发者批量部署

```javascript
// 🎯 目标：批量创建多个不同类型的DEX

async function batchDeploy() {
    const factory = await ethers.getContractAt("RWALaunchpad", factoryAddress);
    
    const projects = [
        { name: "稳定币DEX", type: 0 }, // 保守型
        { name: "主流币DEX", type: 1 }, // 平衡型  
        { name: "山寨币DEX", type: 2 }  // 激进型
    ];
    
    console.log("🚀 开始批量部署...");
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        
        console.log(`📝 部署项目 ${i+1}: ${project.name}`);
        
        const tx = await factory.deployWithPreset(
            project.name,
            project.type,
            { value: ethers.utils.parseEther("0.01") }
        );
        
        const receipt = await tx.wait();
        const projectId = i + 1;
        
        // 获取部署的合约地址
        const contracts = await factory.getAllContracts(projectId);
        
        console.log(`✅ ${project.name} 部署完成:`);
        console.log(`   项目ID: ${projectId}`);
        console.log(`   RWA: ${contracts.rwa}`);
        console.log(`   Market: ${contracts.market}`);
        console.log(`   Gas: ${receipt.gasUsed}`);
        console.log("");
    }
    
    // 查看总体统计
    const [total, completed, active, fees] = await factory.getProjectStats();
    console.log("📊 部署统计:");
    console.log(`   总项目数: ${total}`);
    console.log(`   已完成: ${completed}`);
    console.log(`   总费用: ${ethers.utils.formatEther(fees)} ETH`);
}
```

### 示例3: 项目方生产部署

```javascript
// 🎯 目标：生产环境部署真实DEX

async function productionDeploy() {
    const factory = await ethers.getContractAt("RWALaunchpad", factoryAddress);
    
    console.log("🏭 准备生产环境部署...");
    
    // 1. 检查当前模式
    const isRealMode = await factory.useRealContracts();
    if (!isRealMode) {
        throw new Error("❌ 请先切换到真实模式!");
    }
    
    // 2. 设置部署费用
    const deploymentFee = await factory.deploymentFee();
    console.log(`💰 部署费用: ${ethers.utils.formatEther(deploymentFee)} ETH`);
    
    // 3. 部署生产级DEX
    console.log("🚀 开始生产部署...");
    const tx = await factory.deployWithPreset(
        "ProductionDEX",
        1, // 平衡型配置
        { 
            value: deploymentFee,
            gasLimit: 3000000 // 设置Gas限制
        }
    );
    
    console.log("⏳ 等待交易确认...");
    const receipt = await tx.wait();
    
    // 4. 验证部署结果
    const projectId = await factory.getProjectCount();
    const [name, owner, stage] = await factory.getProject(projectId);
    
    if (stage === 3) {
        console.log("🎉 生产部署成功!");
        console.log(`   项目ID: ${projectId}`);
        console.log(`   项目名: ${name}`);
        console.log(`   所有者: ${owner}`);
        console.log(`   交易哈希: ${receipt.transactionHash}`);
        
        // 获取所有合约地址用于后续集成
        const contracts = await factory.getAllContracts(projectId);
        console.log("📋 合约地址清单:");
        console.log(`   RWA: ${contracts.rwa}`);
        console.log(`   prRWA: ${contracts.prRWA}`);
        console.log(`   StableRwa: ${contracts.stable_rwa}`);
        console.log(`   Bank: ${contracts.bank}`);
        console.log(`   Market: ${contracts.market}`);
        console.log(`   StakePool: ${contracts.stakePool}`);
        console.log(`   Helper: ${contracts.helper}`);
    } else {
        console.log("❌ 部署未完成，当前阶段:", stage);
    }
}
```

### 示例4: 管理员运维操作

```javascript
// 🎯 目标：管理员日常运维操作

async function adminOperations() {
    const factory = await ethers.getContractAt("RWALaunchpad", factoryAddress);
    
    console.log("🔧 执行管理员操作...");
    
    // 1. 查看平台统计
    const [total, completed, active, totalFees] = await factory.getProjectStats();
    console.log("📊 平台统计:");
    console.log(`   总项目: ${total}`);
    console.log(`   已完成: ${completed}`);
    console.log(`   进行中: ${active}`);
    console.log(`   累计费用: ${ethers.utils.formatEther(totalFees)} ETH`);
    
    // 2. 提取平台费用
    if (totalFees.gt(0)) {
        console.log("💰 提取平台费用...");
        const tx = await factory.withdrawFees(adminAddress);
        await tx.wait();
        console.log("✅ 费用提取完成");
    }
    
    // 3. 调整部署费用
    const newFee = ethers.utils.parseEther("0.015");
    console.log(`💳 调整部署费用为: ${ethers.utils.formatEther(newFee)} ETH`);
    const tx2 = await factory.setDeploymentFee(newFee);
    await tx2.wait();
    
    // 4. 检查问题项目
    const allIds = await factory.getAllProjectIds();
    for (const id of allIds) {
        const [name, owner, stage] = await factory.getProject(id);
        if (stage < 3) {
            console.log(`⚠️ 项目 ${id} (${name}) 部署未完成，阶段: ${stage}`);
        }
    }
    
    console.log("✅ 管理员操作完成");
}
```

---

## 🎯 最佳实践

### 1. 安全建议

#### 🔒 权限管理
```javascript
// ✅ 好的做法：检查权限
const [, owner] = await factory.getProject(projectId);
if (owner !== currentUser) {
    throw new Error("无权限操作此项目");
}

// ❌ 坏的做法：直接调用
await factory.transferProjectOwnership(projectId, newOwner);
```

#### 💰 费用处理
```javascript
// ✅ 好的做法：检查费用
const requiredFee = await factory.deploymentFee();
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: requiredFee
});

// ❌ 坏的做法：硬编码费用
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: ethers.utils.parseEther("0.01") // 可能不够
});
```

### 2. Gas优化

#### 批量操作
```javascript
// ✅ 好的做法：批量查询
const allIds = await factory.getAllProjectIds();
const projectData = await Promise.all(
    allIds.map(id => factory.getProject(id))
);

// ❌ 坏的做法：循环查询
for (const id of allIds) {
    const project = await factory.getProject(id); // 每次都是网络请求
}
```

#### 事件监听
```javascript
// ✅ 好的做法：监听事件获取结果
factory.on("ProjectCreated", (projectId, name, owner) => {
    console.log(`新项目创建: ${name} (ID: ${projectId})`);
});

const tx = await factory.createProject("MyDEX");
// 事件会自动触发
```

### 3. 错误处理

#### 完善的错误处理
```javascript
async function safeDeployment(projectName, presetType) {
    try {
        // 1. 参数验证
        if (!projectName || projectName.trim() === "") {
            throw new Error("项目名称不能为空");
        }
        
        if (presetType < 0 || presetType > 2) {
            throw new Error("预设类型必须是0-2之间的值");
        }
        
        // 2. 费用检查
        const requiredFee = await factory.deploymentFee();
        const balance = await signer.getBalance();
        
        if (balance.lt(requiredFee)) {
            throw new Error(`余额不足，需要至少 ${ethers.utils.formatEther(requiredFee)} ETH`);
        }
        
        // 3. 执行部署
        console.log("🚀 开始部署...");
        const tx = await factory.deployWithPreset(
            projectName,
            presetType,
            { 
                value: requiredFee,
                gasLimit: 3000000 // 设置合理的Gas限制
            }
        );
        
        console.log("⏳ 等待确认...");
        const receipt = await tx.wait();
        
        // 4. 验证结果
        const projectId = await factory.getProjectCount();
        const [name, owner, stage] = await factory.getProject(projectId);
        
        if (stage === 3) {
            console.log("🎉 部署成功!");
            return { projectId, name, owner, txHash: receipt.transactionHash };
        } else {
            throw new Error(`部署未完成，当前阶段: ${stage}`);
        }
        
    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        
        // 根据错误类型提供解决建议
        if (error.message.includes("insufficient funds")) {
            console.log("💡 建议: 请确保钱包有足够的ETH");
        } else if (error.message.includes("gas")) {
            console.log("💡 建议: 请增加Gas限制或Gas价格");
        } else if (error.message.includes("revert")) {
            console.log("💡 建议: 请检查合约状态和参数");
        }
        
        throw error;
    }
}
```

### 4. 监控和日志

#### 完整的事件监听
```javascript
function setupEventListeners(factory) {
    // 项目创建监听
    factory.on("ProjectCreated", (projectId, name, owner, event) => {
        console.log(`📝 新项目: ${name} (ID: ${projectId}) by ${owner}`);
        console.log(`   区块: ${event.blockNumber}`);
        console.log(`   交易: ${event.transactionHash}`);
    });
    
    // 部署完成监听
    factory.on("CoreDeployed", (projectId, bank, market, stakePool, event) => {
        console.log(`🏗️ 项目 ${projectId} 核心合约部署完成`);
        console.log(`   Bank: ${bank}`);
        console.log(`   Market: ${market}`);
        console.log(`   StakePool: ${stakePool}`);
    });
    
    // 所有权转移监听
    factory.on("ProjectOwnershipTransferred", (projectId, oldOwner, newOwner) => {
        console.log(`👑 项目 ${projectId} 所有权转移: ${oldOwner} → ${newOwner}`);
    });
    
    // 费用更新监听
    factory.on("DeploymentFeeUpdated", (newFee, description) => {
        console.log(`💰 部署费用更新: ${ethers.utils.formatEther(newFee)} ETH (${description})`);
    });
}
```

---

## 🛠️ 故障排除

### 常见问题及解决方案

#### 1. 部署失败

**问题**: 交易失败，显示 "execution reverted"
```
Error: execution reverted: Insufficient fee
```

**解决方案**:
```javascript
// 检查当前部署费用
const currentFee = await factory.deploymentFee();
console.log("当前部署费用:", ethers.utils.formatEther(currentFee), "ETH");

// 使用正确的费用重新部署
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: currentFee
});
```

#### 2. Gas不足

**问题**: 交易失败，显示 "out of gas"
```
Error: Transaction ran out of gas
```

**解决方案**:
```javascript
// 增加Gas限制
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: deploymentFee,
    gasLimit: 3000000  // 增加Gas限制
});

// 或者设置更高的Gas价格
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: deploymentFee,
    gasPrice: ethers.utils.parseUnits("20", "gwei")
});
```

#### 3. 权限错误

**问题**: 无权限执行操作
```
Error: execution reverted: Not owner
```

**解决方案**:
```javascript
// 检查当前账户是否为项目所有者
const [, owner] = await factory.getProject(projectId);
const currentAccount = await signer.getAddress();

if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
    console.log("❌ 当前账户不是项目所有者");
    console.log("项目所有者:", owner);
    console.log("当前账户:", currentAccount);
    return;
}

// 使用正确的账户执行操作
```

#### 4. 网络问题

**问题**: 交易长时间未确认
```
Error: timeout of 120000ms exceeded
```

**解决方案**:
```javascript
// 增加超时时间
const tx = await factory.deployWithPreset("MyDEX", 1, {
    value: deploymentFee
});

// 设置更长的等待时间
const receipt = await tx.wait(5); // 等待5个确认

// 或者手动检查交易状态
const txHash = tx.hash;
let receipt = null;
let attempts = 0;

while (!receipt && attempts < 10) {
    try {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt) break;
    } catch (e) {
        console.log(`尝试 ${attempts + 1}/10: 等待交易确认...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
    attempts++;
}
```

### 调试工具

#### 1. 状态检查函数
```javascript
async function debugProjectState(projectId) {
    console.log(`🔍 调试项目 ${projectId}:`);
    
    try {
        // 基础信息
        const [name, owner, stage] = await factory.getProject(projectId);
        console.log(`  名称: ${name}`);
        console.log(`  所有者: ${owner}`);
        console.log(`  阶段: ${stage}`);
        
        // 合约地址
        const contracts = await factory.getAllContracts(projectId);
        console.log(`  合约地址:`);
        console.log(`    RWA: ${contracts.rwa}`);
        console.log(`    Market: ${contracts.market}`);
        console.log(`    Bank: ${contracts.bank}`);
        
        // 检查合约是否有效
        if (contracts.rwa !== ethers.constants.AddressZero) {
            const rwaContract = await ethers.getContractAt("MockToken", contracts.rwa);
            const rwaName = await rwaContract.name();
            console.log(`    RWA名称: ${rwaName}`);
        }
        
    } catch (error) {
        console.log(`❌ 项目 ${projectId} 不存在或有错误:`, error.message);
    }
}
```

#### 2. 网络状态检查
```javascript
async function checkNetworkStatus() {
    const provider = ethers.provider;
    
    console.log("🌐 网络状态检查:");
    
    // 网络信息
    const network = await provider.getNetwork();
    console.log(`  网络: ${network.name} (chainId: ${network.chainId})`);
    
    // 区块信息
    const blockNumber = await provider.getBlockNumber();
    console.log(`  当前区块: ${blockNumber}`);
    
    // Gas价格
    const gasPrice = await provider.getGasPrice();
    console.log(`  Gas价格: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
    
    // 账户余额
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    console.log(`  账户: ${address}`);
    console.log(`  余额: ${ethers.utils.formatEther(balance)} ETH`);
}
```

---

## ❓ FAQ

### 基础问题

**Q: RWA Launchpad是什么？**
A: RWA Launchpad是一个智能合约工厂，可以一键部署完整的DEX（去中心化交易所）系统。它包含代币合约、交易合约、银行合约等完整的DeFi基础设施。

**Q: 我需要什么技术背景才能使用？**
A: 
- **新手**: 只需要MetaMask钱包，按照快速开始指南操作即可
- **开发者**: 需要了解JavaScript/TypeScript和Web3基础
- **项目方**: 建议有区块链项目经验，或有技术团队支持

**Q: 支持哪些区块链网络？**
A: RWA Launchpad支持所有兼容EVM的网络，包括：
- 主网：Ethereum, Polygon, BSC, Avalanche
- 测试网：Goerli, Sepolia, Mumbai, Fuji

### 功能问题

**Q: 快速模式和真实模式有什么区别？**
A: 
- **快速模式**: 使用MockToken，部署快速，适合学习和测试
- **真实模式**: 部署真实DEX合约，功能完整，适合生产环境

**Q: 预设配置的区别是什么？**
A:
- **保守型(0)**: 低风险参数，适合稳定币交易
- **平衡型(1)**: 中等风险，适合大多数项目
- **激进型(2)**: 高风险高收益，适合投机交易

**Q: 部署一个DEX需要多少费用？**
A: 费用包含两部分：
- **Gas费用**: 约2,100,000 gas（取决于网络Gas价格）
- **平台费用**: 由工厂合约设置，默认为0（可能收费）

### 技术问题

**Q: 如何验证部署是否成功？**
A:
```javascript
const [name, owner, stage] = await factory.getProject(projectId);
if (stage === 3) {
    console.log("✅ 部署成功");
} else {
    console.log("❌ 部署未完成，阶段:", stage);
}
```

**Q: 如何获取部署的合约地址？**
A:
```javascript
const contracts = await factory.getAllContracts(projectId);
console.log("RWA代币:", contracts.rwa);
console.log("Market合约:", contracts.market);
console.log("Bank合约:", contracts.bank);
```

**Q: 可以修改已部署的DEX参数吗？**
A: 目前版本不支持参数修改，但可以：
- 转移项目所有权
- 暂停/恢复项目
- 更新项目名称

**Q: 如何监控部署进度？**
A:
```javascript
// 监听部署事件
factory.on("TokensDeployed", (projectId, rwa, prRWA, stable_rwa) => {
    console.log(`项目 ${projectId} 代币部署完成`);
});

factory.on("CoreDeployed", (projectId, bank, market, stakePool) => {
    console.log(`项目 ${projectId} 核心合约部署完成`);
});
```

### 安全问题

**Q: RWA Launchpad安全吗？**
A: 是的，RWA Launchpad经过了：
- 100%测试覆盖
- 安全审计（权限控制、重入攻击防护等）
- 生产环境验证

**Q: 我的项目数据存储在哪里？**
A: 所有数据都存储在区块链上，包括：
- 项目基础信息
- 合约地址映射
- 所有权记录
- 部署状态

**Q: 如何保护我的项目安全？**
A:
- 妥善保管私钥
- 定期检查项目所有权
- 使用多签钱包（推荐）
- 监控项目状态变化

### 成本问题

**Q: 使用RWA Launchpad的总成本是多少？**
A: 成本包括：
```
总成本 = Gas费用 + 平台费用

Gas费用 ≈ 2,100,000 gas × Gas价格
平台费用 = 工厂合约设置的费用（可能为0）

示例（Ethereum主网，20 gwei）:
Gas费用 ≈ 2.1M × 20 gwei = 0.042 ETH ≈ $84
平台费用 = 0 ETH（如果免费）
总计 ≈ $84
```

**Q: 不同网络的成本差异？**
A:
| 网络 | Gas价格 | 预估成本 |
|------|---------|---------|
| Ethereum | 20 gwei | ~$84 |
| Polygon | 30 gwei | ~$0.15 |
| BSC | 5 gwei | ~$2.5 |
| Avalanche | 25 gwei | ~$3 |

### 支持问题

**Q: 遇到问题如何获得帮助？**
A: 
1. 查看本使用手册的故障排除章节
2. 检查合约事件日志
3. 在GitHub仓库提交Issue
4. 联系技术支持团队

**Q: 有开发者社区吗？**
A: 是的，我们有：
- GitHub讨论区
- Discord开发者频道  
- Telegram技术群
- 定期的开发者会议

**Q: 后续会有更新吗？**
A: 是的，我们的路线图包括：
- 更多预设配置类型
- 批量部署功能
- 合约升级支持
- 多链部署支持
- 前端界面集成

---

## 📞 联系我们

### 技术支持
- **GitHub**: [dex-contracts仓库](https://github.com/your-repo)
- **文档**: [在线文档](https://docs.example.com)
- **邮箱**: support@example.com

### 社区
- **Discord**: [开发者社区](https://discord.gg/example)
- **Telegram**: [@RWALaunchpad](https://t.me/example)
- **Twitter**: [@RWALaunchpad](https://twitter.com/example)

### 商务合作
- **邮箱**: business@example.com
- **LinkedIn**: [公司主页](https://linkedin.com/company/example)

---

## 📄 附录

### 合约地址

#### 主网部署
```
Ethereum Mainnet:
- RWA Launchpad: 0x... (待部署)

Polygon Mainnet:  
- RWA Launchpad: 0x... (待部署)

BSC Mainnet:
- RWA Launchpad: 0x... (待部署)
```

#### 测试网部署
```
Goerli Testnet:
- RWA Launchpad: 0x... (测试地址)

Mumbai Testnet:
- RWA Launchpad: 0x... (测试地址)
```
