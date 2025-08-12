const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token Business Scenarios", function () {
  let rwa;
  let owner;
  let exchange;
  let treasury;
  let investor1;
  let investor2;
  let retailUser1;
  let retailUser2;
  let liquidityProvider;
  let initialMint;

  beforeEach(async function () {
    // 获取测试账户
    [owner, exchange, treasury, investor1, investor2, retailUser1, retailUser2, liquidityProvider] = await ethers.getSigners();

    // 部署合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 初始铸造一定数量的代币
    initialMint = ethers.utils.parseEther("10000000"); // 一千万代币
    await rwa.mint(treasury.address, initialMint);
  });

  describe("代币分配与私募", function () {
    it("应该能够执行代币分配并验证比例", async function () {
      // 代币分配方案（示例比例）
      const teamAllocation = initialMint.mul(20).div(100); // 20%团队
      const investorAllocation = initialMint.mul(30).div(100); // 30%投资者
      const communityAllocation = initialMint.mul(40).div(100); // 40%社区
      const reserveAllocation = initialMint.mul(10).div(100); // 10%储备金

      // 从国库分配代币
      await rwa.connect(treasury).transfer(owner.address, teamAllocation);
      await rwa.connect(treasury).transfer(investor1.address, investorAllocation.div(2));
      await rwa.connect(treasury).transfer(investor2.address, investorAllocation.div(2));
      await rwa.connect(treasury).transfer(exchange.address, communityAllocation);

      // 验证分配结果
      expect(await rwa.balanceOf(owner.address)).to.equal(teamAllocation);
      expect(await rwa.balanceOf(investor1.address)).to.equal(investorAllocation.div(2));
      expect(await rwa.balanceOf(investor2.address)).to.equal(investorAllocation.div(2));
      expect(await rwa.balanceOf(exchange.address)).to.equal(communityAllocation);
      expect(await rwa.balanceOf(treasury.address)).to.equal(reserveAllocation);
    });

    it("应该能够模拟私募发行过程", async function () {
      // 私募设置
      const privateSaleAmount = ethers.utils.parseEther("1000000"); // 100万代币私募
      const investor1Share = privateSaleAmount.mul(60).div(100); // 60%
      const investor2Share = privateSaleAmount.mul(40).div(100); // 40%
      
      // 从国库转移代币到投资者账户（模拟私募）
      await rwa.connect(treasury).transfer(investor1.address, investor1Share);
      await rwa.connect(treasury).transfer(investor2.address, investor2Share);
      
      // 锁仓期过后投资者销售一部分代币（模拟流通）
      const investor1SellAmount = investor1Share.div(4); // 卖出25%
      const investor2SellAmount = investor2Share.div(5); // 卖出20%
      
      await rwa.connect(investor1).transfer(exchange.address, investor1SellAmount);
      await rwa.connect(investor2).transfer(exchange.address, investor2SellAmount);
      
      // 验证最终持仓
      expect(await rwa.balanceOf(investor1.address)).to.equal(investor1Share.sub(investor1SellAmount));
      expect(await rwa.balanceOf(investor2.address)).to.equal(investor2Share.sub(investor2SellAmount));
      expect(await rwa.balanceOf(exchange.address)).to.equal(investor1SellAmount.add(investor2SellAmount));
    });
  });
  
  describe("交易所上线与流动性", function () {
    it("应该能模拟交易所上线流程和交易", async function () {
      // 1. 为交易所提供初始流动性
      const listingAmount = ethers.utils.parseEther("500000");
      await rwa.mint(exchange.address, listingAmount);

      // 2. 流动性提供商添加更多流动性
      const lpAmount = ethers.utils.parseEther("100000");
      await rwa.mint(liquidityProvider.address, lpAmount);
      await rwa.connect(liquidityProvider).transfer(exchange.address, lpAmount);

      // 3. 模拟交易活动
      // 交易所分配一些代币给零售用户（模拟购买）
      const retailPurchase1 = ethers.utils.parseEther("1000");
      const retailPurchase2 = ethers.utils.parseEther("2500");
      
      await rwa.connect(exchange).transfer(retailUser1.address, retailPurchase1);
      await rwa.connect(exchange).transfer(retailUser2.address, retailPurchase2);
      
      // 零售用户之间交易
      const tradeAmount = ethers.utils.parseEther("500");
      await rwa.connect(retailUser1).transfer(retailUser2.address, tradeAmount);
      
      // 验证余额
      expect(await rwa.balanceOf(retailUser1.address)).to.equal(retailPurchase1.sub(tradeAmount));
      expect(await rwa.balanceOf(retailUser2.address)).to.equal(retailPurchase2.add(tradeAmount));
      
      // 4. 模拟交易量增加
      // 在一天内完成多笔交易
      for (let i = 0; i < 5; i++) {
        const amount = ethers.utils.parseEther((100 + i * 50).toString());
        await rwa.connect(retailUser2).transfer(retailUser1.address, amount);
        await rwa.connect(retailUser1).transfer(retailUser2.address, amount.mul(98).div(100)); // 模拟价格波动
      }
      
      // 验证最终交易所流动性
      const expectedExchangeBalance = listingAmount.add(lpAmount)
        .sub(retailPurchase1).sub(retailPurchase2);
      expect(await rwa.balanceOf(exchange.address)).to.equal(expectedExchangeBalance);
    });
  });

  describe("市场危机与应对", function () {
    it("应该能模拟市场危机和紧急干预", async function () {
      // 1. 设置初始市场状态
      await rwa.mint(exchange.address, ethers.utils.parseEther("5000000"));
      await rwa.mint(retailUser1.address, ethers.utils.parseEther("500000"));
      await rwa.mint(retailUser2.address, ethers.utils.parseEther("300000"));
      await rwa.mint(investor1.address, ethers.utils.parseEther("1000000"));
      await rwa.mint(investor2.address, ethers.utils.parseEther("800000"));
      
      // 记录初始总供应量
      const initialSupply = await rwa.totalSupply();
      
      // 2. 模拟市场恐慌性抛售
      await rwa.connect(retailUser1).transfer(exchange.address, ethers.utils.parseEther("450000"));
      await rwa.connect(retailUser2).transfer(exchange.address, ethers.utils.parseEther("250000"));
      await rwa.connect(investor2).transfer(exchange.address, ethers.utils.parseEther("500000"));
      
      // 3. 项目方紧急干预 - 销毁代币减少流通量
      const burnAmount = ethers.utils.parseEther("1000000");
      await rwa.connect(exchange).approve(owner.address, burnAmount);
      await rwa.burnFrom(exchange.address, burnAmount);
      
      // 4. 财库注入流动性支持价格
      const liquidityInjection = ethers.utils.parseEther("200000");
      await rwa.mint(treasury.address, liquidityInjection);
      await rwa.connect(treasury).transfer(exchange.address, liquidityInjection);
      
      // 5. 大户趁低吸筹
      await rwa.connect(investor1).transfer(exchange.address, ethers.utils.parseEther("200000"));
      await rwa.connect(exchange).transfer(investor1.address, ethers.utils.parseEther("600000"));
      
      // 验证干预后的市场状态
      const finalSupply = await rwa.totalSupply();
      expect(finalSupply).to.equal(initialSupply.sub(burnAmount).add(liquidityInjection));
    });
  });

  describe("代币经济完整生命周期", function () {
    it("应该能模拟代币从发行到成熟的完整生命周期", async function () {
      // 1. 初始代币分配
      const totalSupply = ethers.utils.parseEther("10000000"); // 1000万总供应量
      
      // 项目方持有40%
      const teamAllocation = totalSupply.mul(40).div(100);
      await rwa.mint(treasury.address, teamAllocation);
      
      // 私募投资者持有30%
      const investorAllocation = totalSupply.mul(30).div(100);
      await rwa.mint(investor1.address, investorAllocation.mul(60).div(100));
      await rwa.mint(investor2.address, investorAllocation.mul(40).div(100));
      
      // 公募与交易所上线20%
      const publicAllocation = totalSupply.mul(20).div(100);
      await rwa.mint(exchange.address, publicAllocation);
      
      // 生态系统10%
      const ecosystemAllocation = totalSupply.mul(10).div(100);
      await rwa.mint(liquidityProvider.address, ecosystemAllocation);
      
      // 2. 项目启动阶段 - 早期用户获取代币
      await rwa.connect(exchange).transfer(retailUser1.address, ethers.utils.parseEther("100000"));
      await rwa.connect(exchange).transfer(retailUser2.address, ethers.utils.parseEther("150000"));
      
      // 3. 成长阶段 - 代币流通增加
      // 投资者套现一部分
      await rwa.connect(investor1).transfer(exchange.address, investorAllocation.mul(60).div(100).mul(20).div(100));
      await rwa.connect(investor2).transfer(exchange.address, investorAllocation.mul(40).div(100).mul(30).div(100));
      
      // 项目方释放一部分用于生态发展
      await rwa.connect(treasury).transfer(liquidityProvider.address, teamAllocation.mul(10).div(100));
      
      // 4. 稳定阶段 - 代币成为实用代币
      // 用户间交易活跃
      for (let i = 0; i < 5; i++) {
        const amount = ethers.utils.parseEther((10000 + i * 5000).toString());
        const receiver = i % 2 === 0 ? retailUser2 : retailUser1;
        const sender = i % 2 === 0 ? retailUser1 : retailUser2;
        
        await rwa.connect(sender).transfer(receiver.address, amount);
      }
      
      // 5. 成熟阶段 - 代币经济系统自我循环
      // 生态激励
      await rwa.connect(liquidityProvider).transfer(retailUser1.address, ethers.utils.parseEther("50000"));
      await rwa.connect(liquidityProvider).transfer(retailUser2.address, ethers.utils.parseEther("50000"));
      
      // 项目回购并销毁部分代币
      const repurchaseAmount = ethers.utils.parseEther("200000");
      await rwa.connect(exchange).transfer(treasury.address, repurchaseAmount);
      await rwa.connect(treasury).approve(owner.address, repurchaseAmount);
      await rwa.burnFrom(treasury.address, repurchaseAmount);
      
      // 验证最终状态
      const finalSupply = await rwa.totalSupply();
      // 由于初始化时已经铸造了initialMint代币，加上测试中又铸造了totalSupply，所以总量为initialMint + totalSupply - repurchaseAmount
      expect(finalSupply).to.equal(initialMint.add(totalSupply).sub(repurchaseAmount));
    });
  });
});
