const { ethers } = require("hardhat");

/**
 * 诚实的RWA Launchpad测试
 * 测试真实的部署情况
 */

async function main() {
    console.log("🔍 RWA Launchpad 诚实测试");
    console.log("=" * 50);
    
    const [deployer, user1] = await ethers.getSigners();
    
    // 1. 部署工厂
    console.log("📋 步骤1: 部署RWA Launchpad");
    const RWALaunchpad = await ethers.getContractFactory("RWALaunchpad");
    const factory = await RWALaunchpad.deploy();
    await factory.deployed();
    
    console.log(`✅ 工厂地址: ${factory.address}`);
    
    // 2. 设置费用并部署项目
    const fee = ethers.utils.parseEther("0.01");
    await factory.setDeploymentFee(fee);
    
    console.log("\n📋 步骤2: 部署一个项目");
    const tx = await factory.connect(user1).deployWithPreset(
        "TestDEX",
        1, // 平衡型
        { value: fee }
    );
    const receipt = await tx.wait();
    
    // 3. 检查项目信息
    const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
    
    console.log("\n🔍 项目信息检查:");
    console.log(`   名称: ${name}`);
    console.log(`   所有者: ${owner}`);
    console.log(`   阶段: ${stage} (3=完成)`);
    console.log(`   RWA地址: ${rwa}`);
    console.log(`   Market地址: ${market}`);
    console.log(`   Bank地址: ${bank}`);
    
    // 4. 检查这些地址到底是什么合约
    console.log("\n🔍 合约类型检查:");
    
    // 检查RWA合约
    try {
        const MockToken = await ethers.getContractFactory("MockToken");
        const rwaToken = MockToken.attach(rwa);
        const rwaName = await rwaToken.name();
        const rwaSymbol = await rwaToken.symbol();
        console.log(`   RWA合约: MockToken`);
        console.log(`     名称: ${rwaName}`);
        console.log(`     符号: ${rwaSymbol}`);
        console.log(`     ❌ 这不是真正的RWA代币！`);
    } catch (error) {
        console.log(`   RWA合约: 无法识别 - ${error.message}`);
    }
    
    // 检查Market合约
    try {
        const MockToken = await ethers.getContractFactory("MockToken");
        const marketToken = MockToken.attach(market);
        const marketName = await marketToken.name();
        const marketSymbol = await marketToken.symbol();
        console.log(`   Market合约: MockToken`);
        console.log(`     名称: ${marketName}`);
        console.log(`     符号: ${marketSymbol}`);
        console.log(`     ❌ 这不是真正的Market合约！`);
    } catch (error) {
        console.log(`   Market合约: 无法识别 - ${error.message}`);
    }
    
    // 检查Bank合约
    try {
        const MockToken = await ethers.getContractFactory("MockToken");
        const bankToken = MockToken.attach(bank);
        const bankName = await bankToken.name();
        const bankSymbol = await bankToken.symbol();
        console.log(`   Bank合约: MockToken`);
        console.log(`     名称: ${bankName}`);
        console.log(`     符号: ${bankSymbol}`);
        console.log(`     ❌ 这不是真正的Bank合约！`);
    } catch (error) {
        console.log(`   Bank合约: 无法识别 - ${error.message}`);
    }
    
    // 5. 检查缺失的合约
    const [, prRWA, stableRwa, , , stakePool, helper] = await factory.getAllContracts(1);
    
    console.log("\n🔍 缺失的合约检查:");
    console.log(`   prRWA: ${prRWA} ${prRWA === ethers.constants.AddressZero ? '❌ 未部署' : '✅ 已部署'}`);
    console.log(`   StableRwa: ${stableRwa} ${stableRwa === ethers.constants.AddressZero ? '❌ 未部署' : '✅ 已部署'}`);
    console.log(`   StakePool: ${stakePool} ${stakePool === ethers.constants.AddressZero ? '❌ 未部署' : '✅ 已部署'}`);
    console.log(`   Helper: ${helper} ${helper === ethers.constants.AddressZero ? '❌ 未部署' : '✅ 已部署'}`);
    
    // 6. 检查预设配置是否真的有效果
    console.log("\n🔍 预设配置检查:");
    
    // 部署不同预设类型的项目
    await factory.connect(user1).deployWithPreset("Conservative", 0, { value: fee });
    await factory.connect(user1).deployWithPreset("Aggressive", 2, { value: fee });
    
    const [, , , rwa1] = await factory.getProject(2); // Conservative
    const [, , , rwa2] = await factory.getProject(3); // Aggressive
    
    const MockToken = await ethers.getContractFactory("MockToken");
    const token1 = MockToken.attach(rwa1);
    const token2 = MockToken.attach(rwa2);
    
    const name1 = await token1.name();
    const name2 = await token2.name();
    
    console.log(`   保守型项目代币名称: ${name1}`);
    console.log(`   激进型项目代币名称: ${name2}`);
    console.log(`   ❓ 预设配置是否真的有区别？名称不同算是有区别吗？`);
    
    // 7. 功能测试
    console.log("\n🔍 实际功能测试:");
    
    // 测试代币是否可以转账
    try {
        const rwaToken = MockToken.attach(rwa);
        const balance = await rwaToken.balanceOf(user1.address);
        console.log(`   用户RWA余额: ${ethers.utils.formatEther(balance)}`);
        
        if (balance.gt(0)) {
            console.log(`   ✅ 代币有余额，可以转账`);
        } else {
            console.log(`   ❌ 代币余额为0，无法测试转账功能`);
        }
    } catch (error) {
        console.log(`   ❌ 代币功能测试失败: ${error.message}`);
    }
    
    // 测试是否有真正的DEX功能
    console.log("\n🔍 DEX功能检查:");
    console.log(`   ❌ 没有真正的交易功能 (Market是MockToken)`);
    console.log(`   ❌ 没有真正的借贷功能 (Bank是MockToken)`);
    console.log(`   ❌ 没有真正的质押功能 (StakePool未部署)`);
    console.log(`   ❌ 没有真正的辅助功能 (Helper未部署)`);
    
    // 8. 诚实的结论
    console.log("\n" + "=" * 50);
    console.log("💔 诚实的测试结论");
    console.log("=" * 50);
    
    console.log("❌ RWA Launchpad的真实情况:");
    console.log("   1. 只部署了3个MockToken，伪装成RWA/Market/Bank");
    console.log("   2. 没有部署真正的prRWA、StableRwa、StakePool、Helper合约");
    console.log("   3. 预设配置只是改变了代币名称，没有真正的参数配置");
    console.log("   4. 没有任何真正的DEX功能 - 无法交易、借贷、质押");
    console.log("   5. 这只是一个项目管理系统，不是真正的DEX工厂");
    
    console.log("\n🤔 这意味着什么:");
    console.log("   - 我之前的集成测试是自欺欺人的");
    console.log("   - 方案0008的核心需求并没有真正实现");
    console.log("   - 只实现了项目管理框架，缺少核心DEX功能");
    console.log("   - 需要大量工作才能变成真正的DEX工厂");
    
    console.log("\n📋 真正需要做的工作:");
    console.log("   1. 集成真正的RWA/prRWA/StableRwa代币合约");
    console.log("   2. 集成真正的Bank/Market/StakePool核心合约");
    console.log("   3. 实现真正的参数配置系统 (使用ProjectParameters.sol)");
    console.log("   4. 添加合约间的依赖关系和初始化");
    console.log("   5. 实现完整的DEX功能验证");
    
    console.log("\n😔 我为之前的误导性报告道歉。");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("测试失败:", error);
        process.exit(1);
    }); 