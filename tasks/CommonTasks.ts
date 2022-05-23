import { task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';

export function commonTasks() {
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
}