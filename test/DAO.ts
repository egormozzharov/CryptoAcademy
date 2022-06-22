import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DAO } from '../typechain-types/contracts/DAO';
import { StakingStub } from '../typechain-types/contracts/StakingStub';
import { blockTimestampTools } from '../scripts/tools';

describe("DAO", function () {

  let daoContract: DAO;
  let stakingContract: StakingStub;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const stakingContractFactory: ContractFactory = await ethers.getContractFactory("StakingStub");
    stakingContract = (await stakingContractFactory.connect(owner).deploy(10)) as StakingStub;
    await stakingContract.deployed();

    let chairPerson = owner.address;
    let minimumQuorum = 10;
    let debatingPeriod = 3600;
    const contractFactory: ContractFactory = await ethers.getContractFactory("DAO", owner);
    daoContract = (await contractFactory.connect(owner).deploy(chairPerson, minimumQuorum, debatingPeriod)) as DAO;
    await daoContract.deployed();
  });

  describe("addProposal", function () {
    it("Shoud add proposal successfully", async function () {
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = stakingContract.address;
      await expect(await daoContract.connect(owner).addProposal(description, callData, recipient))
        .to.emit(daoContract, "ProposalAdded").withArgs(1, description, callData, recipient);
    });

    it("Shoud fail if reciever is zero address", async function () {
      await expect(daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), ethers.constants.AddressZero))
        .to.be.revertedWith("Recipient cannot be the zero address");
    });
  });

  describe("voteProposal", function () {
    it("Shoud vote proposal successfully with positive vote", async function () {
      let proposalId = 1;
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = stakingContract.address;
      await daoContract.connect(owner).addProposal(description, callData, recipient)
      // await daoContract.connect(owner).deposit(100);

      await expect(daoContract.connect(owner).voteProposal(proposalId, true))
        .to.emit(daoContract, "ProposalVoted").withArgs(proposalId, true, owner.address, 100);
      await expect((await daoContract.proposals(1)).positiveVotes).to.be.equal(100);
    });

    it("Shoud vote proposal successfully with negative vote", async function () {
      let proposalId = 1;
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = stakingContract.address;
      await daoContract.connect(owner).addProposal(description, callData, recipient);
      // await daoContract.connect(owner).deposit(100);

      await expect(daoContract.connect(owner).voteProposal(proposalId, false))
        .to.emit(daoContract, "ProposalVoted").withArgs(proposalId, false, owner.address, 100);
      await expect((await daoContract.proposals(1)).negativeVotes).to.be.equal(100);
    });

    it("Shoud fail if you have no deposit yet", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      await expect(daoContract.connect(owner).voteProposal(1, true))
        .to.be.revertedWith("You must have a deposit to vote");
    });

    it("Shoud fail if you have already voted on this proposal", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      // await daoContract.connect(owner).deposit(100);
      await daoContract.connect(owner).voteProposal(1, true);
      await expect(daoContract.connect(owner).voteProposal(1, true))
        .to.be.revertedWith("You have already voted on this proposal");
    });

    it("Shoud fail if the proposal already finished", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      // await daoContract.connect(owner).deposit(100);
      // await daoContract.connect(addr1).deposit(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true);
      await stakingContract.connect(owner).setEditor(daoContract.address);
      await daoContract.connect(owner).finishProposal(1);

      await expect(daoContract.connect(addr1).voteProposal(1, true))
        .to.be.revertedWith("Proposal is already finished");
    });
  });

  describe("finishProposal", function () {
    it("Shoud finish proposal successfully", async function () {
      let proposalId = 1;
      let description = "description";
      let amount = 50;
      let callData = getExternalContractCallData(amount);
      let recipient = stakingContract.address;
      await daoContract.connect(owner).addProposal(description, callData, recipient);
      // await daoContract.connect(owner).deposit(100);
      await daoContract.connect(owner).voteProposal(proposalId, true);
      await blockTimestampTools.forwardTimestamp(3600);
      await stakingContract.connect(owner).setEditor(daoContract.address);

      await expect(await daoContract.finishProposal(proposalId))
        .to.emit(daoContract, "ProposalFinished").withArgs(proposalId)
        .and
        .to.emit(daoContract, "ProposalExecuted").withArgs(proposalId);
      
      expect(await stakingContract.rewardPercentage()).to.be.equal(amount);
    });

    it("Shoud fail if the proposal already finished", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      // await daoContract.connect(owner).deposit(100);
      // await daoContract.connect(addr1).deposit(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true)
      await stakingContract.connect(owner).setEditor(daoContract.address);
      await daoContract.connect(owner).finishProposal(1);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Proposal is already finished");
    });

    it("Shoud fail if the dabating period has not ended yet", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      await stakingContract.connect(owner).setEditor(daoContract.address);
      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Debating period has not yet ended");
    });

    it("Shoud fail if the quorum conditions are not met", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      await blockTimestampTools.forwardTimestamp(3600);
      await stakingContract.connect(owner).setEditor(daoContract.address);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Quorum conditions are not met");
    });

    it("Shoud fail if the external contract call is reverted", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
      // await daoContract.connect(owner).deposit(100);
      // await daoContract.connect(addr1).deposit(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Only editor can call this function");
    });
  });

  function getExternalContractCallData(amount: number) {
    let jsonAbi = [{ "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "setRewardPersentage", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    let iFace = new ethers.utils.Interface(jsonAbi);
    return iFace.encodeFunctionData('setRewardPersentage', [amount]);
  }
});