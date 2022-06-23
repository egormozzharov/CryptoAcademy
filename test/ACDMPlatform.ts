import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ACDMToken } from '../typechain-types/contracts/ACDMToken';
import { blockTimestampTools } from '../scripts/tools';
import { ACDMPlatform } from '../typechain-types/contracts/ACDMPlatform';

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
      expect(await acdmPlatform.tradingWeiAmount()).to.be.equal(BigInt("1000000000000000000"));
      expect(await acdmPlatform.pricePerUnitInCurrentPeriod()).to.be.equal(100000000);
      expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(BigInt("10000000000"));
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
    it("Shoud start sale round in first time successfully", async function () {
      await expect(await acdmPlatform.startSaleRound())
        .to.emit(acdmPlatform, "SaleRoundStarted");
      expect(await acdmPlatform.tradingWeiAmount()).to.be.equal(BigInt("1000000000000000000"));
      expect(await acdmPlatform.pricePerUnitInCurrentPeriod()).to.be.equal(100000000);
      expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(BigInt("10000000000"));
      expect(await acdmPlatform.saleIsActive()).to.be.equal(true);
      expect(await acdmPlatform.tradingIsActive()).to.be.equal(false);
      expect(await acdmPlatform.isFirstRound()).to.be.equal(false);
    });

    it("Shoud start sale round in second time successfully", async function () {
      const amount = 1000;
      await acdmPlatform.startSaleRound();
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000001") });
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.startTradeRound();
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).addOrder(amount, 10000000000);
      await acdmPlatform.connect(addr1).buyOrder(0, {value: 10000000000000});
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.startSaleRound();

      // assert
      expect(await acdmPlatform.saleIsActive()).to.be.equal(true);
      expect(await acdmPlatform.tradingIsActive()).to.be.equal(false);
      expect(await acdmPlatform.isFirstRound()).to.be.equal(false);
      expect(await acdmPlatform.tradingWeiAmount()).to.be.equal(BigInt("10000000000000"));
      expect(await acdmPlatform.pricePerUnitInCurrentPeriod()).to.be.equal(4000103000000);
      expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(BigInt("2"));
    });
  });

  describe("buyACDM", function () {
    it("Shoud buy successfully", async function () {
      await acdmPlatform.startSaleRound();
      await expect(await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000001") }))
        .to.emit(acdmPlatform, "BuyACDM").withArgs(owner.address, 10000);
      await expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(9999990000);
    });

    it("Shoud buy successfully when referers are assigned", async function () {
      await acdmPlatform.register(owner.address, ethers.constants.AddressZero);
      await acdmPlatform.register(addr1.address, owner.address);
      await expect(acdmPlatform.register(addr2.address, addr1.address))

      await acdmPlatform.startSaleRound();
      await expect(await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000001") }))
        .to.emit(acdmPlatform, "BuyACDM").withArgs(owner.address, 10000);
      await expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(9999990000);
    });
  });

  describe("startTradeRound", function () {
    it("Shoud start trade round successfully", async function () {
      await acdmPlatform.startSaleRound();
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000001") });
      await blockTimestampTools.forwardTimestamp(roundInterval);

      await expect(await acdmPlatform.startTradeRound())
        .to.emit(acdmPlatform, "TradeRoundStarted");
      await expect(await acdmPlatform.saleIsActive()).to.be.equal(false);
      await expect(await acdmPlatform.tradingIsActive()).to.be.equal(true);
      await expect(await acdmPlatform.tradingWeiAmount()).to.be.equal(0);
    });
  });

  describe("addOrder", function () {
    it("Shoud add order successfully", async function () {
      const amount = 1;
      await acdmPlatform.startSaleRound();
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.startTradeRound();
      await acdmToken.approve(acdmPlatform.address, amount);
      await expect(await acdmPlatform.connect(owner).addOrder(amount, 10000000000))
        .to.emit(acdmPlatform, "OrderAdded").withArgs(amount, 10000000000, owner.address);
      await expect(await acdmToken.balanceOf(acdmPlatform.address)).to.be.equal(amount);
    });
  });

  describe("removeOrder", function () {
    it("Shoud remove order successfully", async function () {
      const amount = 1;
      await acdmPlatform.startSaleRound();
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.startTradeRound();
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).addOrder(amount, 10000000000);
      await expect(await acdmPlatform.connect(owner).removeOrder(0))
        .to.emit(acdmPlatform, "OrderRemoved").withArgs(0);
      await expect(await acdmToken.balanceOf(acdmPlatform.address)).to.be.equal(0);
    });
  });

  describe("buyOrder", function () {
    it("Shoud buy order successfully", async function () {
      const amount = 1;
      await acdmPlatform.startSaleRound();
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000001") });
      await acdmPlatform.startTradeRound();
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).addOrder(amount, 10000000000);
      await expect(await acdmPlatform.connect(addr1).buyOrder(0, {value: 10000000000}))
        .to.emit(acdmPlatform, "BuyOrder").withArgs(addr1.address, amount);
      await expect(await acdmToken.balanceOf(addr1.address)).to.be.equal(amount);
    });
  });

  describe("Setters", function () {
    it("Shoud set setRewardFractionForSaleRef1 successfully", async function () {
        const value = 50;
        await acdmPlatform.setRewardFractionForSaleRef1(value);
        await expect(await acdmPlatform.rewardFractionForSaleRef1()).to.be.equal(value);
    });

    it("Shoud revert if setRewardFractionForSaleRef1 value is invalid", async function () {
      const value = 1050;
      await expect(acdmPlatform.setRewardFractionForSaleRef1(value))
        .to.be.revertedWith("Reward fraction should be less than 1000");
    });

    it("Shoud set setRewardFractionForSaleRef2 successfully", async function () {
      const value = 50;
      await acdmPlatform.setRewardFractionForSaleRef2(value);
      await expect(await acdmPlatform.rewardFractionForSaleRef2()).to.be.equal(value);
    });

    it("Shoud revert if setRewardFractionForSaleRef2 value is invalid", async function () {
      const value = 1050;
      await expect(acdmPlatform.setRewardFractionForSaleRef2(value))
        .to.be.revertedWith("Reward fraction should be less than 1000");
    });

    it("Shoud set setRewardFractionForTradeRef1 successfully", async function () {
      const value = 50;
      await acdmPlatform.setRewardFractionForTradeRef1(value);
      await expect(await acdmPlatform.rewardFractionForTradeRef1()).to.be.equal(value);
    });

    it("Shoud revert if setRewardFractionForTradeRef1 value is invalid", async function () {
      const value = 1050;
      await expect(acdmPlatform.setRewardFractionForTradeRef1(value))
        .to.be.revertedWith("Reward fraction should be less than 1000");
    });

    it("Shoud set setRewardFractionForTradeRef2 successfully", async function () {
      const value = 50;
      await acdmPlatform.setRewardFractionForTradeRef2(value);
      await expect(await acdmPlatform.rewardFractionForTradeRef2()).to.be.equal(value);
    });

    it("Shoud revert if setRewardFractionForTradeRef2 value is invalid", async function () {
      const value = 1050;
      await expect(acdmPlatform.setRewardFractionForTradeRef2(value))
        .to.be.revertedWith("Reward fraction should be less than 1000");
    });
  });
});