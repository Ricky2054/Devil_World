import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("Deploying to local Avalanche (C-Chain/Subnet-EVM)...\n");

  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:9650/ext/bc/C/rpc";
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in environment");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log("RPC:", rpcUrl, "chainId:", Number(network.chainId));

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer:", wallet.address);
  const bal = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(bal), "AVAX");

  // Manage nonces explicitly to avoid "nonce too low" errors on fast local chains
  let nextNonce = await provider.getTransactionCount(wallet.address, "pending");

  // Deploy ERC-20
  const tokenArtifact = await hre.artifacts.readArtifact("CryptoIslandToken");
  const TokenFactory = new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, wallet);
  const token = await TokenFactory.deploy({ nonce: nextNonce++ });
  await token.waitForDeployment();
  console.log("CryptoIslandToken:", await token.getAddress());

  // Initialize initial supply once (owner-only)
  const txInit = await token.initializeSupply(wallet.address, { nonce: nextNonce++ });
  await txInit.wait();
  console.log("Initialized initial supply ->", await token.totalSupply());

  // Deploy Staking
  const stakingArtifact = await hre.artifacts.readArtifact("AVAXStaking");
  const StakingFactory = new ethers.ContractFactory(stakingArtifact.abi, stakingArtifact.bytecode, wallet);
  const staking = await StakingFactory.deploy({ nonce: nextNonce++ });
  await staking.waitForDeployment();
  console.log("AVAXStaking:", await staking.getAddress());

  // Deploy NFT
  const nftArtifact = await hre.artifacts.readArtifact("CryptoIslandNFT");
  const NFTFactory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode, wallet);
  const nft = await NFTFactory.deploy({ nonce: nextNonce++ });
  await nft.waitForDeployment();
  console.log("CryptoIslandNFT:", await nft.getAddress());

  console.log("\nDeployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


