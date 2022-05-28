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
    const CONTRACT_NAME = "ERC1155Contract";

    task("setMinter1155", "Set minter for erc1155")
    .addParam("minterAddress", "string")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as MyNFT;
        await contract.setMinter(taskArgs.minterAddress);
    });

    task("mint1155", "Mint token for erc1155")
    .addParam("recipient", "string")
    .addParam("tokenURI", "string")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as MyNFT;
        await contract.connect(owner).mint(taskArgs.recipient, taskArgs.tokenURI);
    });
}

