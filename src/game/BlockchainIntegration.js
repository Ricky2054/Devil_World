// Avalanche Blockchain Integration for Fantasy Adventure Game
import { 
  BrowserProvider, 
  formatEther, 
  parseEther,
  Contract,
  Wallet
} from 'ethers';

export class BlockchainManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.isConnected = false;
    this.network = null;
  }

  // Connect to MetaMask and Avalanche network
  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      this.provider = new BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.userAddress = await this.signer.getAddress();
      this.network = await this.provider.getNetwork();

      // Check if we're on Avalanche network
      await this.ensureAvalancheNetwork();
      
      this.isConnected = true;
      console.log('🔗 Connected to wallet:', this.userAddress);
      console.log('🏔️ Network:', this.network.name);
      
      return {
        address: this.userAddress,
        network: this.network.name,
        connected: true
      };
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    }
  }

  // Ensure we're connected to Avalanche network
  async ensureAvalancheNetwork() {
    const avalancheChainId = '0xA86A'; // Avalanche C-Chain mainnet
    const avalancheTestnetChainId = '0xA869'; // Avalanche Fuji testnet
    
    try {
      // Try to switch to Avalanche network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: avalancheTestnetChainId }], // Use testnet for development
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: avalancheTestnetChainId,
            chainName: 'Avalanche Fuji Testnet',
            nativeCurrency: {
              name: 'AVAX',
              symbol: 'AVAX',
              decimals: 18
            },
            rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://testnet.snowtrace.io/']
          }]
        });
      }
    }
  }

  // Get user's AVAX balance
  async getBalance() {
    if (!this.provider || !this.userAddress) return '0';
    
    try {
      const balance = await this.provider.getBalance(this.userAddress);
      return formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }

  // Send reward transaction (for major achievements)
  async sendReward(amount, reason) {
    if (!this.signer) throw new Error('Wallet not connected');
    
    try {
      // In a real game, this would be handled by a game server
      // For demo purposes, we'll just log the reward
      console.log(`🎁 Reward earned: ${amount} AVAX for ${reason}`);
      
      // In production, you'd have a smart contract that handles rewards
      // const contract = new Contract(contractAddress, abi, this.signer);
      // const tx = await contract.claimReward(amount, reason);
      // await tx.wait();
      
      return {
        success: true,
        amount,
        reason,
        txHash: 'demo_' + Date.now()
      };
    } catch (error) {
      console.error('❌ Reward transaction failed:', error);
      throw error;
    }
  }

  // Listen for account changes
  setupEventListeners(onAccountChange, onNetworkChange) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.userAddress = accounts[0];
          onAccountChange && onAccountChange(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        onNetworkChange && onNetworkChange(chainId);
        // Reload the page to reset state
        window.location.reload();
      });
    }
  }

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.isConnected = false;
    this.network = null;
    console.log('🔌 Wallet disconnected');
  }
}

// Point system that integrates with blockchain
export class GamePointSystem {
  constructor(blockchainManager) {
    this.blockchain = blockchainManager;
    this.points = {
      experience: 0,      // XP for leveling up
      gold: 0,           // In-game currency
      crystals: 0,       // Premium currency (blockchain rewards)
      achievements: [],   // Achievement list
      stats: {
        enemiesDefeated: 0,
        treasuresFound: 0,
        areasExplored: 0,
        questsCompleted: 0,
        timePlayedMinutes: 0
      }
    };
    
    this.rewardThresholds = {
      firstKill: { crystals: 1, avax: 0.001 },
      explorer: { crystals: 5, avax: 0.005 }, // Visit all 5 areas
      treasureHunter: { crystals: 10, avax: 0.01 }, // Find 50 treasures
      champion: { crystals: 25, avax: 0.025 }, // Defeat 100 enemies
      master: { crystals: 50, avax: 0.05 } // Complete all achievements
    };
  }

