const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crypto Island Smart Contracts", function () {
  let avaxStaking, cryptoIslandNFT;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy AVAX Staking Contract
    const AVAXStaking = await ethers.getContractFactory("AVAXStaking");
    avaxStaking = await AVAXStaking.deploy();
    await avaxStaking.waitForDeployment();

    // Deploy NFT Contract
    const CryptoIslandNFT = await ethers.getContractFactory("CryptoIslandNFT");
    cryptoIslandNFT = await CryptoIslandNFT.deploy();
    await cryptoIslandNFT.waitForDeployment();

    // Fund staking contract with rewards
    await avaxStaking.fundRewards({ value: ethers.parseEther("1.0") });
  });

  describe("AVAX Staking Contract", function () {
    it("Should allow users to stake 0.001 AVAX", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      
      await expect(avaxStaking.connect(user1).stake({ value: stakeAmount }))
        .to.emit(avaxStaking, "Staked")
        .withArgs(user1.address, stakeAmount, await getCurrentTimestamp());

      const stakerInfo = await avaxStaking.getStakerInfo(user1.address);
      expect(stakerInfo.stakedAmount).to.equal(stakeAmount);
      expect(stakerInfo.isStaking).to.be.true;
    });

    it("Should reject stakes below minimum", async function () {
      const stakeAmount = ethers.parseEther("0.0005"); // Below minimum
      
      await expect(avaxStaking.connect(user1).stake({ value: stakeAmount }))
        .to.be.revertedWith("Minimum stake is 0.001 AVAX");
    });

    it("Should calculate rewards correctly", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      
      // Stake
      await avaxStaking.connect(user1).stake({ value: stakeAmount });
      
      // Fast forward time (simulate 1 day)
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine");
      
      const rewards = await avaxStaking.calculateRewards(user1.address);
      expect(rewards).to.be.gt(0);
    });

    it("Should allow users to unstake", async function () {
      const stakeAmount = ethers.parseEther("0.001");
      
      // Stake
      await avaxStaking.connect(user1).stake({ value: stakeAmount });
      
      // Unstake
      await expect(avaxStaking.connect(user1).unstake())
        .to.emit(avaxStaking, "Unstaked");

      const stakerInfo = await avaxStaking.getStakerInfo(user1.address);
      expect(stakerInfo.isStaking).to.be.false;
    });
  });

  describe("Crypto Island NFT Contract", function () {
    it("Should allow users to mint NFT with 0.0005 AVAX", async function () {
      const mintPrice = ethers.parseEther("0.0005");
      
      await expect(cryptoIslandNFT.connect(user1).mintNFT({ value: mintPrice }))
        .to.emit(cryptoIslandNFT, "NFTMinted");

      expect(await cryptoIslandNFT.balanceOf(user1.address)).to.equal(1);
      expect(await cryptoIslandNFT.totalSupply()).to.equal(1);
    });

    it("Should reject mints with insufficient payment", async function () {
      const insufficientAmount = ethers.parseEther("0.0001");
      
      await expect(cryptoIslandNFT.connect(user1).mintNFT({ value: insufficientAmount }))
        .to.be.revertedWith("Insufficient payment for minting");
    });

    it("Should return correct token URI", async function () {
      const mintPrice = ethers.parseEther("0.0005");
      
      await cryptoIslandNFT.connect(user1).mintNFT({ value: mintPrice });
      
      const tokenURI = await cryptoIslandNFT.tokenURI(0);
      expect(tokenURI).to.include("0.json");
    });

    it("Should return NFT metadata", async function () {
      const mintPrice = ethers.parseEther("0.0005");
      
      await cryptoIslandNFT.connect(user1).mintNFT({ value: mintPrice });
      
      const metadata = await cryptoIslandNFT.getNFTMetadata(0);
      expect(metadata.name).to.include("Crypto Island NFT #0");
      expect(metadata.description).to.include("Crypto Island Adventure");
    });
  });

  describe("Contract Integration", function () {
    it("Should work together for game functionality", async function () {
      // User stakes AVAX
      const stakeAmount = ethers.parseEther("0.001");
      await avaxStaking.connect(user1).stake({ value: stakeAmount });
      
      // User mints NFT
      const mintPrice = ethers.parseEther("0.0005");
      await cryptoIslandNFT.connect(user1).mintNFT({ value: mintPrice });
      
      // Verify both transactions worked
      const stakerInfo = await avaxStaking.getStakerInfo(user1.address);
      expect(stakerInfo.isStaking).to.be.true;
      
      const nftBalance = await cryptoIslandNFT.balanceOf(user1.address);
      expect(nftBalance).to.equal(1);
    });
  });

  // Helper function to get current timestamp
  async function getCurrentTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
