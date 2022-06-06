import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Bridge } from '../typechain-types/contracts/Bridge';

export function bridgeTasks() {
    const bridgeContracts: { [name: string]: string } = {
        "rinkeby": process.env.RINKEBY_URL_DEPLOYED_SWAP_CONTRACT_ADDRESS || "",
        "bsc_testnet": process.env.BSC_URL_DEPLOYED_SWAP_CONTRACT_ADDRESS || ""
    }

    const CONTRACT_NAME = "Bridge";

    const attachToContract = async (hre: HardhatRuntimeEnvironment): Promise<Bridge> => {
        const network = hre.network.name;
        const contractAddress = (bridgeContracts[network]) as string;
        const [owner] = await hre.ethers.getSigners();
        const contractFactory: ContractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME, owner);
        const bridgeContract = await contractFactory.attach(contractAddress).connect(owner);
        return bridgeContract as Bridge;
    }

    // npx hardhat swap --network rinkeby --tonetwork 97 --toaddress 0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6 --fromnetwork 2 --fromaddress 0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6 --fromerc20address 0xc89384f7B457d1b9dA414e13972fC431aA057F50 --amount 1000
    task("swap", "Swap tokens")
    .addParam("tonetwork", "integer")
    .addParam("toaddress", "string")
    .addParam("fromnetwork", "integer")
    .addParam("fromaddress", "string")
    .addParam("fromerc20address", "string")
    .addParam("amount", "integer")
    .setAction(async ({ tonetwork, toaddress, fromnetwork, fromaddress, fromerc20address, amount }, hre) => {
        const bridgeContract = await attachToContract(hre);
        await bridgeContract.swap(tonetwork, toaddress, fromnetwork, fromaddress, fromerc20address, amount);
        console.log('Swapped');
    });

    // npx hardhat redeem --network bsc_testnet --tonetwork 97 --toaddress 0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6 --toerc20address 0xa7aD602893A894dEF42128EE5c693ada214a139c --amount 1000 --nonce 2
    task("redeem", "Redeem")
    .addParam("tonetwork", "integer")
    .addParam("toaddress", "string")
    .addParam("toerc20address", "string")
    .addParam("amount", "integer")
    .addParam("nonce", "integer")
    .setAction(async ({ tonetwork, toaddress, toerc20address, amount, nonce }, hre) => {
        const bridgeContract = await attachToContract(hre);
        let signature = await getSignature(hre, tonetwork, toaddress, toerc20address, amount, nonce);
        await bridgeContract.redeem(signature, tonetwork, toaddress, toerc20address, amount, nonce);
        console.log('Redeemed');
    });

    async function getSignature(hre: HardhatRuntimeEnvironment,
        tonetwork: string, toaddress: string, toerc20address: string, amount: number, nonce: number) {
        const [owner] = await hre.ethers.getSigners();
        let encodedData = hre.ethers.utils.defaultAbiCoder.encode(
            ["uint256", "address", "address", "uint256", "uint256"],
            [tonetwork, toaddress, toerc20address, amount, nonce]
        );
        let arrayfyedData = hre.ethers.utils.arrayify(encodedData);
        let hash = hre.ethers.utils.keccak256(arrayfyedData);
        let signature = await owner.signMessage(hre.ethers.utils.arrayify(hash));
        return signature;
    }
}