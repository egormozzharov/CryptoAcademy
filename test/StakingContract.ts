import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC20Basic } from '../typechain-types/ERC20Basic';
import { StakingContract } from '../typechain-types/StakingContract';
import { IUniswapV2Router02 } from "../typechain-types/interfaces/IUniswapV2Router02";
import { IERC20 } from '../typechain-types/interfaces/IERC20';
import { IUniswapV2Factory } from '../typechain-types/interfaces/IUniswapV2Factory';
import { getContractFactory } from '@nomiclabs/hardhat-ethers/types';

describe("StakingContract", function () {

  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let customTokenContract: ERC20Basic;
  let stakingContract: StakingContract;

  const UniswapV2Router02Address: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const UniswapV2FactoryAddress: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  const ethAmount = ethers.BigNumber.from('1000000000');
  const customTokenAmount = ethers.BigNumber.from('10');

  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const deployContract = async (contractName: string, ...args: any[]): Promise<Contract> => {
    const contractFactory: ContractFactory = await ethers.getContractFactory(contractName, owner);
    let contract: Contract;
    if (args.length > 0) {
      contract = await contractFactory.deploy(args[0]);
    }
    else {
      contract = await contractFactory.deploy();
    }
    return await contract.deployed();
  }


  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    customTokenContract = (await deployContract("ERC20Basic")) as ERC20Basic;
    console.log("customTokenContract.address: " + customTokenContract.address);

    customTokenContract.connect(owner).approve(UniswapV2Router02Address, 1000);
    const router: IUniswapV2Router02 = (await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address)) as IUniswapV2Router02;
    await router.addLiquidityETH(
      customTokenContract.address,
      customTokenAmount,
      customTokenAmount,
      ethAmount,
      owner.address,
      deadline,
      { value: ethAmount }
    );

    const factory: IUniswapV2Factory = (await ethers.getContractAt("IUniswapV2Factory", UniswapV2FactoryAddress)) as IUniswapV2Factory;
    const lpTokenAddress = await factory.getPair(customTokenContract.address, await router.WETH());
    const lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
    const balance = await lpToken.connect(owner).balanceOf(owner.address);
    console.log(`Balance of lpToken ${owner.address}: ${balance}`);

    stakingContract = (await deployContract("StakingContract", lpTokenAddress)) as StakingContract;
  });

  describe("stake", function () {
    it("Shoud stake succsesfully", async function () {
    });
  });
});

