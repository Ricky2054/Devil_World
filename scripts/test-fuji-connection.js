import { ethers } from "ethers";

async function main() {
  console.log("Deploying contracts to Avalanche Fuji testnet...");

  try {
    // Connect to Fuji network
    const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
    
    // You'll need to set your private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Please set PRIVATE_KEY environment variable");
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Deploying contracts with account:", wallet.address);
    
    // Get balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "AVAX");

    // For now, let's just test the connection
    console.log("Connected to Fuji network successfully!");
    console.log("Network:", await provider.getNetwork());
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Connection test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Connection test failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  });
