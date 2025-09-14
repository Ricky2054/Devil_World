// Avalanche L1 Blockchain Integration
class AvalancheIntegration {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.contractAddress = '0x...'; // Replace with actual contract address
        this.contractABI = [
            // ERC-20 Token for game coins
            {
                "inputs": [],
                "name": "name",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "symbol",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "decimals",
                "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "address", "name": "to", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"}
                ],
                "name": "transfer",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            // Game-specific functions
            {
                "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
                "name": "stakeCoins",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
                "name": "unstakeCoins",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "points", "type": "uint256"}],
                "name": "addPoints",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
                "name": "getPlayerStats",
                "outputs": [
                    {"internalType": "uint256", "name": "coins", "type": "uint256"},
                    {"internalType": "uint256", "name": "energy", "type": "uint256"},
                    {"internalType": "uint256", "name": "streak", "type": "uint256"},
                    {"internalType": "uint256", "name": "points", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "tokenURI", "type": "string"}],
                "name": "mintTreasureNFT",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "string", "name": "tokenURI", "type": "string"}],
                "name": "mintAchievementNFT",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getLeaderboard",
                "outputs": [
                    {
                        "internalType": "address[]",
                        "name": "players",
                        "type": "address[]"
                    },
                    {
                        "internalType": "uint256[]",
                        "name": "scores",
                        "type": "uint256[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        this.isConnected = false;
        this.playerStats = {
            coins: 0,
            energy: 100,
            streak: 0,
            points: 0
        };
    }

    // Check if MetaMask is available and ready
    isMetaMaskAvailable() {
        // Check if we're running on file:// protocol
        if (window.location.protocol === 'file:') {
            console.warn('Game is running on file:// protocol. MetaMask may not be available. Please use a local server.');
            return false;
        }
        
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // Check if MetaMask is unlocked
    async isMetaMaskUnlocked() {
        if (!this.isMetaMaskAvailable()) return false;
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            return accounts.length > 0;
        } catch (error) {
            return false;
        }
    }

    async connectWallet() {
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask not found! Please install MetaMask from https://metamask.io/');
            }

            // Check if MetaMask is locked
            if (!window.ethereum.isMetaMask) {
                throw new Error('Please use MetaMask wallet. Other wallets are not supported yet.');
            }

            // Check if MetaMask is unlocked first
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) {
                throw new Error('MetaMask is locked! Please unlock MetaMask and try again.');
            }

            // Request account access
            const requestedAccounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (requestedAccounts.length === 0) {
                throw new Error('No accounts found. Please unlock MetaMask and try again.');
            }

            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            
            // Initialize contract
            this.contract = new ethers.Contract(
                this.contractAddress,
                this.contractABI,
                this.signer
            );

            this.isConnected = true;
            await this.updatePlayerStats();
            
            return requestedAccounts[0];
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    async disconnectWallet() {
        this.isConnected = false;
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.playerStats = { coins: 0, energy: 100, streak: 0, points: 0 };
    }

    async updatePlayerStats() {
        if (!this.contract || !this.isConnected) return;

        try {
            const stats = await this.contract.getPlayerStats(await this.signer.getAddress());
            this.playerStats = {
                coins: ethers.utils.formatEther(stats.coins),
                energy: stats.energy.toNumber(),
                streak: stats.streak.toNumber(),
                points: stats.points.toNumber()
            };
        } catch (error) {
            console.error('Error updating player stats:', error);
            // Fallback to local storage for demo
            this.playerStats = JSON.parse(localStorage.getItem('playerStats') || '{"coins":1000,"energy":100,"streak":0,"points":0}');
        }
    }

    async stakeCoins(amount) {
        if (!this.contract || !this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const amountWei = ethers.utils.parseEther(amount.toString());
            const tx = await this.contract.stakeCoins(amountWei);
            await tx.wait();
            
            await this.updatePlayerStats();
            return tx;
        } catch (error) {
            console.error('Error staking coins:', error);
            throw error;
        }
    }

    async unstakeCoins(amount) {
        if (!this.contract || !this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const amountWei = ethers.utils.parseEther(amount.toString());
            const tx = await this.contract.unstakeCoins(amountWei);
            await tx.wait();
            
            await this.updatePlayerStats();
            return tx;
        } catch (error) {
            console.error('Error unstaking coins:', error);
            throw error;
        }
    }

    async addPoints(points) {
        if (!this.contract || !this.isConnected) {
            // For demo purposes, update local storage
            this.playerStats.points += points;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
            return;
        }

        try {
            const tx = await this.contract.addPoints(points);
            await tx.wait();
            
            await this.updatePlayerStats();
            return tx;
        } catch (error) {
            console.error('Error adding points:', error);
            // Fallback to local storage
            this.playerStats.points += points;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
        }
    }

    async mintTreasureNFT(tokenURI) {
        if (!this.contract || !this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const tx = await this.contract.mintTreasureNFT(tokenURI);
            await tx.wait();
            
            // Deduct coins for minting
            this.playerStats.coins -= 50;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
            
            return tx;
        } catch (error) {
            console.error('Error minting treasure NFT:', error);
            throw error;
        }
    }

    async mintAchievementNFT(tokenURI) {
        if (!this.contract || !this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const tx = await this.contract.mintAchievementNFT(tokenURI);
            await tx.wait();
            
            // Deduct coins for minting
            this.playerStats.coins -= 25;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
            
            return tx;
        } catch (error) {
            console.error('Error minting achievement NFT:', error);
            throw error;
        }
    }

    async getLeaderboard() {
        if (!this.contract || !this.isConnected) {
            // Return mock data for demo
            return {
                players: ['0x123...', '0x456...', '0x789...'],
                scores: [1500, 1200, 900]
            };
        }

        try {
            const leaderboard = await this.contract.getLeaderboard();
            return {
                players: leaderboard.players,
                scores: leaderboard.scores.map(score => score.toNumber())
            };
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            // Return mock data
            return {
                players: ['0x123...', '0x456...', '0x789...'],
                scores: [1500, 1200, 900]
            };
        }
    }

    async transferCrypto(toAddress, amount) {
        if (!this.contract || !this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const amountWei = ethers.utils.parseEther(amount.toString());
            const tx = await this.contract.transfer(toAddress, amountWei);
            await tx.wait();
            
            await this.updatePlayerStats();
            return tx;
        } catch (error) {
            console.error('Error transferring crypto:', error);
            throw error;
        }
    }

    // Energy management
    consumeEnergy(amount = 10) {
        if (this.playerStats.energy >= amount) {
            this.playerStats.energy -= amount;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
            return true;
        }
        return false;
    }

    restoreEnergy(amount = 20) {
        this.playerStats.energy = Math.min(100, this.playerStats.energy + amount);
        localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
    }

    // Streak management
    updateStreak(increment = true) {
        if (increment) {
            this.playerStats.streak += 1;
        } else {
            this.playerStats.streak = 0;
        }
        localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
    }

    // Coins management
    addCoins(amount) {
        this.playerStats.coins += amount;
        localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
    }

    spendCoins(amount) {
        if (this.playerStats.coins >= amount) {
            this.playerStats.coins -= amount;
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
            return true;
        }
        return false;
    }
}

// Initialize Avalanche integration
window.avalancheIntegration = new AvalancheIntegration();
