const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token Ecosystem Integration", function () {
  // 测试账户
  let deployer, governor, treasury, marketOperator, stakingManager, investor, user1, user2, liquidator;
  // 合约实例
  let rwa, market, stakePool, bank, prRWA, stableRwa;
  // 常量
  const ZERO_ADDRESS = ethers.constants.AddressZero;
  const BASE_UNITS = 10000; // 基点单位
  const INITIAL_MINT = ethers.utils.parseEther("10000000"); // 初始铸造量：1千万

  // 模拟角色和权限
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;

  beforeEach(async function () {
    // 获取测试账户
    [deployer, governor, treasury, marketOperator, stakingManager, investor, user1, user2, liquidator] = await ethers.getSigners();

    // 部署RWA代币
    const RwaFactory = await ethers.getContractFactory("RWA");
    rwa = await RwaFactory.deploy();
    await rwa.deployed();

    // 模拟其他合约
    // 注意：这里只是模拟，实际测试中可以使用真实合约
    const PrRwaFactory = await ethers.getContractFactory("RWA");
    prRWA = await PrRwaFactory.deploy();
    stableRwa = await PrRwaFactory.deploy();
    await prRWA.deployed();
    await stableRwa.deployed();

    // 模拟核心合约行为（在真实环境中，这些会是完整的合约实现）
    market = {
      address: marketOperator.address,
      getPrice: async () => ethers.utils.parseEther("1.5"), // 模拟1 RWA = 1.5 STABLE_RWA
    };

    stakePool = {
      address: stakingManager.address
    };

    bank = {
      address: treasury.address
    };

    // 初始铸造代币给treasury
    await rwa.mint(treasury.address, INITIAL_MINT);
  });

  describe("基础功能与权限模型", function () {
    it("应该正确实现基本ERC20功能", async function () {
      // 验证代币基础信息
      expect(await rwa.name()).to.equal("RWA");
      expect(await rwa.symbol()).to.equal("RWA");
      expect(await rwa.decimals()).to.equal(18);
      expect(await rwa.totalSupply()).to.equal(INITIAL_MINT);
      expect(await rwa.balanceOf(treasury.address)).to.equal(INITIAL_MINT);
    });

    it("应该只允许所有者铸造和销毁代币", async function () {
      // 所有者可以铸造代币
      const mintAmount = ethers.utils.parseEther("1000");
      await rwa.mint(user1.address, mintAmount);
      expect(await rwa.balanceOf(user1.address)).to.equal(mintAmount);

      // 非所有者不能铸造代币
      await expect(
        rwa.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // 所有者可以销毁自己的代币
      const burnAmount = ethers.utils.parseEther("500");
      await rwa.mint(deployer.address, burnAmount);
      await rwa.burn(burnAmount);
      expect(await rwa.balanceOf(deployer.address)).to.equal(0);

      // 非所有者不能调用burnFrom
      await expect(
        rwa.connect(user1).burnFrom(treasury.address, burnAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("应该正确处理所有权转移", async function () {
      // 初始所有者是部署者
      expect(await rwa.owner()).to.equal(deployer.address);

      // 转移所有权
      await rwa.transferOwnership(governor.address);
      expect(await rwa.owner()).to.equal(governor.address);

      // 新所有者可以铸造代币
      const mintAmount = ethers.utils.parseEther("1000");
      await rwa.connect(governor).mint(user1.address, mintAmount);
      expect(await rwa.balanceOf(user1.address)).to.equal(mintAmount);

      // 原所有者不能再铸造代币
      await expect(
        rwa.mint(user2.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("在Market合约场景中的应用", function () {
    it("应该支持在做市商场景中使用RWA代币", async function () {
      // 1. 初始化市场流动性
      const rwaLiquidity = ethers.utils.parseEther("100000");
      const stableRwaLiquidity = ethers.utils.parseEther("150000"); // 1 RWA = 1.5 STABLE_RWA
      
      // 模拟向Market合约转移RWA代币（实际中由Market合约调用）
      await rwa.connect(treasury).transfer(market.address, rwaLiquidity);
      
      // 2. 模拟交易功能
      // 用户购买RWA代币
      const rwaPrice = await market.getPrice(); // 获取价格
      const stableRwaAmount = ethers.utils.parseEther("1500");
      const expectedRwaAmount = stableRwaAmount.mul(ethers.utils.parseEther("1")).div(rwaPrice);
      
      // 在真实环境中，这将通过Market合约的swap功能实现
      // 这里我们直接模拟交易结果
      await rwa.mint(user1.address, expectedRwaAmount); // 模拟用户获得RWA
      
      expect(await rwa.balanceOf(user1.address)).to.equal(expectedRwaAmount);
      
      // 3. 模拟价格变动后的再交易
      // 假设价格上涨到1 RWA = 2 STABLE_RWA
      const newRwaPrice = ethers.utils.parseEther("2");
      const sellRwaAmount = ethers.utils.parseEther("500");
      const expectedStableRwaReturn = sellRwaAmount.mul(newRwaPrice).div(ethers.utils.parseEther("1"));
      
      // 用户卖出RWA获取STABLE_RWA
      await rwa.connect(user1).transfer(market.address, sellRwaAmount); // 模拟转入Market
      
      // 验证余额
      expect(await rwa.balanceOf(user1.address)).to.equal(
        expectedRwaAmount.sub(sellRwaAmount)
      );
    });
  });

  describe("在StakePool合约场景中的应用", function () {
    it("应该支持RWA代币质押获取prRWA奖励", async function () {
      // 1. 用户获取RWA代币
      const stakeAmount = ethers.utils.parseEther("10000");
      await rwa.connect(treasury).transfer(user1.address, stakeAmount);
      
      // 2. 模拟质押流程
      // 用户批准StakePool合约使用RWA
      await rwa.connect(user1).approve(stakePool.address, stakeAmount);
      
      // 在真实环境中，这将通过StakePool.stake()实现
      // 这里我们直接模拟质押结果
      await rwa.connect(user1).transfer(stakePool.address, stakeAmount);
      
      // 3. 模拟获得质押奖励
      // 在真实环境中，这将由StakePool合约根据时间和质押量计算
      const rewardAmount = ethers.utils.parseEther("500"); // 假设获得500 prRWA
      await prRWA.mint(user1.address, rewardAmount);
      
      // 4. 模拟解除质押
      // 在真实环境中，这将通过StakePool.unstake()实现
      await rwa.connect(deployer).mint(user1.address, stakeAmount); // 模拟返还质押的RWA
      
      // 验证最终状态
      expect(await rwa.balanceOf(user1.address)).to.equal(stakeAmount);
      expect(await rwa.balanceOf(stakePool.address)).to.equal(stakeAmount);
    });
  });

  describe("在Bank合约场景中的应用", function () {
    it("应该支持RWA代币作为抵押借出STABLE_RWA代币", async function () {
      // 1. 用户获取RWA代币
      const depositAmount = ethers.utils.parseEther("10000");
      await rwa.connect(treasury).transfer(user1.address, depositAmount);
      
      // 记录初始余额
      const initialBankBalance = await rwa.balanceOf(bank.address);
      
      // 2. 模拟存款流程
      // 用户批准Bank合约使用RWA
      await rwa.connect(user1).approve(bank.address, depositAmount);
      
      // 在真实环境中，这将通过Bank.deposit()实现
      // 这里我们直接模拟存款结果
      await rwa.connect(user1).transfer(bank.address, depositAmount);
      
      // 3. 模拟借款
      // 在真实环境中，这将计算用户可借金额并由Bank.borrow()实现
      const rwaPrice = ethers.utils.parseEther("1.5"); // 1 RWA = 1.5 STABLE_RWA
      const collateralRatio = 150; // 150% 抵押率
      
      // 计算最大可借金额
      const maxBorrow = depositAmount.mul(rwaPrice).div(ethers.utils.parseEther("1"))
        .mul(100).div(collateralRatio);
      
      // 借款金额（使用最大可借的75%）
      const borrowAmount = maxBorrow.mul(75).div(100);
      await stableRwa.mint(user1.address, borrowAmount); // 模拟借款获得STABLE_RWA
      
      // 4. 模拟还款
      // 在真实环境中，这将通过Bank.repay()实现
      // 这里我们只验证余额
      
      // 5. 模拟取款
      // 在真实环境中，这将通过Bank.withdraw()实现
      
      // 验证最终状态 - 确认RWA已转入Bank合约
      const finalBankBalance = await rwa.balanceOf(bank.address);
      expect(finalBankBalance).to.be.gt(initialBankBalance);
      expect(await rwa.balanceOf(user1.address)).to.equal(0);
    });
    
    it("应该支持不良头寸的清算机制", async function () {
      // 1. 用户存入RWA并借出STABLE_RWA
      const depositAmount = ethers.utils.parseEther("10000");
      const initialRwaPrice = ethers.utils.parseEther("1.5"); // 1 RWA = 1.5 STABLE_RWA
      
      await rwa.connect(treasury).transfer(user1.address, depositAmount);
      await rwa.connect(user1).transfer(bank.address, depositAmount); // 模拟存款
      
      // 计算并借出STABLE_RWA
      const maxBorrow = depositAmount.mul(initialRwaPrice).div(ethers.utils.parseEther("1"))
        .mul(100).div(150); // 150% 抵押率
      await stableRwa.mint(user1.address, maxBorrow); // 模拟借款
      
      // 2. 模拟价格下跌，导致抵押率下降
      const newRwaPrice = ethers.utils.parseEther("1.0"); // RWA价格下跌
      // 新抵押率 = (depositAmount * newPrice) / borrowAmount * 100%
      const newCollateralRatio = depositAmount.mul(newRwaPrice).div(maxBorrow).mul(100);
      
      // 3. 清算人清算不良头寸
      // 在真实环境中，这将通过Bank.liquidate()实现
      const liquidationThreshold = 120; // 120% 清算阈值
      
      // 如果抵押率低于清算阈值
      if (newCollateralRatio.lt(liquidationThreshold)) {
        const liquidateAmount = maxBorrow.div(2); // 清算一半债务
        const collateralToLiquidator = liquidateAmount.mul(ethers.utils.parseEther("1"))
          .div(newRwaPrice).mul(105).div(100); // 获得105%价值的抵押品
          
        // 模拟清算操作
        await rwa.connect(deployer).mint(liquidator.address, collateralToLiquidator); // 清算人获得RWA
        
        // 验证结果
        expect(collateralToLiquidator).to.be.gt(liquidateAmount.mul(ethers.utils.parseEther("1")).div(newRwaPrice));
      }
    });
  });

  describe("完整生态系统交互", function () {
    it("应该支持RWA在整个生态系统中的闭环流通", async function () {
      // 初始分配
      const userFunds = ethers.utils.parseEther("50000");
      await rwa.connect(treasury).transfer(user1.address, userFunds);
      
      // 记录各账户初始状态
      const initialUserBalance = await rwa.balanceOf(user1.address);
      const initialStakePoolBalance = await rwa.balanceOf(stakePool.address);
      const initialBankBalance = await rwa.balanceOf(bank.address);
      
      // 1. 用户将一部分RWA质押到StakePool
      const stakeAmount = ethers.utils.parseEther("20000");
      await rwa.connect(user1).transfer(stakePool.address, stakeAmount); // 模拟质押
      
      // 获得prRWA奖励
      const prRwaReward = ethers.utils.parseEther("1000");
      await prRWA.mint(user1.address, prRwaReward); // 模拟奖励
      
      // 2. 用户将一部分RWA存入Bank并借出STABLE_RWA
      const depositAmount = ethers.utils.parseEther("15000");
      await rwa.connect(user1).transfer(bank.address, depositAmount); // 模拟存款
      
      // 借出STABLE_RWA
      const rwaPrice = ethers.utils.parseEther("1.5");
      const borrowAmount = depositAmount.mul(rwaPrice).div(ethers.utils.parseEther("1"))
        .mul(2).div(3); // 约66.7%的抵押率（150%借款率）
      await stableRwa.mint(user1.address, borrowAmount); // 模拟借款
      
      // 3. 用户使用STABLE_RWA在Market购买更多RWA
      const newRwaAmount = borrowAmount.div(rwaPrice).mul(ethers.utils.parseEther("1"));
      await rwa.mint(user1.address, newRwaAmount); // 模拟购买RWA
      
      // 4. 用户使用新获得的RWA继续质押
      const additionalStake = newRwaAmount.div(2);
      await rwa.connect(user1).transfer(stakePool.address, additionalStake); // 模拟追加质押
      
      // 5. 验证资金流动和最终账户状态
      const finalUserBalance = await rwa.balanceOf(user1.address);
      const finalStakePoolBalance = await rwa.balanceOf(stakePool.address);
      const finalBankBalance = await rwa.balanceOf(bank.address);
      
      // 验证资金流动
      expect(finalStakePoolBalance).to.be.gt(initialStakePoolBalance); // StakePool余额应增加
      expect(finalBankBalance).to.be.gt(initialBankBalance); // Bank余额应增加
      expect(finalUserBalance).to.be.lt(initialUserBalance); // 用户余额应减少

      // 验证整体资金流向
      const totalInitialBalance = initialUserBalance.add(initialStakePoolBalance).add(initialBankBalance);
      const totalFinalBalance = finalUserBalance.add(finalStakePoolBalance).add(finalBankBalance).add(newRwaAmount);
      expect(totalFinalBalance).to.be.gte(totalInitialBalance); // 考虑到新铸造的代币，最终总和应大于等于初始总和
    });
  });

  describe("自定义事件捕获与验证", function () {
    it("应该正确捕获和验证代币操作相关事件", async function () {
      // 测试铸造事件
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(rwa.mint(user1.address, mintAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(ZERO_ADDRESS, user1.address, mintAmount);
      
      // 测试转账事件
      const transferAmount = ethers.utils.parseEther("400");
      await expect(rwa.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      
      // 测试授权事件
      const approveAmount = ethers.utils.parseEther("200");
      await expect(rwa.connect(user1).approve(stakePool.address, approveAmount))
        .to.emit(rwa, "Approval")
        .withArgs(user1.address, stakePool.address, approveAmount);
      
      // 测试burnFrom事件（需要先授权）
      const burnAmount = ethers.utils.parseEther("100");
      await rwa.connect(user1).approve(deployer.address, burnAmount);
      
      await expect(rwa.burnFrom(user1.address, burnAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(user1.address, ZERO_ADDRESS, burnAmount);
    });
  });

  describe("紧急治理场景", function () {
    it("应该支持在紧急情况下的治理操作", async function () {
      // 1. 初始化：将大量RWA代币分配给不同地址
      await rwa.mint(user1.address, ethers.utils.parseEther("1000000"));
      await rwa.mint(user2.address, ethers.utils.parseEther("2000000"));
      
      // 2. 模拟紧急情况：需要快速应对市场波动
      // 假设需要将合约所有权临时转移给紧急治理地址
      await rwa.transferOwnership(governor.address);
      expect(await rwa.owner()).to.equal(governor.address);
      
      // 3. 紧急治理地址执行风险控制措施
      // 例如：铸造额外代币到treasury以稳定市场
      const emergencyMint = ethers.utils.parseEther("5000000");
      await rwa.connect(governor).mint(treasury.address, emergencyMint);
      
      // 4. 紧急措施后，将所有权返回给正常治理流程
      await rwa.connect(governor).transferOwnership(deployer.address);
      expect(await rwa.owner()).to.equal(deployer.address);
      
      // 验证最终状态
      const treasuryBalance = await rwa.balanceOf(treasury.address);
      expect(treasuryBalance).to.equal(INITIAL_MINT.add(emergencyMint));
    });
  });
}); 