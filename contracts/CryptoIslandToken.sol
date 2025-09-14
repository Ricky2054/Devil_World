// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Crypto Island Token (CIT)
 * @dev ERC-20 token for Crypto Island Adventure game
 */
contract CryptoIslandToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18;
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;
    uint256 public constant MINT_PRICE = 0.001 ether;

    struct StakerInfo {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        bool isStaking;
    }

    mapping(address => StakerInfo) public stakers;
    uint256 public totalStaked;
    uint256 public constant REWARD_RATE = 10; // 10% APY
    uint256 public constant REWARD_INTERVAL = 365 days;

    mapping(address => bool) public gameContracts;
    mapping(address => uint256) public gameRewards;

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensStaked(address indexed staker, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed staker, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed staker, uint256 amount, uint256 timestamp);
    event GameRewardEarned(address indexed player, uint256 amount, string gameAction);

    modifier onlyGameContract() {
        require(gameContracts[msg.sender], "Only game contracts");
        _;
    }

    modifier validMint(uint256 amount) {
        require(amount > 0, "Amount must be > 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _;
    }

    constructor() ERC20("Crypto Island Token", "CIT") Ownable(msg.sender) {}

    function initializeSupply(address to) external onlyOwner {
        require(totalSupply() == 0, "Already initialized");
        _mint(to, INITIAL_SUPPLY);
    }

    function mintTokens(address to, uint256 amount) external onlyOwner validMint(amount) {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }

    function mintWithAVAX(uint256 amount) external payable whenNotPaused validMint(amount) {
        require(msg.value >= amount * MINT_PRICE, "Insufficient AVAX");
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount, block.timestamp);
        uint256 expected = amount * MINT_PRICE;
        if (msg.value > expected) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - expected}("");
            require(ok, "Refund failed");
        }
    }

    function stakeTokens(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        if (stakers[msg.sender].isStaking) {
            _claimRewardsInternal(msg.sender);
        }
        _transfer(msg.sender, address(this), amount);
        stakers[msg.sender].stakedAmount += amount;
        stakers[msg.sender].stakingTimestamp = block.timestamp;
        stakers[msg.sender].isStaking = true;
        totalStaked += amount;
        emit TokensStaked(msg.sender, amount, block.timestamp);
    }

    function unstakeTokens() external whenNotPaused nonReentrant {
        require(stakers[msg.sender].isStaking, "Not staking");
        uint256 stakedAmount = stakers[msg.sender].stakedAmount;
        require(stakedAmount > 0, "No tokens staked");
        _claimRewardsInternal(msg.sender);
        stakers[msg.sender].stakedAmount = 0;
        stakers[msg.sender].stakingTimestamp = 0;
        stakers[msg.sender].isStaking = false;
        totalStaked -= stakedAmount;
        _transfer(address(this), msg.sender, stakedAmount);
        emit TokensUnstaked(msg.sender, stakedAmount, block.timestamp);
    }

    function claimRewards() external whenNotPaused nonReentrant {
        require(stakers[msg.sender].isStaking, "Not staking");
        _claimRewardsInternal(msg.sender);
    }

    function _claimRewardsInternal(address stakerAddr) internal {
        uint256 rewards = calculateRewards(stakerAddr);
        require(rewards > 0, "No rewards");
        stakers[stakerAddr].stakingTimestamp = block.timestamp;
        _mint(stakerAddr, rewards);
        emit RewardsClaimed(stakerAddr, rewards, block.timestamp);
    }

    function calculateRewards(address stakerAddr) public view returns (uint256) {
        StakerInfo memory info = stakers[stakerAddr];
        if (!info.isStaking || info.stakedAmount == 0) return 0;
        uint256 duration = block.timestamp - info.stakingTimestamp;
        return (info.stakedAmount * REWARD_RATE * duration) / (100 * REWARD_INTERVAL);
    }

    function earnGameReward(address player, uint256 amount, string memory gameAction) external onlyGameContract {
        require(amount > 0, "Amount must be > 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(player, amount);
        gameRewards[player] += amount;
        emit GameRewardEarned(player, amount, gameAction);
    }

    function spendGameTokens(address player, uint256 amount) external onlyGameContract {
        require(amount > 0, "Amount must be > 0");
        _transfer(player, address(this), amount);
    }

    function addGameContract(address gameContract) external onlyOwner {
        gameContracts[gameContract] = true;
    }

    function removeGameContract(address gameContract) external onlyOwner {
        gameContracts[gameContract] = false;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawAVAX() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No AVAX");
        (bool ok, ) = payable(owner()).call{value: bal}("");
        require(ok, "Withdraw failed");
    }
}


