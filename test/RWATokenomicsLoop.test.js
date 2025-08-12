const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Tokenomics Loop", function () {
  let rwa;
  let owner;
  let treasury;
  let distributor;
  let market;
  let staking;
  let dao;
  let communityWallet;
  let initialMint;

  beforeEach(async function () {
    // 获取测试账户
    [owner, treasury, distributor, market, staking, dao, communityWallet] = await ethers.getSigners();

    // 部署 RWA 代币合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 初始代币分配
    initialMint = ethers.utils.parseEther("100000000"); // 1亿 RWA
    await rwa.mint(treasury.address, initialMint);
  });

  describe("通胀-回购-通缩经济调节闭环", function () {
    it("代币应能从通胀阶段进入通缩阶段并保持价值平衡", async function () {
      // 1. 初始化：将代币分配给各个组件
      
      // 团队和投资者（锁仓）
      const teamAllocation = initialMint.mul(20).div(100); // 20%
      await rwa.connect(treasury).transfer(owner.address, teamAllocation);
      
      // 初始市场流通量
      const initialCirculation = initialMint.mul(10).div(100); // 10%
      await rwa.connect(treasury).transfer(market.address, initialCirculation);
      
      // 质押奖励池
      const stakingAllocation = initialMint.mul(25).div(100); // 25%
      await rwa.connect(treasury).transfer(staking.address, stakingAllocation);
      
      // 社区激励
      const communityAllocation = initialMint.mul(15).div(100); // 15%
      await rwa.connect(treasury).transfer(communityWallet.address, communityAllocation);
      
      // 剩余在国库（30%）
      
      // 2. 通胀阶段：发放代币激励生态增长
      
      // 记录开始时总流通量
      const startCirculation = await rwa.totalSupply();
      
      // 发放质押奖励（每年释放质押池的20%）
      const stakingAnnualRelease = (await rwa.balanceOf(staking.address)).mul(20).div(100);
      const stakingMonthlyRelease = stakingAnnualRelease.div(12);
      
      // 模拟6个月的奖励发放
      for (let i = 0; i < 6; i++) {
        // 模拟质押奖励分发
        await rwa.connect(staking).transfer(distributor.address, stakingMonthlyRelease);
        await rwa.connect(distributor).transfer(market.address, stakingMonthlyRelease);
      }
      
      // 社区增长激励
      const communityGrowthIncentives = (await rwa.balanceOf(communityWallet.address)).mul(30).div(100);
      await rwa.connect(communityWallet).transfer(market.address, communityGrowthIncentives);
      
      // 通胀阶段结束后的流通量
      const postInflationCirculation = await rwa.balanceOf(market.address);
      expect(postInflationCirculation).to.be.gt(initialCirculation);
      
      // 3. 进入平衡阶段：协议收入增加
      
      // 模拟协议费收入（以ETH或稳定币形式）
      // 在实际测试中可以部署模拟的稳定币合约来测试
      
      // 这里我们模拟协议产生的收入已经兑换为RWA形式
      const protocolRevenue = postInflationCirculation.mul(5).div(100); // 假设收入为流通量的5%
      await rwa.mint(dao.address, protocolRevenue);
      
      // 4. 进入通缩阶段：回购并销毁
      
      // DAO提案通过，开始回购计划
      const repurchaseAmount = protocolRevenue.mul(70).div(100); // 收入的70%用于回购
      
      // 模拟从市场回购代币（在实际中这会通过AMM或订单簿进行）
      await rwa.connect(market).transfer(dao.address, repurchaseAmount);
      
      // 执行代币销毁
      await rwa.connect(dao).approve(owner.address, repurchaseAmount);
      await rwa.burnFrom(dao.address, repurchaseAmount);
      
      // 5. 验证通缩效果
      
      const finalTotalSupply = await rwa.totalSupply();
      expect(finalTotalSupply).to.be.lt(startCirculation.add(protocolRevenue));
      
      // 计算净通胀/通缩
      const netInflation = finalTotalSupply.sub(startCirculation);
      
      // 记录数据点以验证长期趋势（此处只是模拟）
      const dataPoints = [
        { time: "start", supply: startCirculation },
        { time: "post-inflation", supply: startCirculation.add(stakingMonthlyRelease.mul(6)).add(communityGrowthIncentives) },
        { time: "post-deflation", supply: finalTotalSupply }
      ];
      
      // 验证通胀率降低
      const inflationRate = netInflation.mul(100).div(startCirculation);
      expect(inflationRate).to.be.lt(10); // 通胀率应低于10%
    });
  });

  describe("协议收入分配闭环", function () {
    it("协议收入应按比例分配并驱动生态系统增长", async function () {
      // 1. 初始资金分配
      // 为简化起见，我们使用代币代表收入，实际环境中这可能是ETH或其他代币
      const protocolRevenue = ethers.utils.parseEther("1000000"); // 100万收入
      await rwa.mint(treasury.address, protocolRevenue);
      
      // 2. 定义收入分配比例
      const revenueDistribution = {
        buyback: 40, // 40% 用于回购和销毁
        reserves: 25, // 25% 保留在国库
        staking: 20, // 20% 分配给质押者
        development: 10, // 10% 用于开发
        community: 5 // 5% 用于社区激励
      };
      
      // 3. 分配收入
      const buybackAmount = protocolRevenue.mul(revenueDistribution.buyback).div(100);
      const reservesAmount = protocolRevenue.mul(revenueDistribution.reserves).div(100);
      const stakingAmount = protocolRevenue.mul(revenueDistribution.staking).div(100);
      const developmentAmount = protocolRevenue.mul(revenueDistribution.development).div(100);
      const communityAmount = protocolRevenue.mul(revenueDistribution.community).div(100);
      
      // 记录分配前的余额
      const initialTreasuryBalance = await rwa.balanceOf(treasury.address);
      const initialMarketBalance = await rwa.balanceOf(market.address);
      const initialStakingBalance = await rwa.balanceOf(staking.address);
      
      // 转移资金
      await rwa.connect(treasury).transfer(dao.address, buybackAmount);
      await rwa.connect(treasury).transfer(staking.address, stakingAmount);
      await rwa.connect(treasury).transfer(owner.address, developmentAmount);
      await rwa.connect(treasury).transfer(communityWallet.address, communityAmount);
      // 国库金额保留
      
      // 4. 执行回购和销毁
      // 从市场购买代币
      const marketBuybackAmount = buybackAmount;
      await rwa.mint(market.address, marketBuybackAmount); // 模拟市场有足够的代币
      await rwa.connect(market).transfer(dao.address, marketBuybackAmount);
      
      // 销毁回购的代币 - 使用owner (合约所有者) 进行销毁操作
      const buybackBalance = await rwa.balanceOf(dao.address);
      await rwa.connect(dao).transfer(owner.address, buybackBalance);
      await rwa.connect(owner).burn(buybackBalance);
      
      // 5. 验证收入分配结果
      expect(await rwa.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance.sub(buybackAmount).sub(stakingAmount).sub(developmentAmount).sub(communityAmount)
      );
      expect(await rwa.balanceOf(staking.address)).to.equal(initialStakingBalance.add(stakingAmount));
      
      // DAO应该已经将回购的代币全部销毁，余额应该是0
      expect(await rwa.balanceOf(dao.address)).to.equal(0);
      
      // 6. 通过收入再投资实现增长
      // 使用社区资金进行营销活动
      const marketingBudget = communityAmount.div(2);
      await rwa.connect(communityWallet).transfer(distributor.address, marketingBudget);
      
      // 使用开发资金雇佣开发者
      const developmentBudget = developmentAmount.mul(80).div(100); // 80%用于开发
      
      // 7. 下一轮收入增长（模拟生态系统发展带来更多收入）
      const growthMultiplier = 120; // 20%增长
      const nextRoundRevenue = protocolRevenue.mul(growthMultiplier).div(100);
      
      await rwa.mint(treasury.address, nextRoundRevenue);
      
      // 验证生态系统内总价值增长
      const ecosystemValue = (await rwa.balanceOf(treasury.address))
        .add(await rwa.balanceOf(staking.address))
        .add(await rwa.balanceOf(owner.address))
        .add(await rwa.balanceOf(communityWallet.address))
        .add(await rwa.balanceOf(distributor.address));
      
      expect(ecosystemValue).to.be.gt(initialTreasuryBalance);
    });
  });
}); 