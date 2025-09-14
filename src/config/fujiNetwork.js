// Local Avalanche Network Configuration
export const FUJI_NETWORK_CONFIG = {
  name: "Avalanche Local",
  rpcUrl: "http://127.0.0.1:8545",
  chainId: 31337, // Hardhat local network
  currencySymbol: "AVAX",
  blockExplorer: "",
  gasPrice: 25000000000,
};

// Contract addresses for local network (update with your deployed addresses)
export const FUJI_CONTRACT_ADDRESSES = {
  STAKING: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  NFT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  TOKEN: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

// Network detection helper
export function isFujiNetwork(chainId) {
  return chainId === FUJI_NETWORK_CONFIG.chainId;
}

// Get current network configuration
export function getCurrentNetworkConfig(chainId) {
  if (isFujiNetwork(chainId)) {
    return FUJI_NETWORK_CONFIG;
  }
  return null;
}
