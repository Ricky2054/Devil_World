// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AVAX Staking Contract
 * @dev Allows users to stake 0.001 AVAX and earn rewards
 * @author Crypto Island Adventure Game
 */
contract AVAXStaking {
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event EmergencyWithdraw(address indexed owner, uint256 amount, uint256 timestamp);

    // Structs
    struct Staker {
        uint256 stakedAmount;
        uint256 stakingTimestamp;
        uint256 lastRewardClaim;
        bool isStaking;
    }

    // State variables
    mapping(address => Staker) public stakers;
    address public owner;
    uint256 public constant MINIMUM_STAKE = 0.001 ether; // 0.001 AVAX
    uint256 public constant REWARD_RATE = 10; // 10% APY (per year)
    uint256 public constant REWARD_PRECISION = 10000; // For percentage calculations
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    bool public stakingPaused = false;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier whenNotPaused() {
        require(!stakingPaused, "Staking is currently paused");
        _;
    }

    modifier validStake() {
        require(msg.value >= MINIMUM_STAKE, "Minimum stake is 0.001 AVAX");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Stake AVAX tokens
     * @notice Users can stake minimum 0.001 AVAX
     */
    function stake() external payable whenNotPaused validStake {
        require(!stakers[msg.sender].isStaking, "Already staking");

        // Create staker record
        stakers[msg.sender] = Staker({
            stakedAmount: msg.value,
            stakingTimestamp: block.timestamp,
            lastRewardClaim: block.timestamp,
            isStaking: true
        });

        totalStaked += msg.value;

        emit Staked(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Unstake AVAX tokens
     * @notice Users can unstake their tokens after staking
     */
    function unstake() external {
        require(stakers[msg.sender].isStaking, "Not staking");

        Staker storage staker = stakers[msg.sender];
        uint256 stakedAmount = staker.stakedAmount;
        uint256 rewards = calculateRewards(msg.sender);

        // Reset staker
        delete stakers[msg.sender];
        totalStaked -= stakedAmount;

        // Transfer staked amount + rewards
        uint256 totalToTransfer = stakedAmount + rewards;
        totalRewardsPaid += rewards;

        (bool success, ) = payable(msg.sender).call{value: totalToTransfer}("");
        require(success, "Transfer failed");

        emit Unstaked(msg.sender, stakedAmount, block.timestamp);
        if (rewards > 0) {
            emit RewardsClaimed(msg.sender, rewards, block.timestamp);
        }
    }

    /**
     * @dev Claim rewards without unstaking
     * @notice Users can claim accumulated rewards
     */
    function claimRewards() external {
        require(stakers[msg.sender].isStaking, "Not staking");

        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");

        // Update last reward claim time
        stakers[msg.sender].lastRewardClaim = block.timestamp;
        totalRewardsPaid += rewards;

        (bool success, ) = payable(msg.sender).call{value: rewards}("");
        require(success, "Transfer failed");

        emit RewardsClaimed(msg.sender, rewards, block.timestamp);
    }

    /**
     * @dev Calculate pending rewards for a staker
     * @param stakerAddress Address of the staker
     * @return rewards Pending rewards amount
     */
    function calculateRewards(address stakerAddress) public view returns (uint256) {
        if (!stakers[stakerAddress].isStaking) {
            return 0;
        }

        Staker memory staker = stakers[stakerAddress];
        uint256 stakingDuration = block.timestamp - staker.lastRewardClaim;
        uint256 stakedAmount = staker.stakedAmount;

        // Calculate rewards: (stakedAmount * REWARD_RATE * stakingDuration) / (365 days * REWARD_PRECISION)
        uint256 rewards = (stakedAmount * REWARD_RATE * stakingDuration) / 
                         (365 days * REWARD_PRECISION);

        return rewards;
    }

    /**
     * @dev Get staker information
     * @param stakerAddress Address of the staker
     * @return stakedAmount Amount staked
     * @return stakingTimestamp When staking started
     * @return pendingRewards Current pending rewards
     * @return isStaking Whether currently staking
     */
    function getStakerInfo(address stakerAddress) external view returns (
        uint256 stakedAmount,
        uint256 stakingTimestamp,
        uint256 pendingRewards,
        bool isStaking
    ) {
        Staker memory staker = stakers[stakerAddress];
        return (
            staker.stakedAmount,
            staker.stakingTimestamp,
            calculateRewards(stakerAddress),
            staker.isStaking
        );
    }

    /**
     * @dev Get contract statistics
     * @return totalStaked Total amount staked in contract
     * @return totalRewardsPaid Total rewards paid out
     * @return contractBalance Current contract balance
     */
    function getContractStats() external view returns (
        uint256 totalStaked,
        uint256 totalRewardsPaid,
        uint256 contractBalance
    ) {
        return (
            totalStaked,
            totalRewardsPaid,
            address(this).balance
        );
    }

    /**
     * @dev Pause staking (only owner)
     */
    function pauseStaking() external onlyOwner {
        stakingPaused = true;
    }

    /**
     * @dev Unpause staking (only owner)
     */
    function unpauseStaking() external onlyOwner {
        stakingPaused = false;
    }

    /**
     * @dev Emergency withdraw (only owner)
     * @notice Only for emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");

        emit EmergencyWithdraw(owner, balance, block.timestamp);
    }

    /**
     * @dev Add funds to contract for rewards (only owner)
     * @notice Owner can add AVAX to fund rewards
     */
    function fundRewards() external payable onlyOwner {
        require(msg.value > 0, "Must send AVAX to fund rewards");
        // Funds are automatically added to contract balance
    }

    /**
     * @dev Receive function to accept AVAX
     */
    receive() external payable {
        // Contract can receive AVAX
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        // Fallback function
    }
}
