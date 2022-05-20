import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC20Basic } from '../typechain-types/ERC20Basic';

describe("ERC20Basic", function () {

  let tokenContract: ERC20Basic;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

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
      await expect(await tokenContract.connect(owner).totalSupply()).to.be.equal(100000);
    });
  });

  describe("balanceOf", function () {
    it("Shoud return address balance", async function () {
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(100000);
    });
  });

  describe("mint", function () {
    it("Shoud revert if zero-address was given", async function () {
      await expect(tokenContract.connect(owner).mint(ethers.constants.AddressZero, 100)).to.be.revertedWith("ERC20: mint to the zero address is not allowed");
    });

    it("Shoud mint successfully", async function () {
      await expect(await tokenContract.connect(owner).mint(owner.address, 100))
        .to.emit(tokenContract, "Transfer").withArgs(ethers.constants.AddressZero, owner.address, 100);
      await expect(await tokenContract.connect(owner).totalSupply()).to.be.equal(100100);
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(100100);
    });
  });

  describe("burn", function () {
    it("Shoud revert if caller is not an owner", async function () {
      await expect(tokenContract.connect(addr1).burn(addr1.address, 100)).to.be.revertedWith("Only owner allowed");
    });

    it("Shoud revert if zero-address was given", async function () {
      await expect(tokenContract.connect(owner).burn(ethers.constants.AddressZero, 100)).to.be.revertedWith("ERC20: burn from the zero address is not allowed");
    });

    it("Shoud revert if given amount to burn exceeds the account balance", async function () {
      await expect(tokenContract.connect(owner).burn(owner.address, 100001)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Shoud burn successfully", async function () {
      await expect(await tokenContract.connect(owner).burn(owner.address, 100))
        .to.emit(tokenContract, "Transfer").withArgs(owner.address, ethers.constants.AddressZero, 100);
      await expect(await tokenContract.connect(owner).totalSupply()).to.be.equal(99900);
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(99900);
    });
  });

  describe("transfer", function () {
    it("Shoud revert when trying to send amount which exceeds the sender balance", async function () {
      await expect(tokenContract.connect(owner).transfer(addr1.address, 100001)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Shoud revert when trying to send to zero-address", async function () {
      await expect(tokenContract.connect(owner).transfer(ethers.constants.AddressZero, 100)).to.be.revertedWith("ERC20: transfer to the zero address is not allowed");
    });

    it("Shoud transfer successfully", async function () {
      await expect(await tokenContract.connect(owner).transfer(addr1.address, 100))
        .to.emit(tokenContract, "Transfer").withArgs(owner.address, addr1.address, 100);
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(99900);
      await expect(await tokenContract.connect(owner).balanceOf(addr1.address)).to.be.equal(100);
    });
  });

  describe("approve", function () {
    it("Shoud revert when trying to approve to zero-address", async function () {
      await expect(tokenContract.connect(owner).approve(ethers.constants.AddressZero, 100)).to.be.revertedWith("ERC20: approve to the zero address is not allowed");
    });

    it("Should approve successfully", async function () {
      await expect(await tokenContract.connect(owner).approve(addr1.address, 100))
        .to.emit(tokenContract, "Approval").withArgs(owner.address, addr1.address, 100);
    });
  });

  describe("allowance", function () {
    it("Should be able to see allowance to send 100 from owner", async function () {
      await tokenContract.connect(owner).approve(addr1.address, 100);
      await expect(await tokenContract.connect(owner).allowance(owner.address, addr1.address)).to.be.equal(100);
    });
  });

  describe("transferFrom", function () {
    it("Shoud revert when trying to send to zero-address", async function () {
      await expect(tokenContract.connect(owner).transferFrom(owner.address, ethers.constants.AddressZero, 100))
        .to.be.revertedWith("ERC20: transfer to the zero address is not allowed");
    });

    it("Shoud revert when trying to send amount which exceeds the sender balance", async function () {
      await expect(tokenContract.connect(owner).transferFrom(owner.address, addr1.address, 100001)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Shoud revert when trying to send amount which exceeds the allowance", async function () {
      await expect(tokenContract.connect(owner).transferFrom(owner.address, addr1.address, 100))
        .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("Shoud transfer successfully", async function () {
      //arrange
      await tokenContract.connect(owner).approve(addr1.address, 100);

      //act
      await tokenContract.connect(addr1).transferFrom(owner.address, addr2.address, 100)

      //assert
      await expect(await tokenContract.connect(owner).balanceOf(owner.address)).to.be.equal(99900);
      await expect(await tokenContract.connect(owner).balanceOf(addr1.address)).to.be.equal(0);
      await expect(await tokenContract.connect(owner).balanceOf(addr2.address)).to.be.equal(100);
    });
  });
});

