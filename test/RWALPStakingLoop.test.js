const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA LP Staking Loop", function () {
  let rwa;
  let lpToken;
  let owner;
  let treasury;
  let exchange;
  let liquidityProvider1;
  let liquidityProvider2;
  let trader;
  let initialMint;
  
  // 模拟质押池状态
  let stakingData = {
    totalStaked: ethers.BigNumber.from(0),
    userStakes: {},
    userRewards: {},
    lastUpdateBlock: 0,
    rewardRate: ethers.utils.parseEther("100"), // 每区块100个代币的初始奖励率
    blockNumber: 0 // 模拟区块号
  };

  beforeEach(async function () {
    // 获取测试账户
    [owner, treasury, exchange, liquidityProvider1, liquidityProvider2, trader] = await ethers.getSigners();

    // 部署 RWA 代币合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 部署 LP 代币合约（示例中使用相同合约）
    const LPToken = await ethers.getContractFactory("RWA"); 
    lpToken = await LPToken.deploy();
    await lpToken.deployed();

    // 初始代币分配
    initialMint = ethers.utils.parseEther("10000000"); // 1000万代币
    await rwa.mint(treasury.address, initialMint);
    
    // 分配一些代币给质押池作为奖励
    const stakingRewards = ethers.utils.parseEther("1000000"); // 100万奖励
    await rwa.connect(treasury).transfer(owner.address, stakingRewards);

    // 分配一些 RWA 给交易者
    const traderFunds = ethers.utils.parseEther("500000");
    await rwa.connect(treasury).transfer(trader.address, traderFunds);
    
    // 初始化模拟质押池
    stakingData = {
      totalStaked: ethers.BigNumber.from(0),
      userStakes: {},
      userRewards: {},
      lastUpdateBlock: 0,
      rewardRate: ethers.utils.parseEther("100"),
      blockNumber: 0
    };
  });

  // 模拟质押池函数
  // 质押
  async function stake(user, amount) {
    // 转移LP代币
    await lpToken.connect(user).transfer(owner.address, amount);
    
    // 更新奖励
    updateRewards(user.address);
    
    // 更新用户质押量
    stakingData.userStakes[user.address] = (stakingData.userStakes[user.address] || ethers.BigNumber.from(0)).add(amount);
    
    // 更新总质押量
    stakingData.totalStaked = stakingData.totalStaked.add(amount);
    
    // 调整奖励率
    adjustRewardRate();
  }
  
  // 提取质押
  async function withdraw(user, amount) {
    // 确保有足够的质押余额
    const userStake = stakingData.userStakes[user.address] || ethers.BigNumber.from(0);
    if (userStake.lt(amount)) {
      throw new Error("Insufficient staked balance");
    }
    
    // 更新奖励
    updateRewards(user.address);
    
    // 更新用户质押量
    stakingData.userStakes[user.address] = userStake.sub(amount);
    
    // 更新总质押量
    stakingData.totalStaked = stakingData.totalStaked.sub(amount);
    
    // 转移LP代币回用户
    await lpToken.connect(owner).transfer(user.address, amount);
    
    // 调整奖励率
    adjustRewardRate();
  }
  
  // 领取奖励
  async function getReward(user) {
    // 更新奖励
    updateRewards(user.address);
    
    const reward = stakingData.userRewards[user.address] || ethers.BigNumber.from(0);
    if (reward.gt(0)) {
      // 清零奖励
      stakingData.userRewards[user.address] = ethers.BigNumber.from(0);
      
      // 转移奖励代币
      await rwa.connect(owner).transfer(user.address, reward);
      
      return reward;
    }
    
    return ethers.BigNumber.from(0);
  }
  
  // 退出质押池（提取全部代币和奖励）
  async function exit(user) {
    const userStake = stakingData.userStakes[user.address] || ethers.BigNumber.from(0);
    if (userStake.gt(0)) {
      await withdraw(user, userStake);
    }
    
    await getReward(user);
  }
  
  // 查询用户已赚取的奖励
  function earned(userAddress) {
    const userStake = stakingData.userStakes[userAddress] || ethers.BigNumber.from(0);
    if (userStake.eq(0)) {
      return stakingData.userRewards[userAddress] || ethers.BigNumber.from(0);
    }
    
    // 计算当前累积奖励
    const blocksSinceLastUpdate = stakingData.blockNumber - stakingData.lastUpdateBlock;
    
    if (blocksSinceLastUpdate > 0 && stakingData.totalStaked.gt(0)) {
      const rewardPerToken = stakingData.rewardRate.mul(blocksSinceLastUpdate).mul(ethers.utils.parseEther("1")).div(stakingData.totalStaked);
      const newReward = userStake.mul(rewardPerToken).div(ethers.utils.parseEther("1"));
      
      return (stakingData.userRewards[userAddress] || ethers.BigNumber.from(0)).add(newReward);
    }
    
    return stakingData.userRewards[userAddress] || ethers.BigNumber.from(0);
  }
  
  // 更新用户奖励
  function updateRewards(userAddress) {
    if (stakingData.totalStaked.gt(0)) {
      const blocksSinceLastUpdate = stakingData.blockNumber - stakingData.lastUpdateBlock;
      
      if (blocksSinceLastUpdate > 0) {
        // 更新用户奖励
        if (userAddress !== ethers.constants.AddressZero) {
          stakingData.userRewards[userAddress] = earned(userAddress);
        }
        
        // 更新上次更新区块
        stakingData.lastUpdateBlock = stakingData.blockNumber;
      }
    } else {
      stakingData.lastUpdateBlock = stakingData.blockNumber;
    }
  }
  
  // 调整奖励率
  function adjustRewardRate() {
    if (stakingData.totalStaked.eq(0)) {
      stakingData.rewardRate = ethers.utils.parseEther("100"); // 重置为基础奖励率
      return;
    }
    
    // 动态调整奖励率
    // 1. 基础奖励率100
    // 2. 随着总质押量增加，每代币奖励减少，但总奖励增加
    // 3. 使用对数模型
    
    const totalStakedEther = stakingData.totalStaked.div(ethers.utils.parseEther("1"));
    let logFactor = 0;
    
    // 简化的对数计算
    let value = totalStakedEther.toNumber();
    while (value >= 10) {
      value /= 10;
      logFactor++;
    }
    
    const newRate = ethers.utils.parseEther("100").mul(1 + logFactor);
    stakingData.rewardRate = newRate;
  }
  
  // 模拟区块推进
  function simulateBlockAdvance(blocks) {
    stakingData.blockNumber += blocks;
  }
  
  // 获取用户质押余额
  function balanceOf(userAddress) {
    return stakingData.userStakes[userAddress] || ethers.BigNumber.from(0);
  }

  describe("LP代币质押奖励闭环", function () {
    it("LP提供者应该能质押LP代币并获取额外奖励", async function () {
      // 1. 模拟提供流动性获取LP代币
      const liquidityAmount = ethers.utils.parseEther("100000"); // 流动性提供者提供的RWA数量
      
      // 交易者转移代币到交易所
      await rwa.connect(trader).transfer(exchange.address, liquidityAmount);
      
      // 交易所给流动性提供者铸造LP代币
      const lpTokenAmount = ethers.utils.parseEther("50000"); // 获得的LP代币
      await lpToken.mint(liquidityProvider1.address, lpTokenAmount);
      await lpToken.mint(liquidityProvider2.address, lpTokenAmount.div(2));
      
      // 2. 质押LP代币
      // LP1 质押全部代币
      await stake(liquidityProvider1, lpTokenAmount);
      
      // LP2 质押一半代币
      const lp2StakeAmount = lpTokenAmount.div(4);
      await stake(liquidityProvider2, lp2StakeAmount);
      
      // 3. 验证质押成功
      expect(balanceOf(liquidityProvider1.address)).to.equal(lpTokenAmount);
      expect(balanceOf(liquidityProvider2.address)).to.equal(lp2StakeAmount);
      
      // 4. 等待奖励累积（模拟区块时间流逝）
      simulateBlockAdvance(1000); // 假设过了1000个区块
      
      // 5. 查询可领取的奖励
      const rewards1 = earned(liquidityProvider1.address);
      const rewards2 = earned(liquidityProvider2.address);
      
      // 验证LP1的奖励是LP2的4倍左右（因为质押量是4倍）
      expect(rewards1).to.be.gt(rewards2.mul(3)); // 允许一定误差，所以用3而不是4
      
      // 6. 领取奖励
      await getReward(liquidityProvider1);
      
      // 验证奖励到账
      const lp1RwaBalance = await rwa.balanceOf(liquidityProvider1.address);
      expect(lp1RwaBalance).to.equal(rewards1);
      
      // 7. LP1增加质押
      const additionalStake = ethers.utils.parseEther("10000");
      await lpToken.mint(liquidityProvider1.address, additionalStake);
      await stake(liquidityProvider1, additionalStake);
      
      // 8. LP2提取部分质押
      const withdrawAmount = lp2StakeAmount.div(2);
      await withdraw(liquidityProvider2, withdrawAmount);
      
      // 验证LP2的质押余额减少
      expect(balanceOf(liquidityProvider2.address)).to.equal(lp2StakeAmount.sub(withdrawAmount));
      
      // 9. 再次等待奖励累积
      simulateBlockAdvance(500);
      
      // 10. 退出质押（提取所有质押和奖励）
      await exit(liquidityProvider2);
      
      // 验证LP2的质押已清零
      expect(balanceOf(liquidityProvider2.address)).to.equal(ethers.BigNumber.from(0));
      
      // LP2获得了奖励
      expect(await rwa.balanceOf(liquidityProvider2.address)).to.be.gt(0);
      
      // 11. LP1使用奖励代币再投入流动性
      const reinvestAmount = lp1RwaBalance.div(2);
      await rwa.connect(liquidityProvider1).transfer(exchange.address, reinvestAmount);
      
      // 再次获得LP代币（模拟）
      const newLpTokenAmount = ethers.utils.parseEther("5000");
      await lpToken.mint(liquidityProvider1.address, newLpTokenAmount);
      
      // 将新LP代币再次质押
      await stake(liquidityProvider1, newLpTokenAmount);
      
      // 验证闭环完成：LP1的质押总量增加
      expect(balanceOf(liquidityProvider1.address)).to.equal(
        lpTokenAmount.add(additionalStake).add(newLpTokenAmount)
      );
    });
  });

  describe("动态奖励率调整闭环", function () {
    it("质押池的奖励率应根据总质押量动态调整", async function () {
      // 1. 记录初始奖励率
      const initialRate = stakingData.rewardRate;
      
      // 2. 第一个LP质押较少量
      const smallStake = ethers.utils.parseEther("10000");
      await lpToken.mint(liquidityProvider1.address, smallStake);
      await stake(liquidityProvider1, smallStake);
      
      // 等待一段时间
      simulateBlockAdvance(100);
      
      // 记录第一个LP的奖励
      const earlyRewards = earned(liquidityProvider1.address);
      const earlyRewardRate = earlyRewards.div(100); // 每区块平均奖励
      
      // 3. 更多LP参与质押，总质押量大幅增加
      const largeStake = ethers.utils.parseEther("500000");
      await lpToken.mint(liquidityProvider2.address, largeStake);
      await stake(liquidityProvider2, largeStake);
      
      // 等待相同的时间
      simulateBlockAdvance(100);
      
      // 4. 验证奖励率已根据总质押量调整
      const newRewardRate = stakingData.rewardRate;
      expect(newRewardRate).to.not.equal(initialRate); // 奖励率应该变化
      
      // 5. 第一个LP的单位时间奖励率应降低（因为总质押量增加）
      // 更新奖励计算
      updateRewards(liquidityProvider1.address);
      
      const laterRewards = earned(liquidityProvider1.address).sub(earlyRewards);
      const laterRewardRate = laterRewards.div(100); // 每区块平均新增奖励
      
      // 单位质押量的奖励率应降低
      expect(laterRewardRate.mul(largeStake).div(smallStake)).to.be.lt(earlyRewardRate.mul(largeStake).div(smallStake));
      
      // 6. LP1退出质押
      await exit(liquidityProvider1);
      
      // 7. 再次等待奖励累积
      simulateBlockAdvance(100);
      
      // 8. LP2查看奖励
      const finalRewards = earned(liquidityProvider2.address);
      expect(finalRewards).to.be.gt(0);
      
      // 9. 奖励调整闭环完成
      await getReward(liquidityProvider2);
      expect(await rwa.balanceOf(liquidityProvider2.address)).to.equal(finalRewards);
    });
  });
}); 