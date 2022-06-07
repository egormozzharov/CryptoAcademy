import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DAO } from '../typechain-types/contracts/DAO';
import { ERC20Basic } from '../typechain-types/contracts/ERC20Basic';

describe("DAO", function () {

  let daoContract: DAO;
  let tokenContract: ERC20Basic;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const tokenContractFactory: ContractFactory = await ethers.getContractFactory("ERC20Basic");
    tokenContract = (await tokenContractFactory.connect(owner).deploy()) as ERC20Basic;
    await tokenContract.deployed();

    let chairPerson = owner.address;
    let voteToken = tokenContract.address;
    let minimumQuorum = 10;
    let debatingPeriod = 3600;
    const contractFactory: ContractFactory = await ethers.getContractFactory("DAO", owner);
    daoContract = (await contractFactory.connect(owner).deploy(chairPerson, voteToken, minimumQuorum, debatingPeriod)) as DAO;
    await daoContract.deployed();

    await tokenContract.connect(owner).approve(daoContract.address, 1000);
  });

  describe("deposit", function () {
    it("Shoud deposit successfully", async function () {
      await daoContract.connect(owner).deposit(100);
      const balance = await daoContract.deposits(owner.address);
      expect(balance).to.be.equal(100);
    });
  });

  describe("addProposal", function () {
    it("Shoud add proposal successfully", async function () {
      let description = "description";
      let callData = getExternalContractCallData();
      let recipient = addr1.address;
      await expect(await daoContract.connect(owner).addProposal(description, callData, recipient))
      .to.emit(daoContract, "ProposalAdded").withArgs(1, description, callData, recipient);
    });
  });

  function getExternalContractCallData() {
    let jsonAbi = [{ "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "setRewardPersentage", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    let iFace = new ethers.utils.Interface(jsonAbi);
    return iFace.encodeFunctionData('setRewardPersentage', [50]);
  }

  // describe("voteProposal", function () {
  //   it("Shoud vote proposal successfully", async function () {
  //     // arrange
  //     const tokenId = 1;
  //     const amount = 10;
  //     const uri = "https://example.com/";
  //     await daoContract.mint(owner.address, amount, uri);
  //     // act
  //     await daoContract.safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []);
  //     // assert
  //     await expect(await daoContract.balanceOf(await addr1.getAddress(), tokenId)).to.be.equal(amount);
  //   });
  // });

  // describe("finishProposal", function () {
  //   it("Shoud finish proposal successfully", async function () {
  //     // arrange
  //     const tokenId = 1;
  //     const amount = 10;
  //     const uri = "https://example.com/";
  //     await daoContract.mint(owner.address, amount, uri);
  //     // act
  //     await daoContract.safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []);
  //     // assert
  //     await expect(await daoContract.balanceOf(await addr1.getAddress(), tokenId)).to.be.equal(amount);
  //   });
  // });

  // describe("widthdraw", function () {
  //   it("Shoud widthdraw successfully", async function () {
  //     // arrange
  //     const tokenId = 1;
  //     const amount = 10;
  //     const uri = "https://example.com/";
  //     await daoContract.mint(owner.address, amount, uri);
  //     // act
  //     await daoContract.safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), tokenId, amount, []);
  //     // assert
  //     await expect(await daoContract.balanceOf(await addr1.getAddress(), tokenId)).to.be.equal(amount);
  //   });
  // });
});