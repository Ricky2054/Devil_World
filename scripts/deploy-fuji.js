import hre from "hardhat";

async function main() {
  console.log("Deploying contracts to Avalanche Fuji testnet...");

  try {
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Get balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "AVAX");

    // Deploy AVAX Staking Contract
    console.log("Deploying AVAX Staking Contract...");
    const AVAXStaking = await hre.ethers.getContractFactory("AVAXStaking");
    const avaxStaking = await AVAXStaking.deploy();
    await avaxStaking.waitForDeployment();
    console.log("AVAX Staking deployed to:", await avaxStaking.getAddress());

    // Deploy Crypto Island NFT Contract
    console.log("Deploying Crypto Island NFT Contract...");
    const CryptoIslandNFT = await hre.ethers.getContractFactory("CryptoIslandNFT");
    const cryptoIslandNFT = await CryptoIslandNFT.deploy();
    await cryptoIslandNFT.waitForDeployment();
    console.log("Crypto Island NFT deployed to:", await cryptoIslandNFT.getAddress());

    // Deploy Crypto Island Token Contract
    console.log("Deploying Crypto Island Token Contract...");
    const CryptoIslandToken = await hre.ethers.getContractFactory("CryptoIslandToken");
    const cryptoIslandToken = await CryptoIslandToken.deploy();
    await cryptoIslandToken.waitForDeployment();
    console.log("Crypto Island Token deployed to:", await cryptoIslandToken.getAddress());

    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log("Contract Addresses:");
    console.log("STAKING:", await avaxStaking.getAddress());
    console.log("NFT:", await cryptoIslandNFT.getAddress());
    console.log("TOKEN:", await cryptoIslandToken.getAddress());
    
    console.log("\n=== SNOWTRACE LINKS ===");
    console.log("AVAX Staking:", `https://testnet.snowtrace.io/address/${await avaxStaking.getAddress()}`);
    console.log("Crypto Island NFT:", `https://testnet.snowtrace.io/address/${await cryptoIslandNFT.getAddress()}`);
    console.log("Crypto Island Token:", `https://testnet.snowtrace.io/address/${await cryptoIslandToken.getAddress()}`);
  } catch (error) {
    console.error("Deployment failed:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  });
