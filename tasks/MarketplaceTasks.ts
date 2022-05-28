import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NftMarketplace } from '../typechain-types/contracts/NFTMarketplace.sol/NftMarketplace';

export function marketplaceTasks() {
    const CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_NFT_MARKETPLACE_CONTRACT_ADDRESS || "";
    const CONTRACT_NAME = "NftMarketplace";

    task("createItem", "Create item")
    .addParam("recipient", "string")
    .addParam("tokenUrl", "string")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['createItem(address,uint256,string)'](taskArgs.recipient, taskArgs.amount, taskArgs.tokenUrl);
        }
        else {
            await contract.connect(owner)['createItem(address,string)'](taskArgs.recipient, taskArgs.tokenUrl);
        }
    });

    task("listItem", "List item")
    .addParam("tokenId", "number")
    .addParam("price", "number")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['listItem(uint256,uint256,uint256)'](taskArgs.tokenId, taskArgs.amount, taskArgs.price);
        }
        else {
            await contract.connect(owner)['listItem(uint256,uint256)'](taskArgs.tokenId, taskArgs.price);
        }
    });

    task("cancelListing", "Cancel listing")
    .addParam("listingId", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).cancelListing(taskArgs.listingId);
    });

    task("buyItem", "Buy item")
    .addParam("listingId", "number")
    .addParam("price", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).buyItem(taskArgs.listingId, taskArgs.price);
    });

    task("getListing", "Get listing")
    .addParam("listingId", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).getListing(taskArgs.listingId);
    });

    task("listItemOnAuction", "List item on auction")
    .addParam("tokenId", "number")
    .addParam("price", "number")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['listItemOnAuction(uint256,uint256,uint256)'](taskArgs.tokenId, taskArgs.amount, taskArgs.price);
        }
        else {
            await contract.connect(owner)['listItemOnAuction(uint256,uint256)'](taskArgs.tokenId, taskArgs.price);
        }
    });

    task("makeBid", "Make bid")
    .addParam("auctionId", "number")
    .addParam("price", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).makeBid(taskArgs.auctionId, taskArgs.price);
    });

    task("finishAuction", "Finish auction")
    .addParam("auctionId", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).finishAuction(taskArgs.auctionId);
    });

    task("getAuction", "Get auction")
    .addParam("auctionId", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).getAuction(taskArgs.auctionId);
    });
}