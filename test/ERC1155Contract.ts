import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC1155Contract } from '../typechain-types/contracts/ERC1155.sol/ERC1155Contract';

describe("ERC1155", function () {

  let tokenContract: ERC1155Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const contractFactory: ContractFactory = await ethers.getContractFactory("ERC1155Contract", owner);
    tokenContract = (await contractFactory.deploy()) as ERC1155Contract;
    await tokenContract.deployed();
    await tokenContract.setMinter(await owner.getAddress());
  });

  describe("safeTransferFrom", function () {
    it("Shoud transfer successfully", async function () {
      // arrange
      const tokenId = 1;
      const amount = 10;
      const uri = "https://example.com/";
      await tokenContract.mint(owner.address, amount, uri);
      // act
      await tokenContract.safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []);
      // assert
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId)).to.be.equal(amount);
    });
  });

  describe("safeBatchTransferFrom", function () {
    it("Shoud transfer batch successfully", async function () {
      // arrange
      const tokenId1 = 1;
      const tokenId2 = 2;
      const amount1 = 5;
      const amount2 = 5;
      const ids = [tokenId1, tokenId2];
      const amounts = [amount1, amount2];
      const uri = "https://example.com/";

      await tokenContract.mint(owner.address, amount1, uri);
      await tokenContract.mint(owner.address, amount2, uri);

      // act
      await tokenContract.safeBatchTransferFrom(await owner.getAddress(), await addr1.getAddress(), ids, amounts, []);
      // assert
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId1)).to.be.equal(amount1);
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId2)).to.be.equal(amount2);
    });
  });

  describe("setApprovalForAll", function () {
    it("Shoud allow successfully", async function () {
      const tokenId = 1;
      const amount = 10;
      const uri = "https://example.com/";
      await tokenContract.mint(owner.address, amount, uri);

      await tokenContract.connect(owner).setApprovalForAll(await addr1.getAddress(), true);
      await expect(await tokenContract.connect(addr1).safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []))
        .to.emit(tokenContract, "TransferSingle");
    });
  });
});