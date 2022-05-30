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

    task("createitem", "Create item")
    .addParam("recipient", "string")
    .addParam("tokenurl", "string")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['createItem(address,uint256,string)'](taskArgs.recipient, taskArgs.amount, taskArgs.tokenurl);
        }
        else {
            await contract.connect(owner)['createItem(address,string)'](taskArgs.recipient, taskArgs.tokenurl);
        }
    });

    task("listitem", "List item")
    .addParam("tokenid", "number")
    .addParam("price", "number")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['listItem(uint256,uint256,uint256)'](taskArgs.tokenid, taskArgs.amount, taskArgs.price);
        }
        else {
            await contract.connect(owner)['listItem(uint256,uint256)'](taskArgs.tokenid, taskArgs.price);
        }
    });

    task("cancellisting", "Cancel listing")
    .addParam("listingid", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).cancelListing(taskArgs.listingid);
    });

    task("buyitem", "Buy item")
    .addParam("listingid", "number")
    .addParam("price", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).buyItem(taskArgs.listingid, taskArgs.price);
    });

    task("getlisting", "Get listing")
    .addParam("listingid", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).listings(taskArgs.listingid);
    });

    task("listitemonauction", "List item on auction")
    .addParam("tokenid", "number")
    .addParam("price", "number")
    .addOptionalParam("amount", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        if (taskArgs.amount != 0) {
            await contract.connect(owner)['listItemOnAuction(uint256,uint256,uint256)'](taskArgs.tokenid, taskArgs.amount, taskArgs.price);
        }
        else {
            await contract.connect(owner)['listItemOnAuction(uint256,uint256)'](taskArgs.tokenid, taskArgs.price);
        }
    });

    task("makebid", "Make bid")
    .addParam("auctionid", "number")
    .addParam("price", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).makeBid(taskArgs.auctionid, taskArgs.price);
    });

    task("finishauction", "Finish auction")
    .addParam("auctionid", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).finishAuction(taskArgs.auctionid);
    });

    task("getauction", "Get auction")
    .addParam("auctionid", "number")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(CONTRACT_NAME, CONTRACT_ADDRESS)) as NftMarketplace;
        await contract.connect(owner).auctions(taskArgs.auctionId);
    });
}