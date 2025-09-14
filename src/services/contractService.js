import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, STAKING_ABI, NFT_ABI } from '../contracts/contracts.js';
import { TOKEN_ABI } from '../contracts/tokenABI.js';
import { FUJI_NETWORK_CONFIG, FUJI_CONTRACT_ADDRESSES, isFujiNetwork } from '../config/fujiNetwork.js';

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.stakingContract = null;
    this.nftContract = null;
    this.tokenContract = null;
  }

  // Initialize provider and signer
  async initialize() {
    if (typeof window.ethereum !== 'undefined') {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Get current network
      const network = await this.provider.getNetwork();
      const isFuji = isFujiNetwork(Number(network.chainId));
      
      console.log('Current network:', network);
      console.log('Is Fuji network:', isFuji);
      
      // Use appropriate contract addresses based on network
      const contractAddresses = FUJI_CONTRACT_ADDRESSES;
      
      console.log('Using contract addresses:', contractAddresses);
      
      // Initialize contracts
      this.stakingContract = new ethers.Contract(
        contractAddresses.STAKING,
        STAKING_ABI,
        this.signer
      );
      
      this.nftContract = new ethers.Contract(
        contractAddresses.NFT,
        NFT_ABI,
        this.signer
      );
      
      this.tokenContract = new ethers.Contract(
        contractAddresses.TOKEN,
        TOKEN_ABI,
        this.signer
      );
      
      console.log('Contracts initialized:', {
        staking: this.stakingContract.address,
        nft: this.nftContract.address,
        token: this.tokenContract.address
      });
      
      return true;
    }
    return false;
  }

  // Get account balance
  async getAccountBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0.0';
    }
  }

  // Staking functions
  async stakeAVAX(amount) {
    try {
      const stakeAmount = ethers.parseEther(amount.toString());
      const tx = await this.stakingContract.stake({ value: stakeAmount });
      return tx;
    } catch (error) {
      console.error('Staking error:', error);
      throw error;
    }
  }

  async unstakeAVAX() {
    try {
      const tx = await this.stakingContract.unstake();
      return tx;
    } catch (error) {
      console.error('Unstaking error:', error);
      throw error;
    }
  }

  async claimRewards() {
    try {
      const tx = await this.stakingContract.claimRewards();
      return tx;
    } catch (error) {
      console.error('Claim rewards error:', error);
      throw error;
    }
  }

  async getStakerInfo(address) {
    try {
      const stakerInfo = await this.stakingContract.getStakerInfo(address);
      return {
        stakedAmount: ethers.formatEther(stakerInfo.stakedAmount),
        stakingTimestamp: Number(stakerInfo.stakingTimestamp),
        pendingRewards: ethers.formatEther(stakerInfo.pendingRewards),
        isStaking: stakerInfo.isStaking
      };
    } catch (error) {
      console.error('Get staker info error:', error);
      return null;
    }
  }

  async calculateRewards(address) {
    try {
      const rewards = await this.stakingContract.calculateRewards(address);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Calculate rewards error:', error);
      return '0.0';
    }
  }

  async getContractStats() {
    try {
      const stats = await this.stakingContract.getContractStats();
      return {
        totalStaked: ethers.formatEther(stats.totalStaked),
        totalRewardsPaid: ethers.formatEther(stats.totalRewardsPaid),
        contractBalance: ethers.formatEther(stats.contractBalance)
      };
    } catch (error) {
      console.error('Get contract stats error:', error);
      return null;
    }
  }

  // NFT functions
  async mintNFT() {
    try {
      const mintPrice = await this.nftContract.getMintPrice();
      const tx = await this.nftContract.mintNFT({ value: mintPrice });
      return tx;
    } catch (error) {
      console.error('Mint NFT error:', error);
      throw error;
    }
  }

  async getNFTBalance(address) {
    try {
      const balance = await this.nftContract.balanceOf(address);
      return Number(balance);
    } catch (error) {
      console.error('Get NFT balance error:', error);
      return 0;
    }
  }

  async getTotalSupply() {
    try {
      const totalSupply = await this.nftContract.totalSupply();
      return Number(totalSupply);
    } catch (error) {
      console.error('Get total supply error:', error);
      return 0;
    }
  }

  async getNFTMetadata(tokenId) {
    try {
      const metadata = await this.nftContract.getNFTMetadata(tokenId);
      return {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes
      };
    } catch (error) {
      console.error('Get NFT metadata error:', error);
      return null;
    }
  }

  async getTokenURI(tokenId) {
    try {
      const tokenURI = await this.nftContract.tokenURI(tokenId);
      return tokenURI;
    } catch (error) {
      console.error('Get token URI error:', error);
      return null;
    }
  }

  async getOwnerOf(tokenId) {
    try {
      const owner = await this.nftContract.ownerOf(tokenId);
      return owner;
    } catch (error) {
      console.error('Get owner of token error:', error);
      return null;
    }
  }

  // Utility functions
  async getCurrentAddress() {
    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Get current address error:', error);
      return null;
    }
  }

  async getNetwork() {
    try {
      const network = await this.provider.getNetwork();
      return network;
    } catch (error) {
      console.error('Get network error:', error);
      return null;
    }
  }

  // ERC-20 Token functions
  async getTokenBalance(address) {
    try {
      const balance = await this.tokenContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get token balance error:', error);
      return '0.0';
    }
  }

  async mintTokensWithAVAX(amount) {
    try {
      const tx = await this.tokenContract.mintWithAVAX(amount, {
        value: ethers.parseEther((amount * 0.001).toString())
      });
      return tx;
    } catch (error) {
      console.error('Mint tokens with AVAX error:', error);
      throw error;
    }
  }

  async stakeTokens(amount) {
    try {
      const stakeAmount = ethers.parseEther(amount.toString());
      const tx = await this.tokenContract.stakeTokens(stakeAmount);
      return tx;
    } catch (error) {
      console.error('Stake tokens error:', error);
      throw error;
    }
  }

  async unstakeTokens() {
    try {
      const tx = await this.tokenContract.unstakeTokens();
      return tx;
    } catch (error) {
      console.error('Unstake tokens error:', error);
      throw error;
    }
  }

  async claimTokenRewards() {
    try {
      const tx = await this.tokenContract.claimRewards();
      return tx;
    } catch (error) {
      console.error('Claim token rewards error:', error);
      throw error;
    }
  }

  async getTokenStakerInfo(address) {
    try {
      const stakerInfo = await this.tokenContract.getStakerInfo(address);
      return {
        stakedAmount: ethers.formatEther(stakerInfo.stakedAmount),
        stakingTimestamp: Number(stakerInfo.stakingTimestamp),
        pendingRewards: ethers.formatEther(stakerInfo.pendingRewards),
        isStaking: stakerInfo.isStaking
      };
    } catch (error) {
      console.error('Get token staker info error:', error);
      return null;
    }
  }

  async calculateTokenRewards(address) {
    try {
      const rewards = await this.tokenContract.calculateRewards(address);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Calculate token rewards error:', error);
      return '0.0';
    }
  }

  async getTokenInfo() {
    try {
      const tokenInfo = await this.tokenContract.getTokenInfo();
      return {
        name: tokenInfo[0],
        symbol: tokenInfo[1],
        decimals: Number(tokenInfo[2]),
        totalSupply: ethers.formatEther(tokenInfo[3]),
        maxSupply: ethers.formatEther(tokenInfo[4]),
        mintPrice: ethers.formatEther(tokenInfo[5])
      };
    } catch (error) {
      console.error('Get token info error:', error);
      return null;
    }
  }

  async getTokenContractStats() {
    try {
      const stats = await this.tokenContract.getContractStats();
      return {
        totalStaked: ethers.formatEther(stats[0]),
        totalRewardsPaid: ethers.formatEther(stats[1]),
        contractBalance: ethers.formatEther(stats[2]),
        totalSupply: ethers.formatEther(stats[3])
      };
    } catch (error) {
      console.error('Get token contract stats error:', error);
      return null;
    }
  }

  async transferTokens(to, amount) {
    try {
      const transferAmount = ethers.parseEther(amount.toString());
      const tx = await this.tokenContract.transfer(to, transferAmount);
      return tx;
    } catch (error) {
      console.error('Transfer tokens error:', error);
      throw error;
    }
  }

  async approveTokens(spender, amount) {
    try {
      const approveAmount = ethers.parseEther(amount.toString());
      const tx = await this.tokenContract.approve(spender, approveAmount);
      return tx;
    } catch (error) {
      console.error('Approve tokens error:', error);
      throw error;
    }
  }

  // Check if contracts are initialized
  isInitialized() {
    return this.provider && this.signer && this.stakingContract && this.nftContract && this.tokenContract;
  }
}

// Export singleton instance
export const contractService = new ContractService();
export default ContractService;
