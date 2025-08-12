const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token Advanced Business Scenarios", function () {
  let rwa;
  let owner;
  let exchange;
  let treasury;
  let community;
  let dao;
  let investor1;
  let investor2;
  let retailUsers;
  let initialMint;

  beforeEach(async function () {
    // 获取测试账户
    const signers = await ethers.getSigners();
    owner = signers[0];
    exchange = signers[1];
    treasury = signers[2];
    community = signers[3];
    dao = signers[4];
    investor1 = signers[5];
    investor2 = signers[6];
    retailUsers = signers.slice(7, 12); // 5个零售用户

    // 部署合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 初始铸造一定数量的代币
    initialMint = ethers.utils.parseEther("10000000"); // 一千万代币
    await rwa.mint(treasury.address, initialMint);
  });

  describe("事件验证", function () {
    it("应该在关键操作中正确触发事件", async function () {
      // 测试铸造事件
      const mintAmount = ethers.utils.parseEther("1000000");
      await expect(rwa.mint(investor1.address, mintAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(ethers.constants.AddressZero, investor1.address, mintAmount);

      // 测试转账事件
      const transferAmount = ethers.utils.parseEther("50000");
      await expect(rwa.connect(investor1).transfer(investor2.address, transferAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(investor1.address, investor2.address, transferAmount);

      // 测试批准事件
      const approveAmount = ethers.utils.parseEther("25000");
      await expect(rwa.connect(investor1).approve(owner.address, approveAmount))
        .to.emit(rwa, "Approval")
        .withArgs(investor1.address, owner.address, approveAmount);
      
      // 测试销毁事件
      await expect(rwa.burnFrom(investor1.address, approveAmount))
        .to.emit(rwa, "Transfer")
        .withArgs(investor1.address, ethers.constants.AddressZero, approveAmount);
    });
  });

  describe("批量操作", function () {
    it("应该能处理多用户批量交易场景", async function () {
      // 给每个用户铸造代币
      const userAmount = ethers.utils.parseEther("10000");
      const promises = [];
      
      for (const user of retailUsers) {
        promises.push(rwa.mint(user.address, userAmount));
      }
      
      await Promise.all(promises);
      
      // 验证铸造成功
      for (const user of retailUsers) {
        expect(await rwa.balanceOf(user.address)).to.equal(userAmount);
      }
      
      // 批量转账到交易所
      const transferPromises = [];
      const transferAmount = ethers.utils.parseEther("5000");
      
      for (const user of retailUsers) {
        transferPromises.push(rwa.connect(user).transfer(exchange.address, transferAmount));
      }
      
      await Promise.all(transferPromises);
      
      // 验证转账成功
      for (const user of retailUsers) {
        expect(await rwa.balanceOf(user.address)).to.equal(userAmount.sub(transferAmount));
      }
      
      const exchangeBalance = await rwa.balanceOf(exchange.address);
      expect(exchangeBalance).to.equal(transferAmount.mul(retailUsers.length));
    });
  });

  describe("跨生态应用场景", function () {
    it("应该能模拟跨生态系统的代币流通", async function () {
      // 分配代币到各系统
      const systemAmount = ethers.utils.parseEther("1000000");
      await rwa.mint(dao.address, systemAmount); // DAO
      await rwa.mint(community.address, systemAmount); // 社区
      await rwa.mint(exchange.address, systemAmount); // 交易所
      
      // 模拟平台之间代币流动
      // 用户从交易所购买代币
      const userPurchase = ethers.utils.parseEther("5000");
      await rwa.connect(exchange).transfer(retailUsers[0].address, userPurchase);
      
      // 用户将代币质押到DAO
      await rwa.connect(retailUsers[0]).transfer(dao.address, userPurchase);
      
      // DAO发放奖励给用户
      const rewardAmount = ethers.utils.parseEther("1000");
      await rwa.connect(dao).transfer(retailUsers[0].address, rewardAmount);
      
      // 用户拿出一部分参与社区活动
      const communityContribution = ethers.utils.parseEther("500");
      await rwa.connect(retailUsers[0]).transfer(community.address, communityContribution);
      
      // 社区用户获得社区激励
      const communityReward = ethers.utils.parseEther("1500");
      await rwa.connect(community).transfer(retailUsers[0].address, communityReward);
      
      // 最终用户余额验证
      const expectedBalance = rewardAmount.add(communityReward).sub(communityContribution);
      expect(await rwa.balanceOf(retailUsers[0].address)).to.equal(expectedBalance);
      
      // 验证各生态系统存量
      expect(await rwa.balanceOf(dao.address)).to.equal(systemAmount.add(userPurchase).sub(rewardAmount));
      expect(await rwa.balanceOf(community.address)).to.equal(systemAmount.add(communityContribution).sub(communityReward));
    });
  });

  describe("极端权限与错误处理", function () {
    it("应该正确处理权限错误和拒绝非法操作", async function () {
      // 1. 非owner尝试铸造代币（应失败）
      await expect(
        rwa.connect(retailUsers[0]).mint(retailUsers[0].address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // 2. 没有授权情况下尝试burnFrom（应失败）
      const amount = ethers.utils.parseEther("1000");
      await rwa.mint(retailUsers[0].address, amount);
      
      await expect(
        rwa.burnFrom(retailUsers[0].address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
      
      // 3. 转移超过余额的代币（应失败）
      const balance = await rwa.balanceOf(retailUsers[0].address);
      await expect(
        rwa.connect(retailUsers[0]).transfer(retailUsers[1].address, balance.add(1))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      
      // 4. 转移到0地址（应失败）
      await expect(
        rwa.connect(retailUsers[0]).transfer(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20: transfer to the zero address");
      
      // 5. 从0地址授权（应失败）
      await expect(
        rwa.connect(retailUsers[0]).approve(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20: approve to the zero address");
    });
  });

  describe("链上组合场景", function () {
    it("应该支持复杂的代币操作组合", async function () {
      // 1. 准备初始状态
      const amount = ethers.utils.parseEther("100000");
      await rwa.mint(retailUsers[0].address, amount.mul(2));
      
      // 2. 用户对多个地址进行批准
      await rwa.connect(retailUsers[0]).approve(investor1.address, amount.div(2));
      await rwa.connect(retailUsers[0]).approve(investor2.address, amount.div(4));
      
      // 3. 两个被授权账户分别转移代币
      await rwa.connect(investor1).transferFrom(
        retailUsers[0].address, treasury.address, amount.div(4)
      );
      await rwa.connect(investor2).transferFrom(
        retailUsers[0].address, community.address, amount.div(8)
      );
      
      // 4. 检查授权余额
      expect(await rwa.allowance(retailUsers[0].address, investor1.address))
        .to.equal(amount.div(2).sub(amount.div(4)));
      expect(await rwa.allowance(retailUsers[0].address, investor2.address))
        .to.equal(amount.div(4).sub(amount.div(8)));
      
      // 5. 用户再次批准并增加授权额度
      await rwa.connect(retailUsers[0]).approve(investor1.address, amount.div(2).add(amount.div(8)));
      
      // 6. 最终授权检查
      expect(await rwa.allowance(retailUsers[0].address, investor1.address))
        .to.equal(amount.div(2).add(amount.div(8)));
      
      // 7. 验证各账户余额
      expect(await rwa.balanceOf(retailUsers[0].address)).to.equal(
        amount.mul(2).sub(amount.div(4)).sub(amount.div(8))
      );
      expect(await rwa.balanceOf(treasury.address)).to.equal(
        initialMint.add(amount.div(4))
      );
      expect(await rwa.balanceOf(community.address)).to.equal(amount.div(8));
    });
  });

  describe("合约所有权转移", function () {
    it("应该能安全转移合约所有权", async function () {
      // 1. 验证初始所有者
      expect(await rwa.owner()).to.equal(owner.address);
      
      // 2. 转移所有权
      await rwa.transferOwnership(treasury.address);
      expect(await rwa.owner()).to.equal(treasury.address);
      
      // 3. 验证新所有者可以进行特权操作
      const mintAmount = ethers.utils.parseEther("5000");
      await rwa.connect(treasury).mint(investor1.address, mintAmount);
      expect(await rwa.balanceOf(investor1.address)).to.equal(mintAmount);
      
      // 4. 验证旧所有者无法进行特权操作
      await expect(
        rwa.mint(investor2.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      // 5. 验证非所有者无法转移所有权
      await expect(
        rwa.connect(investor1).transferOwnership(investor2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 