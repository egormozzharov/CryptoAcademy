import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory, Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { StakingContract } from '../typechain-types/contracts/StakingContract';
import { IUniswapV2Router02 } from '../typechain-types/contracts/interfaces/IUniswapV2Router02';
import { IERC20 } from '../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20';
import { IUniswapV2Factory } from '../typechain-types/contracts/interfaces/IUniswapV2Factory';
import { blockTimestampTools } from "../scripts/tools";
import { XXXToken } from '../typechain-types/contracts/XXXToken';
import { DAO } from '../typechain-types/contracts/DAO';
import { ACDMPlatform } from '../typechain-types/contracts/ACDMPlatform';
import { ACDMToken } from '../typechain-types/contracts/ACDMToken';
import { MerkleTree } from "merkletreejs";

describe("StakingContract", function () {

  let daoContract: DAO;
  let stakingContract: StakingContract;
  let acdmPlatform: ACDMPlatform;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let lpToken: IERC20;
  let acdmToken: ACDMToken;
  let tree: MerkleTree;

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

    tree = getTree();
    await stakingContract.connect(owner).setMerkleTreeRoot(tree.getHexRoot());
   });

   describe("whitelist", async function () {
    it("Should return true if an address is in a whitelist", async function () {
      const proof: string[] = getProof(owner.address);
      let result = await stakingContract.connect(owner).isInWhiteList(proof);
      await expect(result).to.be.equal(true);
    });

    it("Should return false if an address is not in a whitelist", async function () {
      const proof: string[] = getProof(addr1.address);
      let result = await stakingContract.connect(owner).isInWhiteList(proof);
      await expect(result).to.be.equal(false);
    });
  });

  describe("stake", async function () {
    it("Should revert if already have a stake", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await expect(stakingContract.connect(owner).stake(100, proof)).to.be.revertedWith("You already have tokens staked");
    });

    it("Shoud stake succsesfully", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await expect(await stakingContract.connect(owner).stake(100, proof))
      .to.emit(stakingContract, "TokensStaked").withArgs(owner.address, 100);
      expect(await stakingContract.connect(owner).balances(owner.address)).to.eq(100);
    });
  });

  describe("unstake", function () {
    it("Shoud revert when DAO contract is not initialized", async function () {
      await expect(stakingContract.connect(owner).unstake()).to.be.revertedWith("DAO Contract address should be set");
    });

    it("Shoud revert when your balance equals zero", async function () {
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await expect(stakingContract.connect(owner).unstake()).to.be.revertedWith("You balance should be greater than 0");
    });

    it("Shoud revert when tokens are locked by an acrive DAO proposal", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await daoContract.connect(owner).addProposal("Description", getExternalContractCallData(50), acdmPlatform.address);
      await stakingContract.connect(owner).stake(100, proof);
      await daoContract.connect(owner).voteProposal(1, true);
      await expect(stakingContract.connect(owner).unstake()).to.be.revertedWith("Tokens are only available after dao proposals intervals has elapsed");
    });

    it("Shoud revert when timestamp is greater that reward time", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await expect(stakingContract.connect(owner).unstake()).to.be.revertedWith("Tokens are only available after correct time period has elapsed");
    });

    it("Shoud revert when your balance equals zero", async function () {
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await expect(stakingContract.connect(owner).unstake()).to.be.revertedWith("You balance should be greater than 0");
    });
    
    it("Shoud unstake succsesfully", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await blockTimestampTools.forwardTimestamp(3600);
      await expect(await stakingContract.connect(owner).unstake())
      .to.emit(stakingContract, "TokensUnstaked").withArgs(owner.address, 100);
      expect(await stakingContract.connect(owner).balances(owner.address)).to.eq(0);
    });
  });

  describe("claim", function () {
    it("Shoud revert if reward period has not elapsed", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await expect(stakingContract.connect(owner).claim()).to.be.revertedWith("Tokens are only available after correct time period has elapsed");
    });

    it("Shoud revert when your balance equals zero", async function () {
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await expect(stakingContract.connect(owner).claim()).to.be.revertedWith("You balance should be greater than 0");
    });

    it("Should claim successfully", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await blockTimestampTools.forwardTimestamp(4000);
      expect(await stakingContract.connect(owner).claim())
      .to.emit(stakingContract, "RewardsClaimed").withArgs(owner.address, 20);
    });

    it("Should claim successfully after multiple rewards periods", async function () {
      const proof: string[] = getProof(owner.address);
      await stakingContract.setDao(daoContract.address);
      await daoContract.setStaking(stakingContract.address);
      await stakingContract.connect(owner).stake(100, proof);
      await blockTimestampTools.forwardTimestamp(9000);
      expect(await stakingContract.connect(owner).claim())
      .to.emit(stakingContract, "RewardsClaimed").withArgs(owner.address, 40);
    });
  });

  function getExternalContractCallData(amount: number) {
    let jsonAbi = [{ "constant": false, "inputs": [{ "name": "_rewardFraction", "type": "uint256" }], "name": "setRewardFractionForSaleRef1", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }];
    let iFace = new ethers.utils.Interface(jsonAbi);
    return iFace.encodeFunctionData('setRewardFractionForSaleRef1', [amount]);
  }

  function getTree() {
    const leaves = ['0x518908A264BdAa5E0a48ac433f7AecD29BFd7eD6', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906'].map(x => ethers.utils.keccak256(x));
    const tree = new MerkleTree(leaves, ethers.utils.keccak256, {
      sortLeaves: true,
      sortPairs: true
    });
    return tree;
  }

  function getProof(addrToVerify: string) {
    const leaf = ethers.utils.keccak256(addrToVerify);
    const proof: string[] = tree.getHexProof(leaf);
    return proof;
  }
});