  // Award points for various actions
  awardPoints(action, amount = 1) {
    switch (action) {
      case 'enemyKill':
        this.points.experience += 10 * amount;
        this.points.gold += 5 * amount;
        this.points.stats.enemiesDefeated += amount;
        this.checkAchievements();
        break;
        
      case 'treasureFound':
        this.points.experience += 25 * amount;
        this.points.gold += 20 * amount;
        this.points.stats.treasuresFound += amount;
        this.checkAchievements();
        break;
        
      case 'areaExplored':
        this.points.experience += 100 * amount;
        this.points.gold += 50 * amount;
        this.points.stats.areasExplored += amount;
        this.checkAchievements();
        break;
        
      case 'questCompleted':
        this.points.experience += 200 * amount;
        this.points.gold += 100 * amount;
        this.points.crystals += 1 * amount;
        this.points.stats.questsCompleted += amount;
        this.checkAchievements();
        break;
        
      case 'timePlayed':
        this.points.stats.timePlayedMinutes += amount;
        break;
    }
    
    console.log(`🎯 Points awarded for ${action}:`, amount);
    return this.points;
  }

  // Check for achievement unlocks and blockchain rewards
  async checkAchievements() {
    const stats = this.points.stats;
    const newAchievements = [];

    // First Kill Achievement
    if (stats.enemiesDefeated >= 1 && !this.hasAchievement('firstKill')) {
      newAchievements.push('firstKill');
      await this.unlockAchievement('firstKill', 'First Blood', 'Defeated your first enemy!');
    }

    // Explorer Achievement
    if (stats.areasExplored >= 5 && !this.hasAchievement('explorer')) {
      newAchievements.push('explorer');
      await this.unlockAchievement('explorer', 'World Explorer', 'Visited all 5 areas!');
    }

    // Treasure Hunter Achievement
    if (stats.treasuresFound >= 50 && !this.hasAchievement('treasureHunter')) {
      newAchievements.push('treasureHunter');
      await this.unlockAchievement('treasureHunter', 'Treasure Hunter', 'Found 50 treasures!');
    }

    // Champion Achievement
    if (stats.enemiesDefeated >= 100 && !this.hasAchievement('champion')) {
      newAchievements.push('champion');
      await this.unlockAchievement('champion', 'Champion Warrior', 'Defeated 100 enemies!');
    }

    // Master Achievement (all other achievements)
    if (this.hasAchievement('explorer') && this.hasAchievement('treasureHunter') && 
        this.hasAchievement('champion') && !this.hasAchievement('master')) {
      newAchievements.push('master');
      await this.unlockAchievement('master', 'Grand Master', 'Completed all achievements!');
    }

    return newAchievements;
  }

  // Unlock achievement and award blockchain rewards
  async unlockAchievement(id, title, description) {
    const achievement = {
      id,
      title,
      description,
      unlockedAt: new Date().toISOString(),
      rewarded: false
    };

    this.points.achievements.push(achievement);
    
    // Award crystals
    const reward = this.rewardThresholds[id];
    if (reward) {
      this.points.crystals += reward.crystals;
      
      // Try to send blockchain reward if connected
      if (this.blockchain && this.blockchain.isConnected) {
        try {
          await this.blockchain.sendReward(reward.avax, `Achievement: ${title}`);
          achievement.rewarded = true;
          console.log(`🏆 Achievement unlocked: ${title} (+${reward.crystals} crystals, +${reward.avax} AVAX)`);
        } catch (error) {
          console.error('❌ Failed to send blockchain reward:', error);
        }
      }
    }

    return achievement;
  }

  // Check if player has specific achievement
  hasAchievement(id) {
    return this.points.achievements.some(achievement => achievement.id === id);
  }

  // Get current level based on experience
  getLevel() {
    return Math.floor(this.points.experience / 1000) + 1;
  }

  // Get experience needed for next level
  getExpToNextLevel() {
    const currentLevel = this.getLevel();
    const expForNextLevel = currentLevel * 1000;
    return expForNextLevel - this.points.experience;
  }

  // Save points to localStorage
  save() {
    localStorage.setItem('fantasyAdventurePoints', JSON.stringify(this.points));
  }

  // Load points from localStorage
  load() {
    const saved = localStorage.getItem('fantasyAdventurePoints');
    if (saved) {
      this.points = { ...this.points, ...JSON.parse(saved) };
    }
  }
}
