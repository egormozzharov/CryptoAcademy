import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Deploying the contract...");
  const contractFactory: ContractFactory = await ethers.getContractFactory("DAO");
  console.log("Contract factory");

  let chairPerson = owner.address;
  let voteToken = process.env.RINKEBY_URL_DEPLOYED_CONTRACT_ADDRESS || "";
  let minimumQuorum = 10;
  let debatingPeriod = 3600;
  const contract: Contract = await contractFactory.connect(owner).deploy(chairPerson, voteToken, minimumQuorum, debatingPeriod, {gasPrice: 70000000000});
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});