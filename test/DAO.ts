import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DAO } from '../typechain-types/contracts/DAO';
import { ERC20Basic } from '../typechain-types/contracts/ERC20Basic';
import { StakingStub } from '../typechain-types/contracts/StakingStub';
import { blockTimestampTools } from '../scripts/tools';

describe("DAO", function () {

  let daoContract: DAO;
  let tokenContract: ERC20Basic;
  let stakingContract: StakingStub;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const tokenContractFactory: ContractFactory = await ethers.getContractFactory("ERC20Basic");
    tokenContract = (await tokenContractFactory.connect(owner).deploy()) as ERC20Basic;
    await tokenContract.deployed();

    const stakingContractFactory: ContractFactory = await ethers.getContractFactory("StakingStub");
    stakingContract = (await stakingContractFactory.connect(owner).deploy(10)) as StakingStub;
    await tokenContract.deployed();

    let chairPerson = owner.address;
    let voteToken = tokenContract.address;
    let minimumQuorum = 10;
    let debatingPeriod = 3600;
    const contractFactory: ContractFactory = await ethers.getContractFactory("DAO", owner);
    daoContract = (await contractFactory.connect(owner).deploy(chairPerson, voteToken, minimumQuorum, debatingPeriod)) as DAO;
    await daoContract.deployed();

    await tokenContract.connect(owner).approve(daoContract.address, 1000);
    await stakingContract.connect(owner).setEditor(daoContract.address);
  });

  describe("deposit", function () {
    it("Shoud deposit successfully", async function () {
      await daoContract.connect(owner).deposit(100);
      const balance = await daoContract.deposits(owner.address);
      expect(balance).to.be.equal(100);
    });
  });

  describe("widthdraw", function () {
    it("Shoud widthdraw successfully", async function () {
      let initialBalance = await tokenContract.balanceOf(owner.address);
      await daoContract.connect(owner).deposit(100);
      await expect(await daoContract.connect(owner).widthdraw())
        .to.emit(daoContract, "Widthdrawn").withArgs(owner.address, 100);
      await expect(await tokenContract.balanceOf(owner.address)).to.be.equal(initialBalance);
    });
  });

  describe("addProposal", function () {
    it("Shoud add proposal successfully", async function () {
      let proposalId = 1;
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = stakingContract.address;
      await expect(await daoContract.connect(owner).addProposal(description, callData, recipient))
        .to.emit(daoContract, "ProposalAdded").withArgs(proposalId, description, callData, recipient);
    });
  });

  function getExternalContractCallData(amount: number) {
    let jsonAbi = [{ "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "setRewardPersentage", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    let iFace = new ethers.utils.Interface(jsonAbi);
    return iFace.encodeFunctionData('setRewardPersentage', [amount]);
  }

  describe("voteProposal", function () {
    it("Shoud vote proposal successfully", async function () {
      let proposalId = 1;
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = stakingContract.address;
      await daoContract.connect(owner).addProposal(description, callData, recipient)
      await daoContract.connect(owner).deposit(100);

      await expect(await daoContract.connect(owner).voteProposal(proposalId, true))
        .to.emit(daoContract, "ProposalVoted").withArgs(proposalId, true, owner.address, 100);
    });
  });

  describe("finishProposal", function () {
    it("Shoud finish proposal successfully", async function () {
      let proposalId = 1;
      let description = "description";
      let amount = 50;
      let callData = getExternalContractCallData(amount);
      let recipient = stakingContract.address;

      await daoContract.connect(owner).addProposal(description, callData, recipient)
      await daoContract.connect(owner).deposit(100);
      await daoContract.connect(owner).voteProposal(proposalId, true);
      await blockTimestampTools.forwardTimestamp(3600);
      await expect(await daoContract.finishProposal(proposalId))
        .to.emit(daoContract, "ProposalFinished").withArgs(proposalId);
      
      expect(await stakingContract.rewardPercentage()).to.be.equal(amount);
    });
  });
});