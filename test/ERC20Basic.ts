import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe("ERC20Basic", function () {

  let tokenContract: Contract;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    const contractFactory: ContractFactory = await ethers.getContractFactory("ERC20Basic", owner);
    tokenContract = await contractFactory.deploy();
    await tokenContract.deployed();
  });

  describe("Name", function () {
    it("Shoud be able to read token name", async function () {
      await expect(await tokenContract.connect(owner).name()).to.be.equal("ERC20Basic");
    });
  });

  describe("Symbol", function () {
    it("Shoud be able to read symbol name", async function () {
      await expect(await tokenContract.connect(owner).symbol()).to.be.equal("ERC");
    });
  });
});

