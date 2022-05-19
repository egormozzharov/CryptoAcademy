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
import { ethers } from 'ethers';
import { IERC20 } from './typechain-types/interfaces/IERC20';

dotenv.config();

const CONTRACT_ADDRESS = process.env.RINKEBY_URL_DEPLOYED_CONTRACT_ADDRESS || "";
const CONTRACT_NAME = "ERC20Basic";
const LPTokenAddress = "0xaB32ca8673F6754e0209305b89078c0465f99d8c";

const attachToContract = async (hre: HardhatRuntimeEnvironment): Promise<ERC20Basic> => {
  const [owner] = await hre.ethers.getSigners();
  const contractFactory: ContractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME, owner);
  const tokenContract = await contractFactory.attach(CONTRACT_ADDRESS).connect(owner);
  return tokenContract as ERC20Basic;
}

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

task("lptokenbalance", "Balance of")
  .setAction(async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const [owner] = await hre.ethers.getSigners();
    const lpToken = await hre.ethers.getContractAt("IERC20", LPTokenAddress);
    const balance = await lpToken.connect(owner).balanceOf(owner.address);
    console.log(`Balance of lpToken ${owner.address}: ${balance}`);
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
