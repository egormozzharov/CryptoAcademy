import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

const ACDM_TOKEN_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_ACDMTOKEN_CONTRACT_ADDRESS || "";

async function main() {
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("ACDMPlatform");
  console.log("Contract factory");
  const contract: Contract = await contractFactory.deploy(ACDM_TOKEN_ADDRESS, 3600, {gasPrice: 70000000000});
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});