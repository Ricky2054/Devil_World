// Simple wallet connection test
const testWalletConnection = async () => {
  try {
    console.log('Testing wallet connection...');
    
    // Check if MetaMask is available
    if (typeof window.ethereum === 'undefined') {
      console.error('MetaMask not found');
      return false;
    }
    
    // Check if it's MetaMask
    if (!window.ethereum.isMetaMask) {
      console.error('Not MetaMask wallet');
      return false;
    }
    
    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('Connected accounts:', accounts);
    
    // Get chain ID
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Chain ID:', chainId);
    
    // Get balance
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [accounts[0], 'latest']
    });
    console.log('Balance:', balance);
    
    return true;
  } catch (error) {
    console.error('Wallet connection test failed:', error);
    return false;
  }
};

// Export for use
window.testWalletConnection = testWalletConnection;
