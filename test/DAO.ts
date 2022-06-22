import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DAO } from '../typechain-types/contracts/DAO';
import { blockTimestampTools } from '../scripts/tools';
import { XXXToken } from '../typechain-types/contracts/XXXToken';
import { IUniswapV2Router02 } from '../typechain-types/contracts/interfaces/IUniswapV2Router02';
import { IUniswapV2Factory } from '../typechain-types/contracts/interfaces/IUniswapV2Factory';
import { IERC20 } from '../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20';
import { StakingContract } from '../typechain-types/contracts/StakingContract';
import { ACDMPlatform } from '../typechain-types/contracts/ACDMPlatform';
import { ACDMToken } from '../typechain-types/contracts/ACDMToken';

describe("DAO", function () {

  let daoContract: DAO;
  let stakingContract: StakingContract;
  let acdmPlatform: ACDMPlatform;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let lpToken: IERC20;
  let acdmToken: ACDMToken;

  const UniswapV2Router02Address: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const UniswapV2FactoryAddress: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  const ethAmount = ethers.BigNumber.from('1000000000');
  const customTokenAmount = ethers.BigNumber.from('10');
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  const deployContract = async (contractName: string, ...args: any[]): Promise<Contract> => {
    const contractFactory: ContractFactory = await ethers.getContractFactory(contractName, owner);
    let contract: Contract = await contractFactory.deploy(...args);
    return await contract.deployed();
  }

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Uniswap
    const customToken = (await deployContract("XXXToken", 10000 * 1000000)) as XXXToken;
    customToken.connect(owner).approve(UniswapV2Router02Address, 1000);

    const router: IUniswapV2Router02 = (await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address)) as IUniswapV2Router02;
    await router.addLiquidityETH(
      customToken.address,
      customTokenAmount,
      customTokenAmount,
      ethAmount,
      owner.address,
      deadline,
      { value: ethAmount }
    );

    const factory: IUniswapV2Factory = (await ethers.getContractAt("IUniswapV2Factory", UniswapV2FactoryAddress)) as IUniswapV2Factory;
    const lpTokenAddress = await factory.getPair(customToken.address, await router.WETH());
    lpToken = (await ethers.getContractAt("IERC20", lpTokenAddress)) as IERC20;
    const lpTokenBalance = await lpToken.connect(owner).balanceOf(owner.address);

    // Staking
    stakingContract = (await deployContract("StakingContract", lpTokenAddress, customToken.address, 20, 3600)) as StakingContract;
    await lpToken.connect(owner).approve(stakingContract.address, lpTokenBalance);
    await lpToken.connect(owner).transfer(addr1.address, 100);
    await lpToken.connect(addr1).approve(stakingContract.address, 100);

    // DAO
    let chairPerson = owner.address;
    let minimumQuorum = 10;
    let debatingPeriod = 3600;
    const contractFactory: ContractFactory = await ethers.getContractFactory("DAO", owner);
    daoContract = (await contractFactory.connect(owner).deploy(chairPerson, minimumQuorum, debatingPeriod)) as DAO;
    await daoContract.deployed();

    // ACDMPlatform
    const adcmTokenSypply = 1000 * 10^6;
    const acdmTokenContractFactory: ContractFactory = await ethers.getContractFactory("ACDMToken");
    acdmToken = (await acdmTokenContractFactory.connect(owner).deploy(adcmTokenSypply)) as ACDMToken;
    await acdmToken.deployed();

    let roundInterval = 3600;
    const acdmPlatformContractFactory: ContractFactory = await ethers.getContractFactory("ACDMPlatform");
    acdmPlatform = (await acdmPlatformContractFactory.connect(owner).deploy(acdmToken.address, roundInterval)) as ACDMPlatform;
    await acdmToken.deployed();

    // Common
    await stakingContract.setDao(daoContract.address);
    await daoContract.setStaking(stakingContract.address);
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
      await stakingContract.connect(owner).stake(100);

      await expect(daoContract.connect(owner).voteProposal(proposalId, true))
        .to.emit(daoContract, "ProposalVoted").withArgs(proposalId, true, owner.address, 100);
      await expect((await daoContract.proposals(1)).positiveVotes).to.be.equal(100);
    });

    it("Shoud vote proposal successfully with negative vote", async function () {
      let proposalId = 1;
      let description = "description";
      let callData = getExternalContractCallData(50);
      let recipient = acdmPlatform.address;
      await daoContract.connect(owner).addProposal(description, callData, recipient);
      await stakingContract.connect(owner).stake(100);

      await expect(daoContract.connect(owner).voteProposal(proposalId, false))
        .to.emit(daoContract, "ProposalVoted").withArgs(proposalId, false, owner.address, 100);
      await expect((await daoContract.proposals(1)).negativeVotes).to.be.equal(100);
    });

    it("Shoud fail if you have no deposit yet", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await expect(daoContract.connect(owner).voteProposal(1, true))
        .to.be.revertedWith("You must have a deposit to vote");
    });

    it("Shoud fail if you have already voted on this proposal", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await stakingContract.connect(owner).stake(100);
      await daoContract.connect(owner).voteProposal(1, true);
      await expect(daoContract.connect(owner).voteProposal(1, true))
        .to.be.revertedWith("You have already voted on this proposal");
    });

    it("Shoud fail if the proposal already finished", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await lpToken.connect(owner).transfer(addr1.address, 100);
      await stakingContract.connect(owner).stake(100);
      await stakingContract.connect(addr1).stake(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true);
      await acdmPlatform.connect(owner).setEditor(daoContract.address);
      await daoContract.connect(owner).finishProposal(1);

      await expect(daoContract.connect(addr1).voteProposal(1, true))
        .to.be.revertedWith("Proposal is already finished");
    });
  });

  describe("finishProposal", function () {
    it("Shoud finish proposal successfully", async function () {
      let proposalId = 1;
      let amount = 50;
      let callData = getExternalContractCallData(amount);
      await daoContract.connect(owner).addProposal("description", callData, acdmPlatform.address);
      await stakingContract.connect(owner).stake(100);
      await daoContract.connect(owner).voteProposal(proposalId, true);
      await blockTimestampTools.forwardTimestamp(3600);
      await acdmPlatform.connect(owner).setEditor(daoContract.address);

      await expect(await daoContract.finishProposal(proposalId))
        .to.emit(daoContract, "ProposalFinished").withArgs(proposalId)
        .and
        .to.emit(daoContract, "ProposalExecuted").withArgs(proposalId);
      
      expect(await acdmPlatform.rewardFractionForSaleRef1()).to.be.equal(amount);
    });

    it("Shoud fail if the proposal already finished", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await stakingContract.connect(owner).stake(100);
      await stakingContract.connect(addr1).stake(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true)
      await acdmPlatform.connect(owner).setEditor(daoContract.address);
      await daoContract.connect(owner).finishProposal(1);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Proposal is already finished");
    });

    it("Shoud fail if the dabating period has not ended yet", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await acdmPlatform.connect(owner).setEditor(daoContract.address);
      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Debating period has not yet ended");
    });

    it("Shoud fail if the quorum conditions are not met", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await blockTimestampTools.forwardTimestamp(3600);
      await acdmPlatform.connect(owner).setEditor(daoContract.address);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Quorum conditions are not met");
    });

    it("Shoud fail if the external contract call is reverted", async function () {
      await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), acdmPlatform.address);
      await stakingContract.connect(owner).stake(100);
      await stakingContract.connect(addr1).stake(100);
      await blockTimestampTools.forwardTimestamp(3600);
      await daoContract.connect(owner).voteProposal(1, true);

      await expect(daoContract.finishProposal(1))
        .to.be.revertedWith("Only editor can call this function");
    });
  });

  function getExternalContractCallData(amount: number) {
    let jsonAbi = [{ "constant": false, "inputs": [{ "name": "_rewardFraction", "type": "uint256" }], "name": "setRewardFractionForSaleRef1", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    let iFace = new ethers.utils.Interface(jsonAbi);
    return iFace.encodeFunctionData('setRewardFractionForSaleRef1', [amount]);
  }
});