import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

async function main() {
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("StakingStub");
  console.log("Contract factory");
  const persentage = 10;
  const contract: Contract = await contractFactory.deploy(persentage, {gasPrice: 70000000000});
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});