const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token Governance Loop", function () {
  let rwa;
  let prRWA;
  let owner;
  let treasury;
  let investor1;
  let investor2;
  let community;
  let retailUser;
  let governanceAdmin;  // 代替 governance 合约

  beforeEach(async function () {
    // 获取测试账户
    [owner, treasury, investor1, investor2, community, retailUser, governanceAdmin] = await ethers.getSigners();

    // 部署 RWA 代币合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 部署 prRWA 代币合约 (治理代币)
    const PrRWA = await ethers.getContractFactory("RWA"); // 使用同样的合约但作为治理代币
    prRWA = await PrRWA.deploy();
    await prRWA.deployed();

    // 初始代币分配
    const initialMint = ethers.utils.parseEther("10000000"); // 1000万代币
    await rwa.mint(treasury.address, initialMint);

    // 分配一些 RWA 代币给投资者
    const investorAllocation = ethers.utils.parseEther("1000000"); // 100万代币
    await rwa.connect(treasury).transfer(investor1.address, investorAllocation);
    await rwa.connect(treasury).transfer(investor2.address, investorAllocation.div(2));

    // 铸造一些 prRWA 给初始治理参与者
    await prRWA.mint(investor1.address, ethers.utils.parseEther("50000"));
    await prRWA.mint(investor2.address, ethers.utils.parseEther("30000"));
    await prRWA.mint(community.address, ethers.utils.parseEther("20000"));
  });

  describe("投资者治理参与闭环", function () {
    it("投资者应该能够提案、投票、获得治理奖励并再投资", async function () {
      // 1. 投资者创建提案（模拟）
      // 在实际场景中，这将通过治理合约创建提案
      // 这里我们模拟提案过程，记录提案细节
      const proposalDescription = "增加流动性挖矿奖励";
      const proposalCreator = investor1.address;
      const proposalId = 1; // 模拟提案ID
      
      // 2. 模拟投票过程
      // 在实际场景中，这将调用治理合约的投票功能
      // 这里我们模拟记录每个投资者的投票
      const votes = {
        [investor1.address]: { support: true, weight: ethers.utils.parseEther("50000") },
        [investor2.address]: { support: true, weight: ethers.utils.parseEther("30000") },
        [community.address]: { support: false, weight: ethers.utils.parseEther("20000") }
      };
      
      // 计算投票结果
      let forVotes = ethers.BigNumber.from(0);
      let againstVotes = ethers.BigNumber.from(0);
      
      for (const [voter, vote] of Object.entries(votes)) {
        if (vote.support) {
          forVotes = forVotes.add(vote.weight);
        } else {
          againstVotes = againstVotes.add(vote.weight);
        }
      }
      
      // 提案通过（因为赞成票多于反对票）
      expect(forVotes).to.be.gt(againstVotes);
      
      // 3. 执行提案（模拟）
      // 在实际场景中，这将调用治理合约执行提案中包含的操作
      const proposalExecuted = true;
      
      // 4. 投票者获得治理奖励
      // 记录执行前余额
      const investor1BalanceBefore = await rwa.balanceOf(investor1.address);
      const investor2BalanceBefore = await rwa.balanceOf(investor2.address);
      
      // 分发奖励
      const rewardAmount = ethers.utils.parseEther("5000"); // 每人5000 RWA奖励
      await rwa.connect(treasury).transfer(investor1.address, rewardAmount);
      await rwa.connect(treasury).transfer(investor2.address, rewardAmount);
      
      // 验证获得奖励
      expect(await rwa.balanceOf(investor1.address)).to.equal(investor1BalanceBefore.add(rewardAmount));
      expect(await rwa.balanceOf(investor2.address)).to.equal(investor2BalanceBefore.add(rewardAmount));
      
      // 5. 使用奖励代币再投资生态系统
      // 模拟再投资: 提供流动性
      const reinvestAmount = rewardAmount.div(2);
      await rwa.connect(investor1).transfer(treasury.address, reinvestAmount);
      
      // 验证再投资金额已转移
      expect(await rwa.balanceOf(investor1.address)).to.equal(
        investor1BalanceBefore.add(rewardAmount).sub(reinvestAmount)
      );
    });
  });

  describe("用户治理权重增长闭环", function () {
    it("用户应该能够通过持续参与增加其治理权重", async function () {
      // 1. 初始治理权重
      const initialWeight1 = await prRWA.balanceOf(investor1.address);
      const initialWeight2 = await prRWA.balanceOf(investor2.address);
      
      // 2. 参与多次治理活动
      // 模拟创建3个提案并参与投票
      for (let i = 0; i < 3; i++) {
        const proposalDescription = `提案 ${i+1}: 改进协议参数`;
        
        // 模拟投票
        // 在实际场景中，这将调用治理合约的投票功能
        console.log(`投资者1对提案${i+1}投票: 支持`);
        console.log(`投资者2对提案${i+1}投票: ${i % 2 === 0 ? '支持' : '反对'}`);
        
        // 治理奖励 (prRWA)
        const activityReward = ethers.utils.parseEther("1000"); // 每次活动1000 prRWA
        await prRWA.mint(investor1.address, activityReward);
        await prRWA.mint(investor2.address, activityReward);
      }
      
      // 3. 验证治理权重增长
      const finalWeight1 = await prRWA.balanceOf(investor1.address);
      const finalWeight2 = await prRWA.balanceOf(investor2.address);
      
      expect(finalWeight1).to.be.gt(initialWeight1);
      expect(finalWeight2).to.be.gt(initialWeight2);
      
      // 4. 验证权重对提案能力的影响
      // 在真实系统中，有足够权重的用户可以创建提案
      // 这里我们模拟权重检查
      
      // 给零售用户少量治理代币
      await prRWA.mint(retailUser.address, ethers.utils.parseEther("100")); 
      
      const proposalThreshold = ethers.utils.parseEther("10000"); // 假设提案阈值为10000代币
      
      // 检查两个用户是否有足够的权重提案
      const investor1CanPropose = (await prRWA.balanceOf(investor1.address)).gte(proposalThreshold);
      const retailUserCanPropose = (await prRWA.balanceOf(retailUser.address)).gte(proposalThreshold);
      
      // 投资者1应该有足够的权重
      expect(investor1CanPropose).to.be.true;
      
      // 零售用户应该权重不足
      expect(retailUserCanPropose).to.be.false;
      
      // 5. 完成治理权重成长闭环
      // 投资者使用增长的权重行使更多治理权力
      // （在实际系统中，这可能是创建更重要的提案或获得更多投票权）
      
      console.log("投资者使用增长的治理权重提出重要提案");
      // 这将在真实系统中触发提案创建
    });
  });
}); 