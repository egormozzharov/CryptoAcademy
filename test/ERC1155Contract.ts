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
  });

  describe("mintNFT", function () {
    it("Shoud transfer successfully", async function () {
      // arrange
      const tokenId = 2;
      const amount = 1;
      // act
      await tokenContract.safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []);
      // assert
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId)).to.be.equal(amount);
    });

    it("Shoud transfer batch successfully", async function () {
      // arrange
      const tokenId1 = 2;
      const tokenId2 = 3;
      const amount1 = 1;
      const amount2 = 2;
      const ids = [tokenId1, tokenId2];
      const amounts = [amount1, amount2];
      // act
      await tokenContract.safeBatchTransferFrom(await owner.getAddress(), await addr1.getAddress(), ids, amounts, []);
      // assert
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId1)).to.be.equal(amount1);
      await expect(await tokenContract.balanceOf(await addr1.getAddress(), tokenId2)).to.be.equal(amount2);
    });

    it("Shoud allow successfully", async function () {
      await tokenContract.connect(owner).setApprovalForAll(await addr1.getAddress(), true);
      await expect(await tokenContract.connect(addr1).safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), 2, 1, []))
        .to.emit(tokenContract, "TransferSingle");
    });
  });
});