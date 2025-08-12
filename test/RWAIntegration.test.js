const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token Integration Tests", function () {
  let rwa;
  let owner;
  let trader1;
  let trader2;
  let trader3;
  let addrs;
  let initialMint;

  beforeEach(async function () {
    // 获取测试账户
    [owner, trader1, trader2, trader3, ...addrs] = await ethers.getSigners();

    // 部署合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 初始发行一些代币给不同账户
    initialMint = ethers.utils.parseEther("1000000");
    await rwa.mint(trader1.address, initialMint);
    await rwa.mint(trader2.address, initialMint.div(2));
    await rwa.mint(trader3.address, initialMint.div(4));
  });

  describe("Complete token lifecycle", function () {
    it("Should support full token lifecycle with mint, transfer, approval, and burn", async function () {
      // 检查初始状态
      expect(await rwa.totalSupply()).to.equal(
        initialMint.add(initialMint.div(2)).add(initialMint.div(4))
      );
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint);
      
      // 1. trader1 转移一部分代币给 trader2
      const transferAmount = ethers.utils.parseEther("50000");
      await rwa.connect(trader1).transfer(trader2.address, transferAmount);
      
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint.sub(transferAmount));
      expect(await rwa.balanceOf(trader2.address)).to.equal(initialMint.div(2).add(transferAmount));
      
      // 2. trader2 授权 owner 使用一部分代币
      const approveAmount = ethers.utils.parseEther("25000");
      await rwa.connect(trader2).approve(owner.address, approveAmount);
      expect(await rwa.allowance(trader2.address, owner.address)).to.equal(approveAmount);
      
      // 3. owner 通过 burnFrom 销毁 trader2 授权的代币
      await rwa.burnFrom(trader2.address, approveAmount);
      expect(await rwa.balanceOf(trader2.address)).to.equal(
        initialMint.div(2).add(transferAmount).sub(approveAmount)
      );
      expect(await rwa.allowance(trader2.address, owner.address)).to.equal(0);
      
      // 4. owner 给自己铸造代币然后销毁
      const ownerMintAmount = ethers.utils.parseEther("100000");
      await rwa.mint(owner.address, ownerMintAmount);
      expect(await rwa.balanceOf(owner.address)).to.equal(ownerMintAmount);
      
      await rwa.burn(ownerMintAmount.div(2));
      expect(await rwa.balanceOf(owner.address)).to.equal(ownerMintAmount.div(2));
      
      // 5. 检查最终的总供应量
      const expectedFinalSupply = initialMint.add(initialMint.div(2)).add(initialMint.div(4))
        .sub(approveAmount)
        .add(ownerMintAmount)
        .sub(ownerMintAmount.div(2));
      
      expect(await rwa.totalSupply()).to.equal(expectedFinalSupply);
    });
  });

  describe("Multi-user interactions", function () {
    it("Should handle complex token circulation between multiple users", async function () {
      // 1. 创建一个交易网络，让代币在多个账户间流通
      // trader1 -> trader2 -> trader3 -> trader1 (形成一个环)
      const amount = ethers.utils.parseEther("10000");
      
      await rwa.connect(trader1).transfer(trader2.address, amount);
      await rwa.connect(trader2).transfer(trader3.address, amount);
      await rwa.connect(trader3).transfer(trader1.address, amount);
      
      // 所有交易后，trader1 的余额应该回到原值
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint);
      
      // 2. 每个用户都给下一个用户一些授权
      await rwa.connect(trader1).approve(trader2.address, amount);
      await rwa.connect(trader2).approve(trader3.address, amount);
      await rwa.connect(trader3).approve(trader1.address, amount);
      
      // 3. 使用 transferFrom 代表其他用户转账
      await rwa.connect(trader2).transferFrom(trader1.address, trader3.address, amount);
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint.sub(amount));
      expect(await rwa.balanceOf(trader3.address)).to.equal(initialMint.div(4).add(amount));
      
      // 4. owner 给自己铸造一些代币，然后分发给所有用户
      const distributionAmount = ethers.utils.parseEther("5000");
      await rwa.mint(owner.address, distributionAmount.mul(3));
      
      await rwa.transfer(trader1.address, distributionAmount);
      await rwa.transfer(trader2.address, distributionAmount);
      await rwa.transfer(trader3.address, distributionAmount);
      
      // 5. 检查最终余额
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint.sub(amount).add(distributionAmount));
      expect(await rwa.balanceOf(trader2.address)).to.equal(initialMint.div(2).add(distributionAmount));
      expect(await rwa.balanceOf(trader3.address)).to.equal(initialMint.div(4).add(amount).add(distributionAmount));
      expect(await rwa.balanceOf(owner.address)).to.equal(0);
    });
  });

  describe("Owner privileges and restrictions", function () {
    it("Should verify ownership controls throughout various operations", async function () {
      // 1. owner可以为自己铸造代币
      const ownerAmount = ethers.utils.parseEther("500000");
      await rwa.mint(owner.address, ownerAmount);
      
      // 2. trader1授权owner使用代币
      const allowanceAmount = ethers.utils.parseEther("200000");
      await rwa.connect(trader1).approve(owner.address, allowanceAmount);
      
      // 3. owner可以通过transferFrom从trader1转移代币给trader3
      const transferAmount = ethers.utils.parseEther("150000");
      await rwa.connect(owner).transferFrom(trader1.address, trader3.address, transferAmount);
      
      // 4. 尝试转移超出授权的金额应该失败
      const excessAmount = ethers.utils.parseEther("51000"); // 超出剩余授权
      await expect(
        rwa.connect(owner).transferFrom(trader1.address, trader3.address, excessAmount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
      
      // 5. owner可以burnFrom具有授权的trader1账户
      const burnAmount = ethers.utils.parseEther("50000"); // 剩余授权额度
      await rwa.burnFrom(trader1.address, burnAmount);
      
      // 检查最终状态
      expect(await rwa.balanceOf(trader1.address)).to.equal(
        initialMint.sub(transferAmount).sub(burnAmount)
      );
      expect(await rwa.allowance(trader1.address, owner.address)).to.equal(0);
      
      // 6. 其他用户不能执行owner的特权操作
      await expect(
        rwa.connect(trader2).mint(trader2.address, ownerAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        rwa.connect(trader3).burn(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge cases", function () {
    it("Should handle extreme values and special scenarios", async function () {
      // 1. 铸造极大数量的代币（接近uint256上限但不超过）
      const largeAmount = ethers.constants.MaxUint256.div(2); // 使用一半的最大值以避免溢出
      await rwa.mint(trader1.address, largeAmount);
      expect(await rwa.balanceOf(trader1.address)).to.equal(initialMint.add(largeAmount));
      
      // 2. 授权极大数量
      await rwa.connect(trader1).approve(owner.address, largeAmount);
      expect(await rwa.allowance(trader1.address, owner.address)).to.equal(largeAmount);
      
      // 3. 转移0数量的代币（应该成功但不改变余额）
      const balanceBefore = await rwa.balanceOf(trader1.address);
      await rwa.connect(trader1).transfer(trader2.address, 0);
      expect(await rwa.balanceOf(trader1.address)).to.equal(balanceBefore);
      
      // 4. 铸造0数量代币
      const totalSupplyBefore = await rwa.totalSupply();
      await rwa.mint(trader3.address, 0);
      expect(await rwa.totalSupply()).to.equal(totalSupplyBefore);
      
      // 5. 尝试销毁超过余额的代币（应该失败）
      await expect(
        rwa.connect(owner).burn(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });
}); 