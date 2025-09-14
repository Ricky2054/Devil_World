# 🏝️ Crypto Island Adventure - Smart Contracts

Real smart contracts for the Crypto Island Adventure game, deployed on Avalanche Fuji Testnet.

## 📋 Contracts Overview

### 🏦 AVAX Staking Contract
- **Minimum Stake**: 0.001 AVAX
- **Reward Rate**: 10% APY
- **Features**: Staking, unstaking, reward claiming, emergency functions

### 🎨 Crypto Island NFT Contract
- **Mint Price**: 0.0005 AVAX
- **Max Supply**: 10,000 NFTs
- **Features**: NFT minting, metadata, rarity system, owner controls

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MetaMask with Avalanche Fuji Testnet
- Testnet AVAX (get from [faucet](https://faucet.avax.network/))

### Installation
```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test
```

### Deployment

#### 1. Set up environment variables
Create a `.env` file:
```env
PRIVATE_KEY=your_private_key_here
SNOWTRACE_API_KEY=your_snowtrace_api_key_here
```

#### 2. Deploy to Avalanche Fuji Testnet
```bash
npm run deploy
```

#### 3. Verify contracts (optional)
```bash
npm run verify
```

## 📝 Contract Addresses

After deployment, you'll get contract addresses like:
```javascript
const STAKING_CONTRACT = "0x1234567890123456789012345678901234567890";
const NFT_CONTRACT = "0x0987654321098765432109876543210987654321";
```

## 🎮 Game Integration

Update your game with the deployed contract addresses:

```javascript
// In your game's App.js
const STAKING_CONTRACT = "0xYourDeployedStakingContractAddress";
const NFT_CONTRACT = "0xYourDeployedNFTContractAddress";

// Update staking function
const stakeCoins = async () => {
  // ... existing code ...
  
  const tx = await signer.sendTransaction({
    to: STAKING_CONTRACT, // Real contract address
    value: stakeAmount,
    gasLimit: gasEstimate.mul(120).div(100)
  });
  
  // ... rest of function ...
};

// Update NFT minting function
const mintNFT = async () => {
  // ... existing code ...
  
  const tx = await signer.sendTransaction({
    to: NFT_CONTRACT, // Real contract address
    value: mintAmount,
    gasLimit: gasEstimate.mul(120).div(100)
  });
  
  // ... rest of function ...
};
```

## 🔧 Contract Functions

### AVAX Staking Contract
```solidity
// Stake AVAX
function stake() external payable

// Unstake AVAX
function unstake() external

// Claim rewards
function claimRewards() external

// Get staker info
function getStakerInfo(address stakerAddress) external view returns (...)
```

### NFT Contract
```solidity
// Mint NFT
function mintNFT() external payable

// Get NFT metadata
function getNFTMetadata(uint256 tokenId) external view returns (...)
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- ✅ Staking functionality
- ✅ NFT minting
- ✅ Reward calculations
- ✅ Contract integration
- ✅ Error handling

## 📊 Contract Statistics

After deployment, check contract stats:
- **Total Staked**: Amount of AVAX staked
- **Total Rewards Paid**: Rewards distributed
- **NFTs Minted**: Number of NFTs created
- **Contract Balance**: Available funds

## 🔍 Verification

Contracts are automatically verified on Snowtrace:
- Staking Contract: `https://testnet.snowtrace.io/address/{STAKING_ADDRESS}`
- NFT Contract: `https://testnet.snowtrace.io/address/{NFT_ADDRESS}`

## 🛡️ Security Features

- **Access Control**: Owner-only functions
- **Pause Mechanism**: Emergency pause functionality
- **Input Validation**: Proper parameter validation
- **Reentrancy Protection**: Safe external calls
- **Overflow Protection**: Safe math operations

## 📈 Gas Optimization

- **Optimized Solidity**: Version 0.8.19 with optimizations
- **Efficient Storage**: Minimal storage operations
- **Batch Operations**: Reduced transaction costs
- **Gas Estimation**: Accurate gas calculations

## 🎯 Game Features

### Staking Rewards
- **10% APY**: Competitive reward rate
- **Real-time Calculation**: Accurate reward computation
- **Flexible Unstaking**: No lock periods
- **Compound Rewards**: Reinvest automatically

### NFT System
- **Unique Metadata**: Each NFT has unique attributes
- **Rarity System**: Common to Legendary rarities
- **Dynamic Attributes**: Power, element, generation
- **Metadata Storage**: On-chain metadata

## 🚨 Emergency Functions

### Owner Controls
- **Pause Staking**: Emergency pause
- **Fund Rewards**: Add reward funds
- **Emergency Withdraw**: Emergency fund recovery
- **Update Parameters**: Modify contract settings

## 📞 Support

For issues or questions:
- Check the test files for usage examples
- Review the contract code for implementation details
- Test on local network before mainnet deployment

## 📄 License

MIT License - see LICENSE file for details.

---

**🎮 Ready to integrate real smart contracts into your Crypto Island Adventure game!** 🚀