// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Crypto Island Token (CIT)
 * @dev ERC-20 token for Crypto Island Adventure game
 * @author Your Name
 */
contract CryptoIslandToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // Token details
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1 million CIT tokens
    uint256 public constant MAX_SUPPLY = 10000000 * 10**18; // 10 million CIT tokens max
    uint256 public constant MINT_PRICE = 0.001 ether; // 0.001 AVAX per CIT token
    
    // Staking system
    struct StakerInfo {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 pendingRewards;
        bool isStaking;
    }
    
    mapping(address => StakerInfo) public stakers;
    uint256 public totalStaked;
    uint256 public constant REWARD_RATE = 10; // 10% APY
    uint256 public constant REWARD_INTERVAL = 365 days;
    
    // Game integration
    mapping(address => bool) public gameContracts;
    mapping(address => uint256) public gameRewards;
    
    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensStaked(address indexed staker, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed staker, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed staker, uint256 amount, uint256 timestamp);
    event GameRewardEarned(address indexed player, uint256 amount, string gameAction);
    
    // Modifiers
    modifier onlyGameContract() {
        require(gameContracts[msg.sender], "Only game contracts can call this function");
        _;
    }
    
    modifier validMint(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _;
    }
    
    constructor() ERC20("Crypto Island Token", "CIT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    // Mint new tokens (only owner)
    function mintTokens(address to, uint256 amount) external onlyOwner validMint(amount) {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }
    
    // Mint tokens by paying AVAX
    function mintWithAVAX(uint256 amount) external payable whenNotPaused validMint(amount) {
        require(msg.value >= amount * MINT_PRICE, "Insufficient AVAX payment");
        
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount, block.timestamp);
        
        // Refund excess AVAX
        if (msg.value > amount * MINT_PRICE) {
            payable(msg.sender).transfer(msg.value - (amount * MINT_PRICE));
        }
    }
    
    // Staking functions
    function stakeTokens(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient token balance");
        
        // Claim pending rewards first
        if (stakers[msg.sender].isStaking) {
            claimRewards();
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staker info
        stakers[msg.sender].stakedAmount += amount;
        stakers[msg.sender].stakingTimestamp = block.timestamp;
        stakers[msg.sender].isStaking = true;
        
        totalStaked += amount;
        
        emit TokensStaked(msg.sender, amount, block.timestamp);
    }
    
    function unstakeTokens() external whenNotPaused nonReentrant {
        require(stakers[msg.sender].isStaking, "Not staking");
        require(stakers[msg.sender].stakedAmount > 0, "No tokens staked");
        
        uint256 stakedAmount = stakers[msg.sender].stakedAmount;
        
        // Calculate and add pending rewards
        uint256 pendingRewards = calculateRewards(msg.sender);
        stakers[msg.sender].pendingRewards += pendingRewards;
        
        // Reset staking info
        stakers[msg.sender].stakedAmount = 0;
        stakers[msg.sender].stakingTimestamp = 0;
        stakers[msg.sender].isStaking = false;
        
        totalStaked -= stakedAmount;
        
        // Transfer tokens back to staker
        _transfer(address(this), msg.sender, stakedAmount);
        
        emit TokensUnstaked(msg.sender, stakedAmount, block.timestamp);
    }
    
    function claimRewards() public whenNotPaused nonReentrant {
        require(stakers[msg.sender].isStaking, "Not staking");
        
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        // Update staking timestamp
        stakers[msg.sender].stakingTimestamp = block.timestamp;
        
        // Mint new tokens as rewards
        _mint(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }
    
    function calculateRewards(address staker) public view returns (uint256) {
        if (!stakers[staker].isStaking || stakers[staker].stakedAmount == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - stakers[staker].stakingTimestamp;
        uint256 rewards = (stakers[staker].stakedAmount * REWARD_RATE * stakingDuration) / (100 * REWARD_INTERVAL);
        
        return rewards;
    }
    
    // Game integration functions
    function earnGameReward(address player, uint256 amount, string memory gameAction) external onlyGameContract {
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        
        _mint(player, amount);
        gameRewards[player] += amount;
        
        emit GameRewardEarned(player, amount, gameAction);
    }
    
    function spendGameTokens(address player, uint256 amount) external onlyGameContract {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(player) >= amount, "Insufficient token balance");
        
        _transfer(player, address(this), amount);
    }
    
    // Admin functions
    function addGameContract(address gameContract) external onlyOwner {
        gameContracts[gameContract] = true;
    }
    
    function removeGameContract(address gameContract) external onlyOwner {
        gameContracts[gameContract] = false;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawAVAX() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No AVAX to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    // View functions
    function getStakerInfo(address staker) external view returns (StakerInfo memory) {
        return stakers[staker];
    }
    
    function getContractStats() external view returns (
        uint256 totalStakedAmount,
        uint256 totalRewardsPaid,
        uint256 contractBalance,
        uint256 totalSupplyAmount
    ) {
        return (
            totalStaked,
            totalSupply() - INITIAL_SUPPLY, // Approximate rewards paid
            address(this).balance,
            totalSupply()
        );
    }
    
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenDecimals,
        uint256 totalSupplyAmount,
        uint256 maxSupplyAmount,
        uint256 mintPrice
    ) {
        return (
            "Crypto Island Token",
            "CIT",
            18,
            totalSupply(),
            MAX_SUPPLY,
            MINT_PRICE
        );
    }
}
