import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC20Basic } from '../typechain-types/ERC20Basic';

describe("ERC20Basic", function () {

  let tokenContract: ERC20Basic;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const contractFactory: ContractFactory = await ethers.getContractFactory("ERC20Basic", owner);
    tokenContract = (await contractFactory.deploy()) as ERC20Basic;
    await tokenContract.deployed();
  });

  describe("name", function () {
    it("Shoud be able to get token name", async function () {
      await expect(await tokenContract.connect(owner).name()).to.be.equal("ERC20Basic");
    });
  });

  describe("symbol", function () {
    it("Shoud be able to get symbol name", async function () {
      await expect(await tokenContract.connect(owner).symbol()).to.be.equal("ERC");
    });
  });

  describe("decimals", function () {
    it("Shoud be able to get decimals", async function () {
      await expect(await tokenContract.connect(owner).decimals()).to.be.equal(2);
    });
  });

  describe("totalSupply", function () {
    it("Shoud be able to get total supply", async function () {
      await expect(await tokenContract.connect(owner).totalSupply()).to.be.equal(10000);
    });
  });

  describe("balanceOf", function () {
    it("Shoud return address balance", async function () {
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(10000);
    });
  });

  describe("mint", function () {
    it("Shoud revert if caller is not an owner", async function () {
      await expect(tokenContract.connect(addr1).mint(owner.address, 100)).to.be.revertedWith("Only owner can call mint");
    });

    it("Shoud revert if zero-address was given", async function () {
      await expect(tokenContract.connect(owner).mint(ethers.constants.AddressZero, 100)).to.be.revertedWith("ERC20: mint to the zero address is not allowed");
    });

    it("Shoud mint successfully", async function () {
      await expect(await tokenContract.connect(owner).mint(owner.address, 100))
        .to.emit(tokenContract, "Transfer").withArgs(ethers.constants.AddressZero, owner.address, 100);
      await expect(await tokenContract.connect(owner).totalSupply()).to.be.equal(10100);
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(10100);
    });
  });
});

