import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MyNFT } from '../typechain-types/contracts/ERC721.sol/MyNFT';

export function erc1155Tasks() {
    const CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_ERC1155_CONTRACT_ADDRESS || "";
    const contractName = "ERC1155Contract";

    task("setMinter", "Set minter")
    .addParam("minterAddress", "string")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(contractName, CONTRACT_ADDRESS)) as MyNFT;
        await contract.setMinter(taskArgs.minterAddress);
    });

    task("mint", "Mint token")
    .addParam("recipient", "string")
    .addParam("tokenURI", "string")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(contractName, CONTRACT_ADDRESS)) as MyNFT;
        await contract.connect(owner).mint(taskArgs.recipient, taskArgs.tokenURI);
    });
}

