const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token", function () {
  let RWA;
  let rwa;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // 部署合约
    RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await rwa.owner()).to.equal(owner.address);
    });

    it("Should assign the correct name and symbol", async function () {
      expect(await rwa.name()).to.equal("RWA");
      expect(await rwa.symbol()).to.equal("RWA");
    });

    it("Should start with zero total supply", async function () {
      expect(await rwa.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      await rwa.mint(addr1.address, mintAmount);
      expect(await rwa.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.utils.parseEther("1000");
      await expect(
        rwa.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Burning", function () {
    const burnAmount = ethers.utils.parseEther("100");

    beforeEach(async function () {
      // 先铸造一些代币给测试账户
      await rwa.mint(addr1.address, burnAmount);
    });

    it("Should allow owner to burn tokens", async function () {
      // 将代币转给 owner
      await rwa.connect(addr1).transfer(owner.address, burnAmount);
      await rwa.burn(burnAmount);
      expect(await rwa.balanceOf(owner.address)).to.equal(0);
    });

    it("Should not allow non-owner to burn tokens", async function () {
      await expect(
        rwa.connect(addr2).burn(burnAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("BurnFrom", function () {
    const amount = ethers.utils.parseEther("100");

    beforeEach(async function () {
      // 先铸造一些代币给测试账户
      await rwa.mint(addr1.address, amount);
      // 授权给 owner
      await rwa.connect(addr1).approve(owner.address, amount);
    });

    it("Should allow owner to burnFrom with allowance", async function () {
      await rwa.burnFrom(addr1.address, amount);
      expect(await rwa.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should not allow non-owner to burnFrom", async function () {
      await expect(
        rwa.connect(addr2).burnFrom(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow burnFrom without allowance", async function () {
      await rwa.connect(addr1).approve(owner.address, 0);
      await expect(
        rwa.burnFrom(addr1.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
}); 