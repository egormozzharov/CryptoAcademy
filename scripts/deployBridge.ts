import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

async function main() {
  const [validator] = await ethers.getSigners();
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("Bridge");
  console.log("Contract factory");
  const contract: Contract = await contractFactory.deploy(validator.address, {gasPrice: 70000000000});
  await contract.deployed();
  console.log("ERC20Basic deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});