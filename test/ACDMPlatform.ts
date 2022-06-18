import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ACDMToken } from '../typechain-types/contracts/ACDMToken';
import { ACDMPlatform } from '../typechain-types/contracts/ACDMPlatform.sol/ACDMPlatform';
import { blockTimestampTools } from '../scripts/tools';

describe("ACDMPlatform", function () {

  let acdmToken: ACDMToken;
  let acdmPlatform: ACDMPlatform;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let roundInterval = 3600;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const adcmTokenSypply = 1000 * 10^6;
    const acdmTokenContractFactory: ContractFactory = await ethers.getContractFactory("ACDMToken");
    acdmToken = (await acdmTokenContractFactory.connect(owner).deploy(adcmTokenSypply)) as ACDMToken;
    await acdmToken.deployed();

    const acdmPlatformContractFactory: ContractFactory = await ethers.getContractFactory("ACDMPlatform");
    acdmPlatform = (await acdmPlatformContractFactory.connect(owner).deploy(acdmToken.address, roundInterval)) as ACDMPlatform;
    await acdmToken.deployed();
  });

  describe("Initial values", function () {
    it("Initial price should be correct", async function () {
      expect(await acdmPlatform.pricePerUnitInCurrentPeriod()).to.be.equal(10000000);
      expect(await acdmPlatform.tradingWeiAmount()).equal(BigInt("1000000000000000000"));
      expect(await acdmPlatform.roundTime()).to.be.equal(roundInterval);
      expect(await acdmPlatform.acdmToken()).to.be.equal(acdmToken.address);
    });
  });

  describe("register", function () {
    it("Shoud register successfully", async function () {
      await acdmPlatform.register(owner.address, ethers.constants.AddressZero);
      await acdmPlatform.register(addr1.address, owner.address);
      await expect(acdmPlatform.register(addr2.address, addr1.address))
        .to.emit(acdmPlatform, "UserRegistered").withArgs(addr2.address, addr1.address);

      let referer1 = await acdmPlatform.usersWithReferers(addr2.address, 0);
      let referer2 = await acdmPlatform.usersWithReferers(addr2.address, 1);

      expect(referer1).to.equal(addr1.address);
      expect(referer2).to.equal(owner.address);
    });
  });

  describe("startSaleRound", function () {
    it("Shoud start sale round successfully", async function () {
      await expect(acdmPlatform.startSaleRound())
        .to.emit(acdmPlatform, "SaleRoundStarted");
    });

    // it("Shoud fail widthdraw if you have active deposits", async function () {
    //   await daoContract.connect(owner).addProposal("description", getExternalContractCallData(50), stakingContract.address);
    //   await daoContract.connect(owner).deposit(100);
    //   await daoContract.connect(owner).voteProposal(1, true);

    //   await expect(daoContract.connect(owner).widthdraw())
    //     .to.be.revertedWith("You can only widthdraw when all your deposits debating periods has passed");
    // });
  });
});