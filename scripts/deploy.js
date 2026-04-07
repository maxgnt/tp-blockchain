import hre from "hardhat";

async function main() {
  console.log("Déploiement de SimpleStorage...\n");


  const conn = await hre.network.connect();

  const accounts = await conn.provider.request({ method: "eth_accounts" });
  const deployer = accounts[0];
  
  console.log("Déployeur :", deployer);
  

  const balance = await conn.provider.request({ 
    method: "eth_getBalance", 
    params: [deployer, "latest"] 
  });
  console.log("Solde     :", parseInt(balance, 16) / 1e18, "ETH\n");


  const artifact = await hre.artifacts.readArtifact("SimpleStorage");
  

  const hash = await conn.provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: deployer,
      data: artifact.bytecode,
      gas: "0x1000000",
    }],
  });
  
  console.log("Transaction hash:", hash);
  

  const receipt = await conn.provider.request({
    method: "eth_getTransactionReceipt",
    params: [hash],
  });
  
  console.log("SimpleStorage déployé à :", receipt.contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});