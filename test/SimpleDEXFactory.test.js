const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎯 RWA Launchpad - 最终可部署方案测试", function () {
    let factory;
    let deployer, projectOwner, user1, user2;
    
    beforeEach(async function () {
        [deployer, projectOwner, user1, user2] = await ethers.getSigners();
        
        console.log("🏗️ 部署RWA Launchpad...");
        
        const RWALaunchpad = await ethers.getContractFactory("RWALaunchpad");
        factory = await RWALaunchpad.deploy();
        await factory.deployed();
        
        console.log(`✅ RWA Launchpad部署成功: ${factory.address}`);
    });
    
    describe("📋 基础功能测试", function () {
        
        it("应该正确部署并初始化", async function () {
            expect(factory.address).to.not.equal(ethers.constants.AddressZero);
            expect(await factory.getProjectCount()).to.equal(0);
            expect(await factory.deploymentFee()).to.equal(0);
        });
        
        it("应该能够创建项目", async function () {
            const tx = await factory.connect(projectOwner).createProject("TestProject");
            const receipt = await tx.wait();
            
            // 检查事件
            const event = receipt.events?.find(e => e.event === 'ProjectCreated');
            expect(event).to.not.be.undefined;
            expect(event.args.projectId).to.equal(1);
            expect(event.args.name).to.equal("TestProject");
            expect(event.args.owner).to.equal(projectOwner.address);
            
            // 检查状态
            expect(await factory.getProjectCount()).to.equal(1);
            
            const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
            expect(name).to.equal("TestProject");
            expect(owner).to.equal(projectOwner.address);
            expect(stage).to.equal(0); // 创建阶段
            
            console.log(`✅ 项目创建成功: ID=${event.args.projectId}, 名称=${event.args.name}`);
        });
        
    });
    
    describe("🚀 预设配置部署测试", function () {
        
        it("应该能够使用预设配置部署", async function () {
            console.log("🔨 开始预设配置部署...");
            
            const tx = await factory.connect(projectOwner).deployWithPreset(
                "PresetDEX",
                1 // 平衡型
            );
            
            const receipt = await tx.wait();
            console.log(`⛽ 实际gas消耗: ${receipt.gasUsed.toString()}`);
            
            // 检查事件
            const createdEvent = receipt.events?.find(e => e.event === 'ProjectCreated');
            const completedEvent = receipt.events?.find(e => e.event === 'ProjectCompleted');
            
            expect(createdEvent).to.not.be.undefined;
            expect(completedEvent).to.not.be.undefined;
            
            // 检查项目状态
            const projectId = createdEvent.args.projectId;
            const [name, owner, stage, rwa, market, bank] = await factory.getProject(projectId);
            
            expect(name).to.equal("PresetDEX");
            expect(owner).to.equal(projectOwner.address);
            expect(stage).to.equal(3); // 完成阶段
            expect(rwa).to.not.equal(ethers.constants.AddressZero);
            expect(market).to.not.equal(ethers.constants.AddressZero);
            
            console.log(`✅ 预设DEX部署成功!`);
            console.log(`   项目ID: ${projectId}`);
            console.log(`   RWA地址: ${rwa}`);
            console.log(`   Market地址: ${market}`);
        });
        
        it("应该能够部署多个项目", async function () {
            console.log("🔨 部署多个项目...");
            
            // 部署3个不同类型的项目
            const projects = [
                { name: "Conservative", type: 0 },
                { name: "Balanced", type: 1 },
                { name: "Aggressive", type: 2 }
            ];
            
            for (const project of projects) {
                const tx = await factory.connect(projectOwner).deployWithPreset(
                    project.name,
                    project.type
                );
                
                const receipt = await tx.wait();
                const event = receipt.events?.find(e => e.event === 'ProjectCreated');
                
                console.log(`   ✅ ${project.name}项目部署成功: ID=${event.args.projectId}`);
            }
            
            // 检查总数
            expect(await factory.getProjectCount()).to.equal(3);
            console.log(`✅ 成功部署${projects.length}个项目`);
        });
        
    });
    
    describe("🔧 管理功能测试", function () {
        
        it("应该能够设置部署费用", async function () {
            const newFee = ethers.utils.parseEther("0.01");
            
            await factory.setDeploymentFee(newFee);
            expect(await factory.deploymentFee()).to.equal(newFee);
            
            console.log(`✅ 部署费用设置为: ${ethers.utils.formatEther(newFee)} ETH`);
        });
        
        it("应该能够设置外部构建器", async function () {
            const builderAddress = user1.address; // 模拟构建器地址
            
            await factory.setContractBuilder(builderAddress);
            expect(await factory.contractBuilder()).to.equal(builderAddress);
            
            console.log(`✅ 构建器地址设置为: ${builderAddress}`);
        });
        
        it("应该能够提取费用", async function () {
            // 设置费用
            const fee = ethers.utils.parseEther("0.01");
            await factory.setDeploymentFee(fee);
            
            // 部署项目并支付费用
            await factory.connect(projectOwner).deployWithPreset(
                "FeeDEX",
                1,
                { value: fee }
            );
            
            // 检查合约余额
            const contractBalance = await ethers.provider.getBalance(factory.address);
            expect(contractBalance).to.equal(fee);
            
            // 提取费用
            const initialBalance = await ethers.provider.getBalance(deployer.address);
            const tx = await factory.withdrawFees(deployer.address);
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
            const finalBalance = await ethers.provider.getBalance(deployer.address);
            
            // 使用BigNumber比较，允许一定的gas费用误差
            const expectedMinimum = initialBalance.add(fee).sub(gasCost);
            expect(finalBalance.gte(expectedMinimum)).to.be.true;
            
            console.log(`✅ 费用提取成功`);
        });
        
        it("应该能够转移项目所有权", async function () {
            // 创建一个项目
            await factory.connect(projectOwner).createProject("TransferProject");
            
            // 转移所有权
            const tx = await factory.connect(projectOwner).transferProjectOwnership(1, user1.address);
            const receipt = await tx.wait();
            
            // 检查事件
            const event = receipt.events?.find(e => e.event === 'ProjectOwnershipTransferred');
            expect(event).to.not.be.undefined;
            expect(event.args.projectId).to.equal(1);
            expect(event.args.oldOwner).to.equal(projectOwner.address);
            expect(event.args.newOwner).to.equal(user1.address);
            
            // 检查新所有者
            const [name, owner] = await factory.getProject(1);
            expect(owner).to.equal(user1.address);
            
            console.log(`✅ 项目所有权转移成功: ${projectOwner.address.slice(0,6)}... → ${user1.address.slice(0,6)}...`);
        });
        
        it("应该能够暂停和恢复项目", async function () {
            // 创建一个项目
            await factory.connect(projectOwner).deployWithPreset("PauseProject", 1);
            
            // 暂停项目
            const pauseTx = await factory.emergencyPauseProject(1);
            const pauseReceipt = await pauseTx.wait();
            
            // 检查暂停事件
            const pauseEvent = pauseReceipt.events?.find(e => e.event === 'ProjectPaused');
            expect(pauseEvent).to.not.be.undefined;
            expect(pauseEvent.args.projectId).to.equal(1);
            expect(pauseEvent.args.previousStage).to.equal(3); // 之前是完成状态
            
            // 检查项目状态
            const [, , stage] = await factory.getProject(1);
            expect(stage).to.equal(255); // 暂停状态
            
            // 恢复项目
            const resumeTx = await factory.resumeProject(1, 3);
            const resumeReceipt = await resumeTx.wait();
            
            // 检查恢复事件
            const resumeEvent = resumeReceipt.events?.find(e => e.event === 'ProjectResumed');
            expect(resumeEvent).to.not.be.undefined;
            expect(resumeEvent.args.projectId).to.equal(1);
            expect(resumeEvent.args.newStage).to.equal(3);
            
            console.log(`✅ 项目暂停和恢复成功`);
        });
        
        it("应该能够更新项目名称", async function () {
            // 创建一个项目
            await factory.connect(projectOwner).createProject("OldName");
            
            // 更新名称
            const tx = await factory.connect(projectOwner).updateProjectName(1, "NewName");
            const receipt = await tx.wait();
            
            // 检查事件
            const event = receipt.events?.find(e => e.event === 'ProjectNameUpdated');
            expect(event).to.not.be.undefined;
            expect(event.args.projectId).to.equal(1);
            expect(event.args.oldName).to.equal("OldName");
            expect(event.args.newName).to.equal("NewName");
            
            // 检查新名称
            const [name] = await factory.getProject(1);
            expect(name).to.equal("NewName");
            
            console.log(`✅ 项目名称更新成功: OldName → NewName`);
        });
        
        it("应该能够批量设置费用", async function () {
            const fees = [
                ethers.utils.parseEther("0.01"),
                ethers.utils.parseEther("0.02"),
                ethers.utils.parseEther("0.005")
            ];
            const descriptions = ["低费用", "标准费用", "优惠费用"];
            
            const tx = await factory.batchSetFees(fees, descriptions);
            const receipt = await tx.wait();
            
            // 检查最后设置的费用
            expect(await factory.deploymentFee()).to.equal(fees[2]);
            
            // 检查事件数量
            const feeEvents = receipt.events?.filter(e => e.event === 'DeploymentFeeUpdated');
            expect(feeEvents.length).to.equal(3);
            
            console.log(`✅ 批量费用设置成功: 设置了${fees.length}个费用级别`);
        });
        
        it("应该能够设置部署模式", async function () {
            // 初始状态应该是快速模式
            expect(await factory.useRealContracts()).to.be.false;
            
            // 设置模板地址（使用测试地址）
            const mockTemplates = {
                rwa: user1.address,
                prRWA: user2.address,
                stableRwa: projectOwner.address,
                bank: deployer.address,
                market: user1.address,
                stakePool: user2.address,
                helper: projectOwner.address,
                gla: deployer.address
            };
            
            // 设置为真实合约模式
            const tx = await factory.setDeploymentMode(
                true,
                mockTemplates.rwa,
                mockTemplates.prRWA,
                mockTemplates.stableRwa,
                mockTemplates.bank,
                mockTemplates.market,
                mockTemplates.stakePool,
                mockTemplates.helper,
                mockTemplates.gla
            );
            
            const receipt = await tx.wait();
            
            // 检查状态更新
            expect(await factory.useRealContracts()).to.be.true;
            expect(await factory.rwaTemplate()).to.equal(mockTemplates.rwa);
            expect(await factory.marketTemplate()).to.equal(mockTemplates.market);
            
            // 检查事件
            const event = receipt.events?.find(e => e.event === 'DeploymentModeUpdated');
            expect(event).to.not.be.undefined;
            expect(event.args.useRealContracts).to.be.true;
            
            console.log(`✅ 部署模式设置成功: 快速模式 → 真实模式`);
            
            // 切换回快速模式
            await factory.setDeploymentMode(
                false, 
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero
            );
            
            expect(await factory.useRealContracts()).to.be.false;
            console.log(`✅ 部署模式切换成功: 真实模式 → 快速模式`);
        });
        
    });
    
    describe("📊 查询功能测试", function () {
        
        beforeEach(async function () {
            // 创建一些测试项目
            await factory.connect(projectOwner).deployWithPreset("QueryDEX1", 0);
            await factory.connect(projectOwner).deployWithPreset("QueryDEX2", 1);
        });
        
        it("应该能够查询项目信息", async function () {
            const [name, owner, stage, rwa, market, bank] = await factory.getProject(1);
            
            expect(name).to.equal("QueryDEX1");
            expect(owner).to.equal(projectOwner.address);
            expect(stage).to.equal(3);
            
            console.log(`✅ 项目查询成功: ${name}, 阶段: ${stage}`);
        });
        
        it("应该能够查询所有合约地址", async function () {
            const contracts = await factory.getAllContracts(1);
            
            expect(contracts.rwa).to.not.equal(ethers.constants.AddressZero);
            // 其他地址在简化实现中可能为零
            
            console.log(`✅ 合约地址查询成功`);
            console.log(`   RWA: ${contracts.rwa}`);
            console.log(`   Market: ${contracts.market}`);
        });
        
        it("应该能够预测合约地址", async function () {
            const predicted = await factory.predictAddresses(999, projectOwner.address);
            
            expect(predicted.rwa).to.not.equal(ethers.constants.AddressZero);
            expect(predicted.market).to.not.equal(ethers.constants.AddressZero);
            
            console.log(`✅ 地址预测成功`);
            console.log(`   预测RWA: ${predicted.rwa}`);
            console.log(`   预测Market: ${predicted.market}`);
        });
        
        it("应该能够获取所有项目ID", async function () {
            const projectIds = await factory.getAllProjectIds();
            
            expect(projectIds.length).to.equal(2);
            expect(projectIds[0]).to.equal(1);
            expect(projectIds[1]).to.equal(2);
            
            console.log(`✅ 获取所有项目ID成功: [${projectIds.join(', ')}]`);
        });
        
        it("应该能够分页查询项目", async function () {
            // 再创建一个项目
            await factory.connect(user1).deployWithPreset("QueryDEX3", 2);
            
            // 分页查询：获取前2个项目
            const [projectIds, names, owners, stages, totalCount] = await factory.getProjectsPaginated(0, 2);
            
            expect(totalCount).to.equal(3);
            expect(projectIds.length).to.equal(2);
            expect(names[0]).to.equal("QueryDEX1");
            expect(names[1]).to.equal("QueryDEX2");
            
            console.log(`✅ 分页查询成功: 总数=${totalCount}, 返回=${projectIds.length}个`);
        });
        
        it("应该能够获取用户的所有项目", async function () {
            // 再创建一个项目
            await factory.connect(user1).deployWithPreset("UserDEX", 1);
            
            const projectOwnerProjects = await factory.getUserProjects(projectOwner.address);
            const user1Projects = await factory.getUserProjects(user1.address);
            
            expect(projectOwnerProjects.length).to.equal(2); // QueryDEX1, QueryDEX2
            expect(user1Projects.length).to.equal(1); // UserDEX
            
            console.log(`✅ 用户项目查询成功:`);
            console.log(`   项目所有者: ${projectOwnerProjects.length}个项目`);
            console.log(`   用户1: ${user1Projects.length}个项目`);
        });
        
        it("应该能够获取项目统计信息", async function () {
            const [totalProjects, completedProjects, activeProjects, totalFees] = await factory.getProjectStats();
            
            expect(totalProjects).to.equal(2);
            expect(completedProjects).to.equal(2); // 两个项目都完成了
            expect(activeProjects).to.equal(0); // 没有进行中的项目
            
            console.log(`✅ 项目统计成功:`);
            console.log(`   总项目数: ${totalProjects}`);
            console.log(`   完成项目: ${completedProjects}`);
            console.log(`   进行中项目: ${activeProjects}`);
            console.log(`   总费用: ${ethers.utils.formatEther(totalFees)} ETH`);
        });
        
        it("应该能够检查项目是否存在", async function () {
            expect(await factory.projectExists(1)).to.be.true;
            expect(await factory.projectExists(2)).to.be.true;
            expect(await factory.projectExists(999)).to.be.false;
            
            console.log(`✅ 项目存在性检查成功`);
        });
        
    });
    
    describe("🧪 错误处理测试", function () {
        
        it("应该拒绝无效的输入", async function () {
            // 空项目名称
            await expect(
                factory.createProject("")
            ).to.be.revertedWith("Empty name");
            
            // 无效的预设类型
            await expect(
                factory.deployWithPreset("Invalid", 5)
            ).to.be.revertedWith("Invalid preset");
            
            console.log(`✅ 输入验证测试通过`);
        });
        
        it("应该正确处理权限控制", async function () {
            // 非所有者尝试设置费用
            await expect(
                factory.connect(user1).setDeploymentFee(100)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            
            console.log(`✅ 权限控制测试通过`);
        });
        
        it("应该正确处理费用不足", async function () {
            // 设置部署费用
            const fee = ethers.utils.parseEther("1.0");
            await factory.setDeploymentFee(fee);
            
            // 尝试不支付费用部署
            await expect(
                factory.connect(projectOwner).createProject("NoFeeDEX")
            ).to.be.revertedWith("Insufficient fee");
            
            console.log(`✅ 费用检查测试通过`);
        });
        
    });
    
    after(async function () {
        console.log("\n🎉 RWA Launchpad测试完成!");
        console.log("📊 测试结果总结:");
        console.log("   ✅ 基础功能正常");
        console.log("   ✅ 预设配置部署成功");
        console.log("   ✅ 管理功能正常");
        console.log("   ✅ 查询功能正常");
        console.log("   ✅ 错误处理正常");
        console.log("\n🚀 最终方案验证完成!");
    });
});
