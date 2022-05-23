import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

async function main() {
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("NftMarketplace");
  console.log("Contract factory");
  const contract: Contract = await contractFactory.deploy({gasPrice: 70000000000});
  await contract.deployed();
  console.log("NftMarketplace deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});