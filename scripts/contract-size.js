const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 检查合约大小...\n");
    
    // 合约大小限制
    const EVM_BYTECODE_LIMIT = 24576; // 24KB
    const EVM_INIT_CODE_LIMIT = 49152; // 48KB
    
    // 要检查的合约列表
    const contracts = [
        "RWALaunchpad",
        "DEXDeploymentEngine",
        "ContractBuilder",
        "ProjectFactory",
        "ProjectFactoryUltraLite"
    ];
    
    for (const contractName of contracts) {
        try {
            console.log(`📋 检查 ${contractName}:`);
            
            const ContractFactory = await ethers.getContractFactory(contractName);
            const bytecode = ContractFactory.bytecode;
            const deployedBytecode = ContractFactory.deployedBytecode;
            
            const initCodeSize = bytecode.length / 2 - 1; // 去掉0x前缀，每2个字符1字节
            const runtimeCodeSize = deployedBytecode.length / 2 - 1;
            
            console.log(`   初始化代码大小: ${initCodeSize.toLocaleString()} bytes`);
            console.log(`   运行时代码大小: ${runtimeCodeSize.toLocaleString()} bytes`);
            
            // 检查限制
            const initCodeStatus = initCodeSize <= EVM_INIT_CODE_LIMIT ? "✅" : "❌";
            const runtimeCodeStatus = runtimeCodeSize <= EVM_BYTECODE_LIMIT ? "✅" : "❌";
            
            console.log(`   初始化代码限制: ${initCodeStatus} (${initCodeSize}/${EVM_INIT_CODE_LIMIT})`);
            console.log(`   运行时代码限制: ${runtimeCodeStatus} (${runtimeCodeSize}/${EVM_BYTECODE_LIMIT})`);
            
            if (initCodeSize > EVM_INIT_CODE_LIMIT) {
                console.log(`   ⚠️  超出初始化代码限制 ${((initCodeSize / EVM_INIT_CODE_LIMIT - 1) * 100).toFixed(1)}%`);
            }
            
            if (runtimeCodeSize > EVM_BYTECODE_LIMIT) {
                console.log(`   ⚠️  超出运行时代码限制 ${((runtimeCodeSize / EVM_BYTECODE_LIMIT - 1) * 100).toFixed(1)}%`);
            }
            
            console.log("");
            
        } catch (error) {
            console.log(`   ⚠️  合约 ${contractName} 不存在或编译失败`);
            console.log("");
        }
    }
    
    console.log("🎯 大小检查完成!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 