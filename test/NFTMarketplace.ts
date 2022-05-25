import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC1155Contract } from '../typechain-types/contracts/ERC1155.sol/ERC1155Contract';
import { MyNFT } from "../typechain-types/contracts/ERC721.sol/MyNFT";
import { ERC20Basic } from '../typechain-types/ERC20Basic';
import { NftMarketplace } from '../typechain-types/contracts/NFTMarketplace.sol/NftMarketplace';

describe("NftMarketplace", function () {

  let erc20Contract: ERC20Basic;
  let erc721Contract: MyNFT;
  let erc1150Contract: ERC1155Contract;
  let marketplaceContract: NftMarketplace;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const contractFactoryForERC20Basic: ContractFactory = await ethers.getContractFactory("ERC20Basic", owner);
    erc20Contract = (await contractFactoryForERC20Basic.deploy()) as ERC20Basic;
    await erc20Contract.deployed();

    const contractFactoryForERC721: ContractFactory = await ethers.getContractFactory("MyNFT", owner);
    erc721Contract = (await contractFactoryForERC721.deploy()) as MyNFT;
    await erc721Contract.deployed();

    const contractFactoryForERC1155: ContractFactory = await ethers.getContractFactory("ERC1155Contract", owner);
    erc1150Contract = (await contractFactoryForERC1155.deploy()) as ERC1155Contract;
    await erc1150Contract.deployed();

    const contractFactoryForNftMarketplace: ContractFactory = await ethers.getContractFactory("NftMarketplace", owner);
    marketplaceContract = (await contractFactoryForNftMarketplace.deploy(erc721Contract.address, erc1150Contract.address)) as NftMarketplace;
    await marketplaceContract.deployed();
  });

  describe("createItemForERC721", function () {
    it("Shoud transfer successfully", async function () {
        await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
        await expect(await marketplaceContract.connect(owner).createItemForERC721(addr1.address, "tokenUrlString"))
    });
  });

  describe("listItem", function () {
    it("Shoud list item successfully", async function () {
        const tokenOwner = addr1;
        const tokenId = 1;
        const price = 1;
        await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
        await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
        await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);
        await expect(await marketplaceContract.connect(tokenOwner).listItem(erc721Contract.address, tokenId, price));
    });
  });

  describe("cancelListing", function () {
    it("Shoud cancel item successfully", async function () {
      const tokenOwner = addr1;
      const tokenId = 1;
      const price = 1;
      await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
      await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
      await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(tokenOwner).listItem(erc721Contract.address, tokenId, price);
      await expect(await marketplaceContract.connect(tokenOwner).cancelListing(erc721Contract.address, tokenId));
    });
  });

  describe("buyItem", function () {
    it("Shoud buy item successfully", async function () {
      // const tokenOwner = addr1;
      // const tokenId = 1;
      // const price = 1;
      // await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
      // await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
      // await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);
      // await marketplaceContract.connect(tokenOwner).listItem(erc721Contract.address, tokenId, price);
      // await expect(await marketplaceContract.connect(tokenOwner).cancelListing(erc721Contract.address, tokenId));
  });

  describe("withdrawProceeds", function () {
    it("Shoud withdraw successfully", async function () {
      // const tokenOwner = addr1;
      // const tokenId = 1;
      // const price = 1;
      // await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
      // await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
      // await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);
      // await marketplaceContract.connect(tokenOwner).listItem(erc721Contract.address, tokenId, price);
      // await expect(await marketplaceContract.connect(tokenOwner).cancelListing(erc721Contract.address, tokenId));
    });
});