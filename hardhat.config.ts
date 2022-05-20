import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ContractFactory, Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ERC20Basic } from './typechain-types/ERC20Basic';
import { StakingContract } from './typechain-types/StakingContract';
import { ethers } from 'ethers';
import { IERC20 } from './typechain-types/interfaces/IERC20';
import { IUniswapV2Router02 } from "./typechain-types/interfaces/IUniswapV2Router02";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts: SignerWithAddress[] = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

task("balances", "Prints the balances of all accounts", async (taskArgs, hre) => {
  const accounts: SignerWithAddress[] = await hre.ethers.getSigners();
  for (const account of accounts) {
    const balance0ETH = await ethers.getDefaultProvider().getBalance(account.address);
    console.log(`${account.address} ${balance0ETH.toString()} ETH`);
  }
});


//ERC20Basic tasks
const ERC20BASCIC_CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_CONTRACT_ADDRESS || "";
const STAKING_CONTARCT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_STAKING_CONTARCT_ADDRESS || "";
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

task("balanceof", "Balance of",)
  .addParam("account", "The account's address", "string")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const tokenContract = await attachToContract(hre);
    const balace = await tokenContract.balanceOf(taskArgs.account);
    console.log(`Balance of ${taskArgs.account}: ${balace}`);
});

//StakingTaks
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

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.RINKEBY_URL || "",
        blockNumber: 10692578
      }
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
