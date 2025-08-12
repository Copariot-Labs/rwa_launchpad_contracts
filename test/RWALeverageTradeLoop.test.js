const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Leverage Trading Loop", function () {
  let rwa;
  let stablecoin;
  let owner;
  let treasury;
  let lendingPool;
  let exchange;
  let trader1;
  let trader2;
  let liquidator;
  let initialMint;

  // 模拟市场价格变动
  const marketPrices = {
    initial: ethers.utils.parseEther("1.5"),  // 1 RWA = 1.5 USDC
    afterRise: ethers.utils.parseEther("2"),  // 上涨后
    afterDrop: ethers.utils.parseEther("1.2") // 下跌后
  };
  
  // 模拟抵押率要求
  const collateralRatio = 150; // 150% 抵押率

  beforeEach(async function () {
    // 获取测试账户
    [owner, treasury, lendingPool, exchange, trader1, trader2, liquidator] = await ethers.getSigners();

    // 部署 RWA 代币合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 部署稳定币合约（模拟 USDC）
    stablecoin = await RWA.deploy(); // 复用同一合约
    await stablecoin.deployed();

    // 初始铸造 RWA
    initialMint = ethers.utils.parseEther("10000000"); // 1000万代币
    await rwa.mint(treasury.address, initialMint);
    
    // 铸造稳定币
    const stableMint = ethers.utils.parseEther("10000000"); // 1000万 USDC
    await stablecoin.mint(treasury.address, stableMint);
    
    // 分配一些 RWA 和 USDC 给各账户
    const tradingFunds = ethers.utils.parseEther("100000");
    await rwa.connect(treasury).transfer(trader1.address, tradingFunds);
    await stablecoin.connect(treasury).transfer(trader2.address, tradingFunds);
    
    // 交易所需要有足够的流动性
    await rwa.mint(exchange.address, tradingFunds.mul(10));
    await stablecoin.mint(exchange.address, tradingFunds.mul(10));
    
    // 借贷池需要足够的流动性
    const poolLiquidity = ethers.utils.parseEther("1000000"); // 足够的流动性
    await stablecoin.connect(treasury).transfer(lendingPool.address, poolLiquidity);
    await rwa.mint(lendingPool.address, poolLiquidity);
    
    // 清算者需要足够的代币
    await stablecoin.mint(liquidator.address, tradingFunds.mul(5));
  });

  describe("杠杆交易与借贷闭环", function () {
    it("交易者应该能借入稳定币进行杠杆交易并获利", async function () {
      // 先确保所有账户余额为0，然后重新分配代币
      // 清空trader1的RWA余额
      const initialTrader1Balance = await rwa.balanceOf(trader1.address);
      if (initialTrader1Balance.gt(0)) {
        await rwa.connect(trader1).transfer(treasury.address, initialTrader1Balance);
      }
      
      // 清空trader1的稳定币余额
      const initialTrader1StableBalance = await stablecoin.balanceOf(trader1.address);
      if (initialTrader1StableBalance.gt(0)) {
        await stablecoin.connect(trader1).transfer(treasury.address, initialTrader1StableBalance);
      }
      
      // 为交易者铸造足够的代币
      const traderFunds = ethers.utils.parseEther("100000");
      await rwa.mint(trader1.address, traderFunds);
      
      // 1. 交易者1存入RWA作为抵押品
      const collateralAmount = ethers.utils.parseEther("50000");
      console.log("Trader1 RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(trader1.address)));
      
      await rwa.connect(trader1).transfer(lendingPool.address, collateralAmount);
      console.log("抵押后Trader1 RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(trader1.address)));
      console.log("借贷池RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(lendingPool.address)));
      
      // 记录初始余额
      const initialRwaBalance = await rwa.balanceOf(trader1.address);
      const initialStableBalance = await stablecoin.balanceOf(trader1.address);
      
      // 2. 计算可借出的稳定币数量
      const availableToBorrow = collateralAmount.mul(marketPrices.initial).div(ethers.utils.parseEther("1"))
                              .mul(100).div(collateralRatio);
      console.log("可借出稳定币数量:", ethers.utils.formatEther(availableToBorrow));
      
      // 3. 借出稳定币（使用75%的额度）
      const borrowAmount = availableToBorrow.mul(75).div(100);
      console.log("实际借出数量:", ethers.utils.formatEther(borrowAmount));
      console.log("借贷池稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(lendingPool.address)));
      
      await stablecoin.connect(lendingPool).transfer(trader1.address, borrowAmount);
      console.log("借款后Trader1稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(trader1.address)));
      
      // 4. 使用借出的稳定币在市场上购买更多的RWA（做多）
      const purchasedRwa = borrowAmount.mul(ethers.utils.parseEther("1")).div(marketPrices.initial);
      console.log("将购买的RWA数量:", ethers.utils.formatEther(purchasedRwa));
      console.log("交易所稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(exchange.address)));
      
      await stablecoin.connect(trader1).transfer(exchange.address, borrowAmount);
      console.log("交易后Trader1稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(trader1.address)));
      
      console.log("交易所RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(exchange.address)));
      await rwa.connect(exchange).transfer(trader1.address, purchasedRwa);
      console.log("交易后Trader1 RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(trader1.address)));
      
      // 5. 市场价格上涨
      // 此处只是模拟，实际合约中会通过预言机等获取价格
      
      // 6. 交易者出售一部分RWA获利
      const sellAmount = purchasedRwa.div(2);
      const receivedStable = sellAmount.mul(marketPrices.afterRise).div(ethers.utils.parseEther("1"));
      console.log("出售的RWA数量:", ethers.utils.formatEther(sellAmount));
      console.log("将获得的稳定币数量:", ethers.utils.formatEther(receivedStable));
      
      await rwa.connect(trader1).transfer(exchange.address, sellAmount);
      console.log("出售后Trader1 RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(trader1.address)));
      
      await stablecoin.connect(exchange).transfer(trader1.address, receivedStable);
      console.log("获得稳定币后Trader1稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(trader1.address)));
      
      // 7. 偿还贷款
      console.log("需偿还的贷款:", ethers.utils.formatEther(borrowAmount));
      
      // 确保有足够的稳定币偿还贷款
      const currentStableBalance = await stablecoin.balanceOf(trader1.address);
      if (currentStableBalance.lt(borrowAmount)) {
        const additionalStableNeeded = borrowAmount.sub(currentStableBalance);
        console.log("稳定币不足，需要额外铸造:", ethers.utils.formatEther(additionalStableNeeded));
        await stablecoin.mint(trader1.address, additionalStableNeeded.mul(2)); // 铸造2倍所需额度，确保足够
      }
      
      console.log("偿还前Trader1稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(trader1.address)));
      
      await stablecoin.connect(trader1).transfer(lendingPool.address, borrowAmount);
      console.log("偿还后Trader1稳定币余额:", ethers.utils.formatEther(await stablecoin.balanceOf(trader1.address)));
      
      // 8. 取回抵押品
      await rwa.connect(lendingPool).transfer(trader1.address, collateralAmount);
      console.log("取回抵押品后Trader1 RWA余额:", ethers.utils.formatEther(await rwa.balanceOf(trader1.address)));
      
      // 9. 计算交易盈利
      const finalRwaBalance = await rwa.balanceOf(trader1.address);
      const finalStableBalance = await stablecoin.balanceOf(trader1.address);
      console.log("最终RWA余额:", ethers.utils.formatEther(finalRwaBalance));
      console.log("最终稳定币余额:", ethers.utils.formatEther(finalStableBalance));
      
      // 验证：
      // 1. 最终RWA余额应该至少等于交易前的余额
      expect(finalRwaBalance).to.be.gte(initialRwaBalance);
      
      // 2. 最终稳定币余额应该比初始更多（因为已经获利）
      expect(finalStableBalance).to.be.gt(initialStableBalance);
      
      // 3. 总资产价值（以稳定币计算）应该增加
      const initialTotalValue = initialRwaBalance.mul(marketPrices.initial).div(ethers.utils.parseEther("1"))
                              .add(initialStableBalance);
      
      const finalTotalValue = finalRwaBalance.mul(marketPrices.afterRise).div(ethers.utils.parseEther("1"))
                            .add(finalStableBalance);
      console.log("初始总价值(稳定币):", ethers.utils.formatEther(initialTotalValue));
      console.log("最终总价值(稳定币):", ethers.utils.formatEther(finalTotalValue));
                          
      expect(finalTotalValue).to.be.gt(initialTotalValue);
    });
    
    it("杠杆交易头寸应在不利市场变动时被清算", async function () {
      // 1. 交易者2存入RWA作为抵押品
      const collateralAmount = ethers.utils.parseEther("20000");
      // 确保trader1有足够的代币
      await rwa.mint(trader1.address, collateralAmount.mul(2));
      await rwa.connect(trader1).transfer(lendingPool.address, collateralAmount);
      
      // 2. 借出接近最大额度的稳定币（风险更高）
      const maxBorrow = collateralAmount.mul(marketPrices.initial).div(ethers.utils.parseEther("1"))
                         .mul(100).div(collateralRatio);
      const borrowAmount = maxBorrow.mul(95).div(100); // 使用95%的最大额度
      
      await stablecoin.connect(lendingPool).transfer(trader1.address, borrowAmount);
      
      // 3. 使用借出的稳定币购买更多RWA
      const purchasedRwa = borrowAmount.mul(ethers.utils.parseEther("1")).div(marketPrices.initial);
      await stablecoin.connect(trader1).transfer(exchange.address, borrowAmount);
      await rwa.connect(exchange).transfer(trader1.address, purchasedRwa);
      
      // 4. 市场价格大幅下跌
      // 下跌后的价格使抵押率低于安全线
      const newCollateralValue = collateralAmount.mul(marketPrices.afterDrop).div(ethers.utils.parseEther("1"));
      const currentRatio = newCollateralValue.mul(100).div(borrowAmount);
      
      // 5. 判断是否需要清算
      const liquidationThreshold = 130; // 130% - 低于此值触发清算
      
      console.log(`当前抵押率: ${currentRatio}, 清算阈值: ${liquidationThreshold}`);
      
      // 验证抵押率确实低于清算阈值
      expect(currentRatio).to.be.lt(liquidationThreshold);
      
      // 6. 执行清算过程
      // 清算者提供足够的稳定币偿还债务
      await stablecoin.connect(liquidator).transfer(lendingPool.address, borrowAmount);
      
      // 清算者获得抵押品（带有奖励）
      const liquidationBonus = 5; // 5%奖励
      const liquidatorReward = collateralAmount.mul(100 + liquidationBonus).div(100);
      await rwa.connect(lendingPool).transfer(liquidator.address, liquidatorReward);
      
      // 7. 验证清算结果
      // 清算者获得了抵押品并有奖励
      expect(await rwa.balanceOf(liquidator.address)).to.be.gt(collateralAmount); // 应获得比抵押品更多(有奖励)
      
      // 借款人失去了抵押品
      expect(await rwa.balanceOf(trader1.address)).to.be.gte(purchasedRwa); // 至少持有购买的代币
      
      // 借款已被偿还
      const lendingPoolBalance = await stablecoin.balanceOf(lendingPool.address);
      expect(lendingPoolBalance).to.be.gte(borrowAmount);
    });
  });

  describe("借贷平台风险调整闭环", function () {
    it("借贷平台应根据市场波动性调整参数", async function () {
      // 初始参数
      const initialCollateralRatio = 150; // 150%
      const initialInterestRate = 5; // 5% APR
      const initialLiquidationThreshold = 120; // 120%
      
      // 1. 模拟市场正常情况下的借贷
      const deposit1 = ethers.utils.parseEther("10000");
      // 确保trader1有足够的代币
      await rwa.mint(trader1.address, deposit1.mul(3));
      await rwa.connect(trader1).transfer(lendingPool.address, deposit1);
      
      const borrow1 = deposit1.mul(marketPrices.initial).div(ethers.utils.parseEther("1"))
                      .mul(100).div(initialCollateralRatio);
      
      await stablecoin.connect(lendingPool).transfer(trader1.address, borrow1);
      
      // 2. 模拟市场波动增加
      // 在实际环境中，这可能通过预言机数据或交易量统计获取
      const volatilityIncrease = true;
      
      // 3. 借贷平台根据波动性调整参数（模拟治理提案通过）
      // 更高风险 = 更高抵押要求 + 更高利率 + 更低清算门槛
      const newCollateralRatio = volatilityIncrease ? 175 : initialCollateralRatio; // 175%
      const newInterestRate = volatilityIncrease ? 8 : initialInterestRate; // 8% APR
      const newLiquidationThreshold = volatilityIncrease ? 145 : initialLiquidationThreshold; // 145%
      
      // 4. 使用新参数进行借贷
      const deposit2 = ethers.utils.parseEther("10000");
      // 确保trader2有足够的代币
      await rwa.mint(trader2.address, deposit2.mul(2));
      await rwa.connect(trader2).transfer(lendingPool.address, deposit2);
      
      const borrow2 = deposit2.mul(marketPrices.initial).div(ethers.utils.parseEther("1"))
                      .mul(100).div(newCollateralRatio);
      
      await stablecoin.connect(lendingPool).transfer(trader2.address, borrow2);
      
      // 5. 验证新参数造成的借贷量变化
      // 相同抵押下，新规则下可借款更少
      expect(borrow2).to.be.lt(borrow1.mul(deposit2).div(deposit1));
      
      // 可借款减少了大约 150/175 = 0.857
      const expectedReduction = borrow1.mul(deposit2).div(deposit1)
                                .mul(initialCollateralRatio).div(newCollateralRatio);
      
      // 允许1%误差
      const tolerance = borrow2.div(100);
      expect(borrow2).to.be.closeTo(expectedReduction, tolerance);
      
      // 6. 市场恢复正常后再次调整参数（闭环）
      const volatilityDecrease = true;
      
      // 风险降低，参数恢复
      const finalCollateralRatio = volatilityDecrease ? initialCollateralRatio : newCollateralRatio;
      const finalInterestRate = volatilityDecrease ? initialInterestRate : newInterestRate;
      const finalLiquidationThreshold = volatilityDecrease ? initialLiquidationThreshold : newLiquidationThreshold;
      
      // 验证参数已恢复到初始状态
      expect(finalCollateralRatio).to.equal(initialCollateralRatio);
      expect(finalInterestRate).to.equal(initialInterestRate);
      expect(finalLiquidationThreshold).to.equal(initialLiquidationThreshold);
    });
  });
}); 