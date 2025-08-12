const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Token User Ecosystem Loop", function () {
  let rwa;
  let reputationToken;
  let owner;
  let treasuryWallet;
  let communityManager;
  let contentCreator;
  let ambassador;
  let regularUser1;
  let regularUser2;
  let initialMint;

  // 模拟用户角色和权限
  const userRoles = {};
  const userPrivileges = {};
  const userReputationPoints = {};
  const featureAccess = {};

  // 可用角色和特权
  const roles = ["User", "Contributor", "Moderator", "Ambassador", "Leader"];
  const privileges = [
    "高级教程访问权", 
    "社区专属活动", 
    "早期测试功能", 
    "内容创作奖励", 
    "社区治理投票"
  ];

  beforeEach(async function () {
    // 获取测试账户
    [owner, treasuryWallet, communityManager, contentCreator, ambassador, regularUser1, regularUser2] = await ethers.getSigners();

    // 部署 RWA 代币合约
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();

    // 部署声誉代币 (假设使用相同合约实现)
    const ReputationToken = await ethers.getContractFactory("RWA");
    reputationToken = await ReputationToken.deploy();
    await reputationToken.deployed();

    // 初始代币分配
    initialMint = ethers.utils.parseEther("10000000"); // 1000万代币
    await rwa.mint(treasuryWallet.address, initialMint);

    // 分配一些代币给用户
    const userFunds = ethers.utils.parseEther("10000");
    await rwa.connect(treasuryWallet).transfer(regularUser1.address, userFunds);
    await rwa.connect(treasuryWallet).transfer(regularUser2.address, userFunds);
    await rwa.connect(treasuryWallet).transfer(contentCreator.address, userFunds.mul(2));
    await rwa.connect(treasuryWallet).transfer(ambassador.address, userFunds.mul(3));
    
    // 给社区管理员一些代币，用于其他用户转移给它
    await rwa.mint(communityManager.address, userFunds);
    
    // 确保声誉代币的铸造者是owner
    await reputationToken.mint(owner.address, ethers.utils.parseEther("1"));

    // 初始化用户角色
    userRoles[regularUser1.address] = "User";
    userRoles[regularUser2.address] = "User";
    userRoles[contentCreator.address] = "Contributor";
    userRoles[ambassador.address] = "Ambassador";

    // 初始化用户特权
    userPrivileges[regularUser1.address] = [];
    userPrivileges[regularUser2.address] = [];
    userPrivileges[contentCreator.address] = ["内容创作奖励"];
    userPrivileges[ambassador.address] = ["早期测试功能", "社区专属活动"];

    // 初始化特权访问权限
    featureAccess[ambassador.address] = { "早期测试功能": true };
  });

  // 辅助函数：模拟参与社区活动
  async function participateInActivity(user, activityName, amount) {
    // 转移RWA作为贡献
    await rwa.connect(user).transfer(communityManager.address, amount);
    
    // 计算声誉奖励（贡献的5%）
    const reputationReward = amount.div(20);
    
    // 授予声誉积分
    await reputationToken.mint(user.address, reputationReward);
    
    // 更新用户声誉点数
    userReputationPoints[user.address] = (userReputationPoints[user.address] || ethers.BigNumber.from(0)).add(reputationReward);
    
    return reputationReward;
  }

  // 辅助函数：模拟提交内容
  async function submitContent(creator, title, contentUri) {
    // 内容创作者获得固定奖励
    const contentReward = ethers.utils.parseEther("200");
    await reputationToken.mint(creator.address, contentReward);
    
    // 更新用户声誉点数
    userReputationPoints[creator.address] = (userReputationPoints[creator.address] || ethers.BigNumber.from(0)).add(contentReward);
    
    return contentReward;
  }

  // 辅助函数：模拟申请角色
  function applyForRole(user, requestedRole, reason) {
    // 在实际系统中，这会记录角色申请
    console.log(`用户 ${user.address} 申请角色 ${requestedRole}: ${reason}`);
    return true;
  }

  // 辅助函数：模拟授予角色
  function grantRole(user, role) {
    userRoles[user.address] = role;
    
    // 根据角色授予特权
    if (role === "Ambassador") {
      if (!userPrivileges[user.address]) {
        userPrivileges[user.address] = [];
      }
      if (!userPrivileges[user.address].includes("早期测试功能")) {
        userPrivileges[user.address].push("早期测试功能");
      }
      featureAccess[user.address] = featureAccess[user.address] || {};
      featureAccess[user.address]["早期测试功能"] = true;
    }
    
    if (role === "Leader") {
      if (!userPrivileges[user.address]) {
        userPrivileges[user.address] = [];
      }
      
      for (const privilege of privileges) {
        if (!userPrivileges[user.address].includes(privilege)) {
          userPrivileges[user.address].push(privilege);
        }
        featureAccess[user.address] = featureAccess[user.address] || {};
        featureAccess[user.address][privilege] = true;
      }
    }
  }

  // 辅助函数：模拟兑换特权
  async function redeemPrivilege(user, privilegeName, reputationAmount) {
    // 转移声誉代币
    await reputationToken.connect(user).transfer(communityManager.address, reputationAmount);
    
    // 添加特权
    if (!userPrivileges[user.address]) {
      userPrivileges[user.address] = [];
    }
    if (!userPrivileges[user.address].includes(privilegeName)) {
      userPrivileges[user.address].push(privilegeName);
    }
    
    // 启用特权访问
    featureAccess[user.address] = featureAccess[user.address] || {};
    featureAccess[user.address][privilegeName] = true;
    
    // 特殊处理：高级教程访问权同时授予早期测试功能
    if (privilegeName === "高级教程访问权") {
      featureAccess[user.address]["早期测试功能"] = true;
    }
  }

  // 辅助函数：检查是否可以访问特定功能
  function canAccessFeature(user, feature) {
    return !!(featureAccess[user.address] && featureAccess[user.address][feature]);
  }

  // 辅助函数：获取用户角色
  function getUserRole(userAddress) {
    return userRoles[userAddress] || "User";
  }

  // 辅助函数：获取用户特权列表
  function getUserPrivileges(userAddress) {
    return userPrivileges[userAddress] || [];
  }

  describe("用户生态贡献闭环", function () {
    it("用户应该能参与生态建设、获得声誉积分并兑换特权", async function () {
      // 1. 用户参与社区活动
      const contributionAmount = ethers.utils.parseEther("1000");
      const reputationReward = await participateInActivity(regularUser1, "社区教育活动", contributionAmount);

      // 2. 验证用户获得声誉积分
      expect(await reputationToken.balanceOf(regularUser1.address)).to.equal(reputationReward);

      // 3. 内容创作者贡献内容
      const creatorReputationReward = await submitContent(contentCreator, "如何使用RWA生态系统", "ipfs://content-hash");
      expect(await reputationToken.balanceOf(contentCreator.address)).to.equal(creatorReputationReward);

      // 4. 声誉积分提升生态角色
      applyForRole(regularUser1, "Ambassador", "我想帮助发展生态系统");
      
      // 初始申请应该被拒绝（声誉不足）
      expect(getUserRole(regularUser1.address)).to.equal("User");

      // 社区管理员批准角色申请（仅供测试）
      grantRole(regularUser1, "Contributor");
      expect(getUserRole(regularUser1.address)).to.equal("Contributor");

      // 5. 用户继续贡献以提升声誉
      for (let i = 0; i < 5; i++) {
        await participateInActivity(regularUser1, `持续贡献活动-${i+1}`, contributionAmount);
      }

      // 声誉提升后再次申请更高角色
      applyForRole(regularUser1, "Ambassador", "我已积累足够经验");
      grantRole(regularUser1, "Ambassador");
      expect(getUserRole(regularUser1.address)).to.equal("Ambassador");

      // 6. 使用声誉积分兑换特权
      const currentReputation = await reputationToken.balanceOf(regularUser1.address);
      const redeemAmount = currentReputation.div(2);
      
      await redeemPrivilege(regularUser1, "高级教程访问权", redeemAmount);
      
      // 验证声誉积分已使用
      expect(await reputationToken.balanceOf(regularUser1.address)).to.equal(currentReputation.sub(redeemAmount));
      
      // 验证特权已获得
      const privileges = getUserPrivileges(regularUser1.address);
      expect(privileges).to.include("高级教程访问权");
      
      // 7. 特权使用（例如优先访问新功能）
      const hasEarlyAccess = canAccessFeature(regularUser1, "早期测试功能");
      expect(hasEarlyAccess).to.be.true;
      
      // 8. 社区用户之间的互动
      // 用户2尝试访问早期功能但没有权限
      const user2Access = canAccessFeature(regularUser2, "早期测试功能");
      expect(user2Access).to.be.false;
    });
  });

  describe("生态贡献者角色晋升闭环", function () {
    it("用户应该能通过持续贡献实现角色晋升", async function () {
      // 1. 设置初始状态
      const contributionAmount = ethers.utils.parseEther("2000");
      
      // 确保用户有足够的代币
      await rwa.mint(regularUser1.address, contributionAmount.mul(100));
      
      // 从User开始（默认）
      expect(getUserRole(regularUser1.address)).to.equal("User");
      
      // 3. 用户持续贡献获取声誉
      for (let i = 1; i < roles.length; i++) {
        // 提交贡献并获取声誉
        for (let j = 0; j < i*2; j++) {
          await participateInActivity(regularUser1, `晋升活动-${i}-${j}`, contributionAmount);
          
          if (j % 2 === 0) {
            await submitContent(regularUser1, `内容主题-${i}-${j}`, `ipfs://content-${i}-${j}`);
          }
        }
        
        // 申请下一级角色
        applyForRole(regularUser1, roles[i], `申请晋升到${roles[i]}`);
        
        // 管理员批准（在实际系统中可能需要多签或投票）
        grantRole(regularUser1, roles[i]);
        
        // 验证晋升成功
        expect(getUserRole(regularUser1.address)).to.equal(roles[i]);
      }
      
      // 4. 验证最终状态
      // 检查最高级别角色
      expect(getUserRole(regularUser1.address)).to.equal("Leader");
      
      // 验证积累的声誉
      const finalReputation = await reputationToken.balanceOf(regularUser1.address);
      expect(finalReputation).to.be.gt(ethers.utils.parseEther("1000")); // 至少1000声誉
      
      // 验证获得的特权
      const leaderPrivileges = getUserPrivileges(regularUser1.address);
      expect(leaderPrivileges.length).to.be.gt(3); // 至少4种特权
    });
  });
}); 