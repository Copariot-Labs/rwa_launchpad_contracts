// SPDX-License-Identifier: MIT
require('dotenv').config();
const { ethers } = require("hardhat");
const config = require("./config");

async function main() {
  console.log(`Deploying RWA-DEX protocol contracts to ${config.network}...`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  
  // Deploy basic tokens
  console.log("\n1. Deploying basic tokens...");
  
  // 1.1 Deploy RWA token
  let rwa;
  if (config.rwa) {
    console.log(`Using existing RWA token at: ${config.rwa}`);
    rwa = await ethers.getContractAt("RWA", config.rwa);
  } else {
    const RWA = await ethers.getContractFactory("RWA");
    rwa = await RWA.deploy();
    await rwa.deployed();
    console.log(`RWA token deployed to: ${rwa.address}`);
  }
  
  // 1.2 Deploy prRWA token
  let prRWA;
  if (config.prRWA) {
    console.log(`Using existing prRWA token at: ${config.prRWA}`);
    prRWA = await ethers.getContractAt("prRWA", config.prRWA);
  } else {
    const PrRWA = await ethers.getContractFactory("prRWA");
    prRWA = await PrRWA.deploy();
    await prRWA.deployed();
    console.log(`prRWA token deployed to: ${prRWA.address}`);
  }
  
  // 1.3 Deploy StableRwa token
  let stableRwa;
  if (config.stableRwa) {
    console.log(`Using existing StableRwa token at: ${config.stableRwa}`);
    stableRwa = await ethers.getContractAt("StableRwa", config.stableRwa);
  } else {
    const StableRwa = await ethers.getContractFactory("StableRwa");
    stableRwa = await StableRwa.deploy();
    await stableRwa.deployed();
    console.log(`StableRwa token deployed to: ${stableRwa.address}`);
  }
  
  console.log("\nDeployment completed successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 