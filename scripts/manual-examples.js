const { ethers } = require("hardhat");

async function main() {
    console.log("📖 验证使用手册中的代码示例...\n");
    
    // 部署工厂合约
    console.log("🏗️ 部署RWALaunchpad...");
    const RWALaunchpad = await ethers.getContractFactory("RWALaunchpad");
    const factory = await RWALaunchpad.deploy();
    await factory.deployed();
    console.log("✅ 工厂合约部署成功:", factory.address);
    
    // 示例1: 新手快速体验
    console.log("\n📝 示例1: 新手快速体验");
    await quickStart(factory);
    
    // 示例2: 查询功能演示
    console.log("\n📊 示例2: 查询功能演示");
    await queryDemo(factory);
    
    // 示例3: 管理功能演示
    console.log("\n🔧 示例3: 管理功能演示");
    await managementDemo(factory);
    
    console.log("\n🎉 所有示例验证完成!");
}

async function quickStart(factory) {
    try {
        console.log("🚀 开始快速体验...");
        
        // 1. 创建项目
        console.log("📝 创建项目...");
        const tx1 = await factory.createProject("我的第一个DEX");
        await tx1.wait();
        
        // 2. 部署DEX (使用平衡型预设)
        console.log("🏗️ 部署DEX...");
        const tx2 = await factory.deployWithPreset("我的第一个DEX", 1);
        const receipt = await tx2.wait();
        
        // 3. 查看结果
        const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
        
        console.log("🎉 部署成功!");
        console.log("项目名称:", name);
        console.log("部署阶段:", stage);
        console.log("RWA代币:", rwa);
        console.log("Gas消耗:", receipt.gasUsed.toString());
        
        return true;
    } catch (error) {
        console.error("❌ 快速体验失败:", error.message);
        return false;
    }
}

async function queryDemo(factory) {
    try {
        console.log("📊 演示查询功能...");
        
        // 基础查询
        const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
        console.log("基础查询结果:");
        console.log("  项目名:", name);
        console.log("  所有者:", owner);
        console.log("  阶段:", stage);
        
        // 获取所有合约地址
        const contracts = await factory.getAllContracts(1);
        console.log("合约地址:");
        console.log("  RWA:", contracts.rwa);
        console.log("  Market:", contracts.market);
        console.log("  Bank:", contracts.bank);
        
        // 获取项目总数
        const totalProjects = await factory.getProjectCount();
        console.log("项目总数:", totalProjects.toString());
        
        // 获取所有项目ID
        const allIds = await factory.getAllProjectIds();
        console.log("所有项目ID:", allIds.map(id => id.toString()));
        
        // 获取统计信息
        const [total, completed, active, totalFees] = await factory.getProjectStats();
        console.log("统计信息:");
        console.log("  总项目:", total.toString());
        console.log("  已完成:", completed.toString());
        console.log("  进行中:", active.toString());
        console.log("  总费用:", ethers.utils.formatEther(totalFees), "ETH");
        
        return true;
    } catch (error) {
        console.error("❌ 查询演示失败:", error.message);
        return false;
    }
}

async function managementDemo(factory) {
    try {
        console.log("🔧 演示管理功能...");
        
        const [deployer, user1] = await ethers.getSigners();
        
        // 检查当前部署费用
        const currentFee = await factory.deploymentFee();
        console.log("当前部署费用:", ethers.utils.formatEther(currentFee), "ETH");
        
        // 设置新的部署费用
        const newFee = ethers.utils.parseEther("0.01");
        console.log("设置新费用:", ethers.utils.formatEther(newFee), "ETH");
        await factory.setDeploymentFee(newFee);
        
        const updatedFee = await factory.deploymentFee();
        console.log("更新后费用:", ethers.utils.formatEther(updatedFee), "ETH");
        
        // 检查部署模式
        const useRealContracts = await factory.useRealContracts();
        console.log("当前模式:", useRealContracts ? "真实模式" : "快速模式");
        
        // 项目存在性检查
        const projectExists = await factory.projectExists(1);
        console.log("项目1是否存在:", projectExists);
        
        // 预测地址功能
        const predicted = await factory.predictAddresses(999, deployer.address);
        console.log("预测的RWA地址:", predicted.rwa);
        console.log("预测的Market地址:", predicted.market);
        
        return true;
    } catch (error) {
        console.error("❌ 管理演示失败:", error.message);
        return false;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 