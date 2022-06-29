import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

const LP_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_LP_CONTRACT_ADDRESS || "";
const CUSTOM_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_XXXTOKEN_CONTRACT_ADDRESS || "";

async function main() {
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("StakingContract");
  console.log("Contract factory");
  const contract: Contract = await contractFactory.deploy(LP_CONTRACT_ADDRESS, CUSTOM_CONTRACT_ADDRESS, 20, 3600, {gasPrice: 70000000000});
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});