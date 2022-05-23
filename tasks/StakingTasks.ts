import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ERC20Basic } from '../typechain-types/ERC20Basic';
import { StakingContract } from '../typechain-types/StakingContract';
import { IUniswapV2Router02 } from "../typechain-types/interfaces/IUniswapV2Router02";

export function stakingTasks() {
    const ERC20BASCIC_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_CONTRACT_ADDRESS || "";
    const STAKING_CONTARCT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_STAKING_CONTARCT_ADDRESS || "";
    const UniswapV2Router02Address = process.env.UniswapV2Router02Address || "";

    task("createPool", "Create a new liquidity pool")
    .addParam("customTokenAmount", "integer")
    .addParam("ethAmount", "integer")
    .addParam("deadline", "integer")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const customToken: ERC20Basic = (await hre.ethers.getContractAt("ERC20Basic", ERC20BASCIC_CONTRACT_ADDRESS)) as ERC20Basic;
        customToken.connect(owner).approve(UniswapV2Router02Address, taskArgs.customTokenAmount);
        const router: IUniswapV2Router02 = (await hre.ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address)) as IUniswapV2Router02;
        await router.addLiquidityETH(
        customToken.address,
        taskArgs.customTokenAmount,
        taskArgs.customTokenAmount,
        taskArgs.ethAmount,
        owner.address,
        taskArgs.deadline,
        { value: taskArgs.ethAmount }
        );
    });

    task("stake", "Stake tokens")
    .addParam("value", "integer")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt("StakingContract", STAKING_CONTARCT_ADDRESS)) as StakingContract;
        await contract.connect(owner).stake(taskArgs.value);
    });

    task("claim", "Claim reward tokens")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt("StakingContract", STAKING_CONTARCT_ADDRESS)) as StakingContract;
        await contract.claim();
    });

    task("Unstake", "Unstake tokens")
    .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = (await hre.ethers.getContractAt("StakingContract", STAKING_CONTARCT_ADDRESS)) as StakingContract;
        await contract.connect(owner).unstake();
    });
}

