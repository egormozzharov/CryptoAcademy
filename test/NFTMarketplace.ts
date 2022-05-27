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
    marketplaceContract = (await contractFactoryForNftMarketplace
      .deploy(erc721Contract.address, erc1150Contract.address, erc20Contract.address, 3600)) as NftMarketplace;
    await marketplaceContract.deployed();
  });

  describe("createItemForERC721", function () {
    it("Shoud transfer successfully", async function () {
      const tokenId = 1;
      await erc721Contract.connect(owner).setMinter(marketplaceContract.address);

      await expect(await marketplaceContract.connect(owner).createItemForERC721(addr1.address, "tokenUrlString"))
        .to.emit(marketplaceContract, "ERC721ItemCreated").withArgs(erc721Contract.address, addr1.address, tokenId);
      await expect(await erc721Contract.balanceOf(addr1.address)).to.be.equal(1);
    });
  });

  describe("createItemForERC1155", function () {
    it("Shoud transfer successfully", async function () {
      const tokenId = 1;
      const amount = 10;
      await erc1150Contract.connect(owner).setMinter(marketplaceContract.address);

      await expect(await marketplaceContract.connect(owner).createItemForERC1155(addr1.address, tokenId, amount, []))
        .to.emit(marketplaceContract, "ERC1155ItemCreated").withArgs(erc1150Contract.address, addr1.address, tokenId, amount);
      await expect(await erc1150Contract.balanceOf(addr1.address, tokenId)).to.be.equal(amount);
    });
  });

  describe("listItemERC721", function () {
    it("Shoud list item successfully", async function () {
      const tokenOwner = addr1;
      const tokenId = 1;
      const price = 1;
      const listingId = 1;
      const amount = 1;
      await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
      await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
      await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);

      await expect(await marketplaceContract.connect(tokenOwner).listItemERC721(tokenId, price))
        .to.emit(marketplaceContract, "ItemListed").withArgs(listingId, erc721Contract.address, tokenOwner.address, tokenId, price, amount);
      const listing: NftMarketplace.ListingStruct = await marketplaceContract.getListing(listingId);
      expect(listing.hasValue).to.equal(true);

      await expect(await marketplaceContract.connect(tokenOwner).cancelListing(listingId))
        .to.emit(marketplaceContract, "ItemCanceled").withArgs(listingId, erc721Contract.address, tokenOwner.address, tokenId);
      const listingAfterCansel: NftMarketplace.ListingStruct = await marketplaceContract.getListing(listingId);
      expect(listingAfterCansel.hasValue).to.equal(false);
    });
  });

  describe("listItemERC1155", function () {
    it("Shoud list item successfully", async function () {
      const tokenOwner = addr1;
      const tokenId = 1;
      const price = 1;
      const listingId = 1;
      const amount = 10;
      await erc1150Contract.connect(owner).setMinter(marketplaceContract.address);
      await marketplaceContract.connect(owner).createItemForERC1155(tokenOwner.address, tokenId, amount, []);
      await erc1150Contract.connect(tokenOwner).setApprovalForAll(marketplaceContract.address, true);

      await expect(await marketplaceContract.connect(tokenOwner).listItemERC1155(tokenId, amount, price))
        .to.emit(marketplaceContract, "ItemListed").withArgs(listingId, erc1150Contract.address, tokenOwner.address, tokenId, price, amount);
      const listing: NftMarketplace.ListingStruct = await marketplaceContract.getListing(listingId);
      expect(listing.hasValue).to.equal(true);

      await expect(await marketplaceContract.connect(tokenOwner).cancelListing(listingId))
        .to.emit(marketplaceContract, "ItemCanceled").withArgs(listingId, erc1150Contract.address, tokenOwner.address, tokenId);
      const listingAfterCansel: NftMarketplace.ListingStruct = await marketplaceContract.getListing(listingId);
      expect(listingAfterCansel.hasValue).to.equal(false);
    });
  });

  describe("buyItem", function () {
    it("Shoud buy erc720item successfully", async function () {
      // arrange
      const listingId = 1;
      const tokenOwner = addr1;
      const buyer = addr2;
      const tokenId = 1;
      const price = 1;
      await erc721Contract.connect(owner).setMinter(marketplaceContract.address);
      await marketplaceContract.connect(owner).createItemForERC721(tokenOwner.address, "tokenUrlString");
      await erc721Contract.connect(tokenOwner).approve(marketplaceContract.address, tokenId);
      await marketplaceContract.connect(tokenOwner).listItemERC721(tokenId, price);
      await erc20Contract.mint(buyer.address, price);
      await erc20Contract.connect(buyer).approve(marketplaceContract.address, price);

      await expect(await marketplaceContract.connect(buyer).buyItem(listingId, price))
        .to.emit(marketplaceContract, "ItemBought").withArgs(erc721Contract.address, buyer.address, tokenId, price);
      await expect(await erc20Contract.balanceOf(buyer.address)).to.eq(0);
      await expect(await erc20Contract.balanceOf(tokenOwner.address)).to.eq(price);
    });

    it("Shoud buy erc1155item successfully", async function () {
      // arrange
      const listingId = 1;
      const tokenOwner = addr1;
      const buyer = addr2;
      const tokenId = 1;
      const price = 1;
      const amount = 10;
      await erc1150Contract.connect(owner).setMinter(marketplaceContract.address);
      await marketplaceContract.connect(owner).createItemForERC1155(tokenOwner.address, tokenId, amount, []);
      await erc1150Contract.connect(tokenOwner).setApprovalForAll(marketplaceContract.address, true);
      await marketplaceContract.connect(tokenOwner).listItemERC1155(tokenId, amount, price);
      await erc20Contract.mint(buyer.address, price);
      await erc20Contract.connect(buyer).approve(marketplaceContract.address, price);

      await expect(await marketplaceContract.connect(buyer).buyItem(listingId, price))
        .to.emit(marketplaceContract, "ItemBought").withArgs(erc1150Contract.address, buyer.address, tokenId, price);
      await expect(await erc20Contract.balanceOf(buyer.address)).to.eq(0);
      await expect(await erc20Contract.balanceOf(tokenOwner.address)).to.eq(price);
    });
  });
});