import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DAO } from '../typechain-types/contracts/DAO';

export function daoTasks() {
    const DAO_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_DAO_CONTRACT_ADDRESS || "";
    const STAKING_STUB_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_STAKING_STUB || "";
    const DAO_CONTRACT_NAME = "DAO";

    // npx hardhat addproposal --network rinkeby --description description1 --amount 100
    task("addproposal", "Add proposal")
    .addParam("description", "string")
    .addParam("amount", "integer")
    .setAction(async ({ description, amount }, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const daoContract = (await hre.ethers.getContractAt(DAO_CONTRACT_NAME, DAO_CONTRACT_ADDRESS)) as DAO;
        const callData = getExternalContractCallData(hre, amount);
        await daoContract.connect(owner).addProposal(description, callData, STAKING_STUB_ADDRESS);
    });

    // npx hardhat vote --network rinkeby --proposalid 1 --ispositive true
    task("vote", "Vote proposal")
    .addParam("proposalid", "integer")
    .addParam("ispositive", "boolean")
    .setAction(async ({ proposalid, ispositive }, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const daoContract = (await hre.ethers.getContractAt(DAO_CONTRACT_NAME, DAO_CONTRACT_ADDRESS)) as DAO;
        await daoContract.connect(owner).voteProposal(proposalid, ispositive);
    });

    // npx hardhat finish --network rinkeby --proposalid 1
    task("finish", "Finish proposal")
    .addParam("proposalid", "integer")
    .setAction(async ({ proposalid }, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const daoContract = (await hre.ethers.getContractAt(DAO_CONTRACT_NAME, DAO_CONTRACT_ADDRESS)) as DAO;
        await daoContract.connect(owner).finishProposal(proposalid);
    });

    function getExternalContractCallData(hre: HardhatRuntimeEnvironment, amount: number) {
        let jsonAbi = [{ "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "setRewardPersentage", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
        let iFace = new hre.ethers.utils.Interface(jsonAbi);
        return iFace.encodeFunctionData('setRewardPersentage', [amount]);
    }
}

