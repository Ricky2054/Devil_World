import { JsonRpcProvider, Wallet, parseEther, formatEther } from "ethers";

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:9650/ext/bc/C/rpc";
const toAddress = process.env.TO;
const amountAvax = process.env.AMOUNT || "5"; // default 5 AVAX
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) throw new Error("PRIVATE_KEY env var is required");
if (!toAddress) throw new Error("TO env var is required (recipient address)");

const provider = new JsonRpcProvider(rpcUrl);

const main = async () => {
  const network = await provider.getNetwork();
  console.log("RPC:", rpcUrl, "chainId:", Number(network.chainId));

  const wallet = new Wallet(privateKey, provider);
  const bal = await provider.getBalance(wallet.address);
  console.log("From:", wallet.address, "balance:", formatEther(bal), "AVAX");

  console.log(`Sending ${amountAvax} AVAX to ${toAddress}...`);
  const tx = await wallet.sendTransaction({ to: toAddress, value: parseEther(amountAvax) });
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
};

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


