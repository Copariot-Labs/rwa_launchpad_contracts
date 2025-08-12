// SPDX-License-Identifier: MIT
require('dotenv').config();
const { run } = require("hardhat");
const config = require("./config");

async function main() {
  console.log(`Verifying RWA Launchpad protocol contracts on ${config.network}...`);
  
  // Check if we have all the required contract addresses
  if (!config.hasDeployedContracts()) {
    console.error("Missing contract addresses in .env file. Please run deploy.js first.");
    process.exit(1);
  }
  
  // Verify all deployed contracts
  console.log("\nStarting verification process...");
  
  // 1. Verify basic tokens
  try {
    console.log("\n1. Verifying RWA token...");
    await run("verify:verify", {
      address: config.rwa,
      constructorArguments: [],
    });
    console.log("RWA token verification successful!");
  } catch (error) {
    console.log(`Failed to verify RWA token: ${error.message}`);
  }
  
  try {
    console.log("\n2. Verifying prRWA token...");
    await run("verify:verify", {
      address: config.prRWA,
      constructorArguments: [],
    });
    console.log("prRWA token verification successful!");
  } catch (error) {
    console.log(`Failed to verify prRWA token: ${error.message}`);
  }
  
  try {
    console.log("\n3. Verifying STABLE_RWA token...");
    await run("verify:verify", {
      address: config.stableRwa,
      constructorArguments: [],
    });
    console.log("STABLE_RWA token verification successful!");
  } catch (error) {
    console.log(`Failed to verify STABLE_RWA token: ${error.message}`);
  }
  
  // 4. Verify Helper contract
  try {
    console.log("\n4. Verifying Helper contract...");
    await run("verify:verify", {
      address: config.helper,
      constructorArguments: [
        config.rwa,
        config.prRWA,
        config.stableRwa,
        config.marketProxy,
        config.bankProxy,
        config.stakePoolProxy
      ],
    });
    console.log("Helper contract verification successful!");
  } catch (error) {
    console.log(`Failed to verify Helper contract: ${error.message}`);
  }
  
  // 5. Verify GLA contract
  try {
    console.log("\n5. Verifying GLA contract...");
    await run("verify:verify", {
      address: config.gla,
      constructorArguments: [
        config.rwa,
        config.usdc,
        config.marketProxy,
        config.gla.beforeWhitelistInterval,
        config.gla.whitelistInterval,
        config.gla.publicOfferingInterval,
        config.gla.initInterval,
        config.gla.whitelistPrice,
        config.gla.publicOfferingPrice,
        config.gla.softCap,
        config.gla.hardCap,
        config.gla.whitelistMaxCapPerUser
      ],
    });
    console.log("GLA contract verification successful!");
  } catch (error) {
    console.log(`Failed to verify GLA contract: ${error.message}`);
  }
  
  // For proxy contracts, we need to use a different approach
  // These can be verified through the block explorer interface or
  // by using custom verification tools that support proxy contracts
  
  console.log("\nVerification for proxy contracts:");
  console.log("Market Proxy: Manual verification required");
  console.log("StakePool Proxy: Manual verification required");
  console.log("Bank Proxy: Manual verification required");
  
  console.log("\nRWA Launchpad protocol verification complete!");
}

// Execute the verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 