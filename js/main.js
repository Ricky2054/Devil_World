// Main Game Controller
class GameController {
    constructor() {
        this.isGameStarted = false;
        this.currentStoryStep = 0;
        this.storySteps = [
            "Welcome to Crypto Island! Years ago, world leaders left behind encrypted phones with valuable crypto wallets.",
            "Your mission: find the legendary phones before others do! Each leader hid their treasure in different locations.",
            "Stake coins to gain entry and start exploring. Be careful - every action costs energy!",
            "Use your wits to solve puzzles and uncover the hidden treasures. Good luck, treasure hunter!"
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadGameData();
        this.showLoadingScreen();
    }

    setupEventListeners() {
        // Wallet connection
        document.getElementById('connect-wallet').addEventListener('click', () => this.connectWallet());
        document.getElementById('disconnect-wallet').addEventListener('click', () => this.disconnectWallet());

        // Game actions
        document.getElementById('explore-btn').addEventListener('click', () => this.explore());
        document.getElementById('dig-btn').addEventListener('click', () => this.dig());
        document.getElementById('solve-puzzle-btn').addEventListener('click', () => this.solvePuzzle());

        // Staking modal
        document.querySelectorAll('.stake-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.stakeCoins(parseInt(e.target.dataset.amount)));
        });

        // Minting modal
        document.getElementById('mint-treasure-nft').addEventListener('click', () => this.mintNFT('treasure'));
        document.getElementById('mint-achievement-nft').addEventListener('click', () => this.mintNFT('achievement'));

        // Puzzle modal
        document.getElementById('submit-puzzle').addEventListener('click', () => this.submitPuzzleAnswer());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    async connectWallet() {
        try {
            // Check if MetaMask is available first
            if (!window.avalancheIntegration.isMetaMaskAvailable()) {
                this.showMessage('MetaMask not detected! Switching to demo mode...');
                this.enableDemoMode();
                return;
            }

            // Check if MetaMask is unlocked
            const isUnlocked = await window.avalancheIntegration.isMetaMaskUnlocked();
            if (!isUnlocked) {
                this.showMessage('MetaMask is locked! Switching to demo mode. Unlock MetaMask to use blockchain features.');
                this.enableDemoMode();
                return;
            }

            const address = await window.avalancheIntegration.connectWallet();
            document.getElementById('connect-wallet').style.display = 'none';
            document.getElementById('wallet-info').style.display = 'flex';
            document.getElementById('wallet-address').textContent = 
                `${address.slice(0, 6)}...${address.slice(-4)}`;
            
            this.updateUI();
            this.showMessage('Wallet connected successfully!');
        } catch (error) {
            console.error('Wallet connection error:', error);
            this.showMessage('Failed to connect wallet. Switching to demo mode...');
            this.enableDemoMode();
        }
    }

    async disconnectWallet() {
        await window.avalancheIntegration.disconnectWallet();
        document.getElementById('connect-wallet').style.display = 'block';
        document.getElementById('wallet-info').style.display = 'none';
        this.showMessage('Wallet disconnected');
    }

    async stakeCoins(amount) {
        try {
            if (!window.avalancheIntegration.isConnected) {
                this.showMessage('Please connect your wallet first!');
                return;
            }

            await window.avalancheIntegration.stakeCoins(amount);
            this.closeModal(document.getElementById('staking-modal'));
            this.showMessage(`Successfully staked ${amount} coins!`);
            this.updateUI();
            
            if (!this.isGameStarted) {
                this.startGame();
            }
        } catch (error) {
            this.showMessage('Failed to stake coins: ' + error.message);
        }
    }

    async mintNFT(type) {
        try {
            if (!window.avalancheIntegration.isConnected) {
                this.showMessage('Please connect your wallet first!');
                return;
            }

            const cost = type === 'treasure' ? 50 : 25;
            if (window.avalancheIntegration.playerStats.coins < cost) {
                this.showMessage('Not enough coins to mint NFT!');
                return;
            }

            const tokenURI = this.generateTokenURI(type);
            
            if (type === 'treasure') {
                await window.avalancheIntegration.mintTreasureNFT(tokenURI);
            } else {
                await window.avalancheIntegration.mintAchievementNFT(tokenURI);
            }
            
            this.closeModal(document.getElementById('mint-modal'));
            this.showMessage(`Successfully minted ${type} NFT!`);
            this.updateUI();
        } catch (error) {
            this.showMessage('Failed to mint NFT: ' + error.message);
        }
    }

    generateTokenURI(type) {
        const baseURI = 'https://crypto-island-nft.com/metadata/';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        
        return `${baseURI}${type}_${timestamp}_${randomId}.json`;
    }

    explore() {
        if (!this.isGameStarted) {
            this.showStakingModal();
            return;
        }

        // Find nearest undiscovered treasure location
        const undiscoveredLocations = window.cryptoIslandGame.treasureLocations.filter(loc => !loc.discovered);
        
        if (undiscoveredLocations.length === 0) {
            this.showMessage('All locations have been discovered!');
            return;
        }

        // For demo, explore the first undiscovered location
        const locationIndex = window.cryptoIslandGame.treasureLocations.findIndex(loc => !loc.discovered);
        
        if (window.cryptoIslandGame.exploreLocation(locationIndex)) {
            this.updateUI();
            this.updateStory(`Discovered ${window.cryptoIslandGame.treasureLocations[locationIndex].data.name}!`);
            this.updateHints(`New clue: ${this.generateHint(window.cryptoIslandGame.treasureLocations[locationIndex].data.difficulty)}`);
        }
    }

    dig() {
        if (!window.cryptoIslandGame.currentLocation) {
            this.showMessage('Explore a location first!');
            return;
        }

        if (window.cryptoIslandGame.digForTreasure()) {
            this.updateUI();
            this.updateInventory('Added treasure to inventory!');
        }
    }

    solvePuzzle() {
        if (!window.cryptoIslandGame.currentLocation) {
            this.showMessage('Explore a location first!');
            return;
        }

        const difficulty = window.cryptoIslandGame.currentLocation.data.difficulty;
        const puzzle = window.puzzleSystem.generatePuzzle(difficulty);
        
        this.showPuzzleModal(puzzle);
    }

    showPuzzleModal(puzzle) {
        const modal = document.getElementById('puzzle-modal');
        const content = document.getElementById('puzzle-content');
        
        content.innerHTML = `
            <div class="puzzle-question">
                <h4>${puzzle.question}</h4>
                <p class="puzzle-hint">Hint: ${puzzle.hint}</p>
                <p class="puzzle-points">Points: ${puzzle.points}</p>
            </div>
        `;
        
        modal.style.display = 'flex';
        document.getElementById('puzzle-answer').value = '';
    }

    submitPuzzleAnswer() {
        const answer = document.getElementById('puzzle-answer').value;
        
        if (!answer.trim()) {
            this.showMessage('Please enter an answer!');
            return;
        }

        const isCorrect = window.puzzleSystem.checkAnswer(answer);
        
        if (isCorrect) {
            this.showMessage('Correct! You earned points and coins!');
            this.closeModal(document.getElementById('puzzle-modal'));
            this.updateUI();
            this.updateStory('Solved the puzzle! The treasure is closer...');
        } else {
            this.showMessage('Incorrect! Try again or use a hint.');
        }
    }

    generateHint(difficulty) {
        const hints = {
            'easy': 'Look for obvious patterns or simple logic.',
            'medium': 'Think about common crypto concepts and mathematical sequences.',
            'hard': 'Consider advanced cryptography and blockchain mechanics.',
            'expert': 'This requires deep knowledge of cryptocurrency history and technology.',
            'legendary': 'Only the most skilled hunters can solve this ultimate challenge!'
        };
        return hints[difficulty] || 'Use your best judgment.';
    }

    showStakingModal() {
        document.getElementById('staking-modal').style.display = 'flex';
    }

    showMintModal() {
        document.getElementById('mint-modal').style.display = 'flex';
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    startGame() {
        this.isGameStarted = true;
        window.cryptoIslandGame.startGame();
        this.updateStory(this.storySteps[this.currentStoryStep]);
        this.showMessage('Game started! Begin your treasure hunt!');
    }

    updateStory(message) {
        const storyContent = document.getElementById('story-content');
        storyContent.innerHTML = `<p>${message}</p>`;
    }

    updateHints(message) {
        const hintsContent = document.getElementById('hints-content');
        hintsContent.innerHTML = `<p>${message}</p>`;
    }

    updateInventory(message) {
        const inventoryContent = document.getElementById('inventory-content');
        inventoryContent.innerHTML = `<p>${message}</p>`;
    }

    updateUI() {
        window.cryptoIslandGame.updateUI();
        this.updateLeaderboard();
    }

    async updateLeaderboard() {
        try {
            const leaderboard = await window.avalancheIntegration.getLeaderboard();
            const leaderboardContent = document.getElementById('leaderboard-content');
            
            let html = '';
            leaderboard.players.forEach((player, index) => {
                html += `
                    <div class="leaderboard-entry">
                        <span class="rank">#${index + 1}</span>
                        <span class="player-name">${player.slice(0, 6)}...${player.slice(-4)}</span>
                        <span class="points">${leaderboard.scores[index]}</span>
                    </div>
                `;
            });
            
            leaderboardContent.innerHTML = html;
        } catch (error) {
            console.error('Error updating leaderboard:', error);
        }
    }

    showMessage(message) {
        // Create temporary message display
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 1rem 2rem;
            border-radius: 10px;
            border: 2px solid #FFD700;
            font-size: 1.1rem;
            z-index: 1001;
            animation: fadeInOut 3s ease-in-out;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 3000);
    }

    loadGameData() {
        // Load saved game data from localStorage
        const savedStats = localStorage.getItem('playerStats');
        if (savedStats) {
            window.avalancheIntegration.playerStats = JSON.parse(savedStats);
        }
    }

    showLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            this.updateUI();
            this.checkMetaMaskStatus();
        }, 3000);
    }

    checkMetaMaskStatus() {
        // Check if running on file:// protocol
        if (window.location.protocol === 'file:') {
            this.showMessage('⚠️ Game is running from file system. MetaMask requires a web server. Please use the start-server.bat file or run a local server.');
            this.enableDemoMode();
            return;
        }

        if (!window.avalancheIntegration.isMetaMaskAvailable()) {
            this.showMessage('MetaMask not detected! You can still play in demo mode, but blockchain features will be limited.');
            // Enable demo mode
            this.enableDemoMode();
        } else {
            // Check if already connected
            window.avalancheIntegration.isMetaMaskUnlocked().then(isUnlocked => {
                if (isUnlocked) {
                    this.showMessage('MetaMask detected! Click "Connect Wallet" to start playing.');
                }
            });
        }
    }

    enableDemoMode() {
        // Set up demo mode with some starting coins
        window.avalancheIntegration.playerStats = {
            coins: 1000,
            energy: 100,
            streak: 0,
            points: 0
        };
        localStorage.setItem('playerStats', JSON.stringify(window.avalancheIntegration.playerStats));
        this.updateUI();
        this.showMessage('Demo mode enabled! You have 1000 coins to start with.');
    }
}

// Initialize game controller
document.addEventListener('DOMContentLoaded', () => {
    window.gameController = new GameController();
});

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(style);
