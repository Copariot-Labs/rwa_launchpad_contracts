# RWA Launchpad - 系统指南

## 📋 系统概述

RWA Launchpad是一个完整的DEX工厂化部署系统，能够为任何项目一键创建独立的DEX交易系统。每个项目将获得：

- **3个代币合约**: RWA(主代币)、prRWA(质押代币)、StableRwa(订单代币)
- **4个核心合约**: Bank(银行)、Market(交易市场)、StakePool(质押池)、Helper(辅助工具)
- **1个拍卖合约**: GLA(可选)
- **完整的管理系统**: 项目注册、状态管理、查询统计

## 🏗️ 系统架构

```
RWA Launchpad (主工厂合约)
├── 参数配置系统
├── 项目注册管理
├── 代币工厂系统
└── 核心合约工厂
```

## 🚀 快速开始

### 1. 部署工厂系统

```javascript
// 1. 部署主工厂合约
const RWALaunchpad = await ethers.getContractFactory("RWALaunchpad");
const factory = await RWALaunchpad.deploy();
await factory.deployed();

console.log("RWA Launchpad deployed to:", factory.address);
```

### 2. 创建你的第一个DEX项目

#### 方式一：使用预设配置（推荐新手）

```javascript
// 使用平衡型配置创建项目
const tx = await factory.deployWithPreset(
    "MyDeFiProject",     // 项目名称
    1                    // 配置类型: 0=保守型, 1=平衡型, 2=激进型
);

const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === 'ProjectCreated');
const projectId = event.args.projectId;

console.log("项目创建成功！Project ID:", projectId);
```

#### 方式二：完全自定义配置（高级用户）

```javascript
// 自定义配置参数
const config = {
    // 代币配置
    rwaName: "MyToken",
    rwaSymbol: "MTK",
    prRWAName: "Staked MyToken",
    prRWASymbol: "sMTK",
    
    // 费率配置
    borrowFee: 200,          // 2% 借款费
    buyFee: 100,             // 1% 买入费
    sellFee: 150,            // 1.5% 卖出费
    
    // 质押奖励
    mintPercentPerDay: 50    // 0.5%/天 铸币奖励
};

// 创建项目
const tx = await factory.deployWithConfig("MyCustomProject", config);
```

## 📊 预设配置说明

### 保守型配置 (Conservative)
- **适用场景**: 稳定币项目、风险厌恶型项目
- **特点**: 低费率、低波动、稳定收益
- **参数特色**:
  - 借款费: 1%
  - 交易费: 0.5%
  - 日铸币率: 0.2%

### 平衡型配置 (Balanced)
- **适用场景**: 大多数DeFi项目
- **特点**: 平衡的费率和收益
- **参数特色**:
  - 借款费: 2%
  - 交易费: 1%
  - 日铸币率: 0.5%

### 激进型配置 (Aggressive)
- **适用场景**: 高收益项目、风险偏好型
- **特点**: 高费率、高收益、高波动
- **参数特色**:
  - 借款费: 3%
  - 交易费: 1.5%
  - 日铸币率: 1%

## 🔧 核心功能

### 项目管理系统
- 项目创建和注册
- 生命周期管理
- 所有权控制
- 状态查询

### 部署模式
- **快速模式**: 使用MockToken进行原型验证
- **真实模式**: 部署完整的生产级合约

### 查询接口
- 项目信息查询
- 合约地址查询
- 统计和分页
- 用户项目查询

## 📈 使用场景

### 开发者
- 快速原型验证
- 功能测试
- 学习DEX原理

### 项目方
- 正式DEX部署
- 生产环境使用
- 项目扩展

### 投资机构
- 批量项目部署
- 多项目管理
- 投资组合构建

## 🔒 安全特性

- 权限控制
- 输入验证
- 重入防护
- 事件日志

## 🚀 部署网络

支持所有EVM兼容网络：
- Ethereum
- Polygon
- BSC
- Avalanche
- 测试网络

## 📞 技术支持

- 文档: 完整的使用手册和API参考
- 测试: 100%测试覆盖
- 社区: 活跃的开发者社区 