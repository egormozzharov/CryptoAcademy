import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ERC20Basic } from '../typechain-types/contracts/ERC20Basic';

export function erc20BasicTasks() {
    const ERC20BASCIC_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_CONTRACT_ADDRESS || "";
    const CONTRACT_NAME = "ERC20Basic";

    const attachToContract = async (hre: HardhatRuntimeEnvironment): Promise<ERC20Basic> => {
        const [owner] = await hre.ethers.getSigners();
        const contractFactory: ContractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME, owner);
        const tokenContract = await contractFactory.attach(ERC20BASCIC_CONTRACT_ADDRESS).connect(owner);
        return tokenContract as ERC20Basic;
    }

    task("name", "Get token name", async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const tokenContract = await attachToContract(hre);
        const name: string = await tokenContract.name();
        console.log(`Name: ${name}`);
    });

    task("approve", "Approve allowance")
    .addParam("to", "Address of the spender")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const tokenContract: ERC20Basic = (await attachToContract(hre)) as ERC20Basic;
        const result = await tokenContract.approve(taskArgs.to, 100);
        console.log(`Approve: ${result}`);
    });

    task("transfer", "Transfer tokens")
    .addParam("to", "Address to transfer to")
    .addParam("amount", "Amount to transfer")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const tokenContract = await attachToContract(hre);
        await tokenContract.transfer(taskArgs.to, taskArgs.amount, {gasPrice: 50000000000});
        console.log('Transfered');
    });

    task("transferfrom", "Transfer tokens from another account")
    .addParam("from", "From address")
    .addParam("to", "To address")
    .addParam("amount", "To address")
    .setAction(async ({taskArgs}: any, hre: HardhatRuntimeEnvironment) => {
        const tokenContract = await attachToContract(hre);
        await tokenContract.transferFrom(taskArgs.from, taskArgs.to, taskArgs.amount, {gasPrice: 50000000000});
        console.log('Transfered');
    });

    task("balanceof", "Balance of")
    .addParam("account", "The account's address", "string")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const tokenContract = await attachToContract(hre);
        const balace = await tokenContract.balanceOf(taskArgs.account);
        console.log(`Balance of ${taskArgs.account}: ${balace}`);
    });
}
