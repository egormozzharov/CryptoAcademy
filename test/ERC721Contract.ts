import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { MyNFT } from '../typechain-types/contracts/ERC721.sol/MyNFT';

describe("ERC721", function () {

  let tokenContract: MyNFT;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const TokenUri: string  = "ipfs://QmPs6cvQWX4j9yyLZXoZLaSSqCWgaPRK2YZ5nHUsSEAnnw";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const contractFactory: ContractFactory = await ethers.getContractFactory("MyNFT", owner);
    tokenContract = (await contractFactory.deploy()) as MyNFT;
    await tokenContract.deployed();
  });

  describe("name", function () {
    it("Shoud be able to get token name", async function () {
      await expect(await tokenContract.connect(owner).name()).to.be.equal("MyNFT");
    });
  });

  describe("symbol", function () {
    it("Shoud be able to get token name", async function () {
      await expect(await tokenContract.connect(owner).symbol()).to.be.equal("NFT");
    });
  });

  describe("mintNFT", function () {
    it("Shoud mintMyNFT successfully", async function () {
      // arrange
      await tokenContract.mintMyNFT(addr1.address, TokenUri);
      await tokenContract.mintMyNFT(addr1.address, TokenUri);

      // assert
      await expect(await tokenContract.owner()).to.be.equal(owner.address);
      await expect(await tokenContract.balanceOf(addr1.address)).to.be.equal(2);
      await expect(await tokenContract.balanceOf(owner.address)).to.be.equal(0);
      await expect(await tokenContract.ownerOf(1)).to.be.equal(addr1.address);
      await expect(await tokenContract.ownerOf(2)).to.be.equal(addr1.address);
    });

    it("Shoud transferFrom token owner successfully", async function () {
      // arrange
      await tokenContract.mintMyNFT(addr1.address, TokenUri);
      const tokenId = await tokenContract.tokenIds();
      // act
      await expect(await tokenContract.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId))
        .to.emit(tokenContract, "Transfer");
    });

    it("Shoud transferFrom successfully", async function () {
      // arrange
      await tokenContract.mintMyNFT(addr1.address, TokenUri);
      const tokenId = await tokenContract.tokenIds();

      // act
      await expect(await tokenContract.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId))
        .to.emit(tokenContract, "Transfer");

      await tokenContract.connect(addr2).setApprovalForAll(addr1.address, true);
      await expect(await tokenContract.connect(addr1).transferFrom(addr2.address, addr1.address, tokenId));
    });
  });
});

