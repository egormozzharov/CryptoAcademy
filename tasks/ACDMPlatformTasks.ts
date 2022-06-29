import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ACDMPlatform } from '../typechain-types/contracts/ACDMPlatform';

export function acdmPlatformTasks() {
    const ACDMPLATFORM_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_ACDMPLATFORM_CONTRACT_ADDRESS || "";
    const ACDM_PLATFORM_CONTRACT_NAME = "ACDMPlatform";

    // npx hardhat seteditor --network rinkeby --editor 0x4F745f87488A3d5fb7309892F8CEcCeb97a65610
    task("seteditor", "Set editor")
    .addParam("editor", "string")
    .setAction(async ({editor}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).setEditor(editor);
    });

    // npx hardhat register --network rinkeby --newuser 0x4F745f87488A3d5fb7309892F8CEcCeb97a65610 --referer 0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6
    task("register", "Register")
    .addParam("newuser", "string")
    .addParam("referer", "string")
    .setAction(async ({newuser, referer}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).register(newuser, referer);
    });

    // npx hardhat register --network rinkeby --newuser 0x4F745f87488A3d5fb7309892F8CEcCeb97a65610 --referer 0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6
    task("buyacdm", "buyACDM")
    .setAction(async (hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).buyACDM();
    });

    // npx hardhat addorder --network rinkeby --amount 1 --priceperunit 10000
    task("addorder", "Add order")
    .addParam("amount", "integer")
    .addParam("priceperunit", "integer")
    .setAction(async ({amount, priceperunit}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).addOrder(amount, priceperunit);
    });

    // npx hardhat removeOrder --network rinkeby --orderid 1
    task("removeorder", "Remove Order")
    .addParam("orderid", "integer")
    .setAction(async ({orderid}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).removeOrder(orderid);
    });

    // npx hardhat buyorder --network rinkeby --orderid 1
    task("buyorder", "Buy Order")
    .addParam("orderid", "integer")
    .setAction(async ({orderid}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).buyOrder(orderid);
    });

    // npx hardhat startsaleround --network rinkeby
    task("startsaleround", "Start Sale Round")
    .setAction(async (hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).startSaleRound();
    });

    // npx hardhat start-trade-round --network rinkeby
    task("start-trade-round", "Start Trade Round")
    .setAction(async (hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).startTradeRound();
    });

    // npx hardhat setrewardfractionforsaleref1 --network rinkeby --fraction 20
    task("setrewardfractionforsaleref1", "Set Reward Fraction For Sale Ref1")
    .addParam("fraction", "integer")
    .setAction(async ({fraction}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).setRewardFractionForSaleRef1(fraction);
    });

    // npx hardhat setrewardfractionforsaleref2 --network rinkeby --fraction 20
    task("setrewardfractionforsaleref2", "Set Reward Fraction For Sale Ref2")
    .addParam("fraction", "integer")
    .setAction(async ({fraction}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).setRewardFractionForSaleRef2(fraction);
    });

    // npx hardhat setrewardfractionfortraderef1 --network rinkeby --fraction 20
    task("setrewardfractionfortraderef1", "Set Reward Fraction For Trade Ref1")
    .addParam("fraction", "integer")
    .setAction(async ({fraction}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).setRewardFractionForTradeRef1(fraction);
    });

    // npx hardhat setrewardfractionfortraderef2 --network rinkeby --fraction 20
    task("setrewardfractionfortraderef2", "Set Reward Fraction For Trade Ref2")
    .addParam("fraction", "integer")
    .setAction(async ({fraction}, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt(ACDM_PLATFORM_CONTRACT_NAME, ACDMPLATFORM_CONTRACT_ADDRESS)) as ACDMPlatform;
        await contract.connect(owner).setRewardFractionForTradeRef2(fraction);
    });
}