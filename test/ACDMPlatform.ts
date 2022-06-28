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
      expect(await acdmPlatform.pricePerUnitInCurrentPeriod()).to.be.equal(100);
      expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(BigInt("100000"));
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

      let referer1 = await acdmPlatform.userReferer(addr2.address);
      let referer2 = await acdmPlatform.userReferer(referer1);

      expect(referer1).to.equal(addr1.address);
      expect(referer2).to.equal(owner.address);
    });
  });

  describe("buyACDM", function () {
    it("Shoud revert if sale is not active", async function () {
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.00000000001") });
      await expect(acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.00000000001") }))
        .to.revertedWith("Sale should be active");
    });

    it("Shoud revert if order amount is greater that amount in current period", async function () {
      await expect(acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("2") }))
        .to.revertedWith("Order amount must be greater or equal to the sender amount");
    });

    it("Shoud buy successfully", async function () {
      await expect(await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000000000001") }))
        .to.emit(acdmPlatform, "ACDMBought").withArgs(owner.address, 10000);
      await expect(await acdmPlatform.amountInCurrentPeriod()).to.be.equal(90000);
      expect(await ethers.provider.getBalance(acdmPlatform.address)).to.be.equal(1000000);
    });

    it("Shoud buy successfully when 1 level of referers are assigned", async function () {
      let address = addr2;
      await acdmPlatform.connect(address).register(addr1.address, ethers.constants.AddressZero);
      await acdmPlatform.connect(address).register(addr2.address, addr1.address);
      let addr1InitialBalance = await ethers.provider.getBalance(addr1.address);
      await acdmPlatform.connect(address).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      expect(await ethers.provider.getBalance(acdmPlatform.address)).to.be.equal(950000);
      let addr1CurrentBalance = await ethers.provider.getBalance(addr1.address);
      expect(addr1CurrentBalance.sub(addr1InitialBalance)).to.be.equal(50000);
    });

    it("Shoud buy successfully when 2 levels of referers are assigned", async function () {
      let address = addr2;
      await acdmPlatform.connect(address).register(owner.address, ethers.constants.AddressZero);
      await acdmPlatform.connect(address).register(addr1.address, owner.address);
      await acdmPlatform.connect(address).register(addr2.address, addr1.address);
      let addr1InitialBalance = await ethers.provider.getBalance(addr1.address);
      let ownerInitialBalance = await ethers.provider.getBalance(owner.address);
      await acdmPlatform.connect(address).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      expect(await ethers.provider.getBalance(acdmPlatform.address)).to.be.equal(920000);
      let addr1CurrentBalance = await ethers.provider.getBalance(addr1.address);
      let ownerCurrentBalance = await ethers.provider.getBalance(owner.address);
      expect(addr1CurrentBalance.sub(addr1InitialBalance)).to.be.equal(50000);
      expect(ownerCurrentBalance.sub(ownerInitialBalance)).to.be.equal(30000);
    });
  });

  describe("addOrder", function () {
    it("Shoud revert if trading is not active", async function () {
      await expect(acdmPlatform.connect(owner).addOrder(1, 1000000))
        .to.revertedWith("Trading should be active");
    });

    it("Shoud add order successfully", async function () {
      const amount = 1;
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      await expect(await acdmPlatform.connect(owner).addOrder(amount, 1000000))
        .to.emit(acdmPlatform, "OrderAdded").withArgs(amount, 1000000, owner.address);
      await expect(await acdmToken.balanceOf(acdmPlatform.address)).to.be.equal(amount);
    });
  });

  describe("removeOrder", function () {
    it("Shoud remove order successfully", async function () {
      const amount = 1;
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      await acdmPlatform.connect(owner).addOrder(amount, 10000000000);
      await expect(await acdmPlatform.connect(owner).removeOrder(0))
        .to.emit(acdmPlatform, "OrderRemoved").withArgs(0);
      await expect(await acdmToken.balanceOf(acdmPlatform.address)).to.be.equal(0);
    });
  });

  describe("buyOrder", function () {
    it("Shoud revert if trading is not active", async function () {
      await expect(acdmPlatform.connect(owner).buyOrder(1, {value: 1000000}))
        .to.revertedWith("Trading should be active");
    });

    it("Shoud buy full order successfully", async function () {
      await acdmPlatform.register(owner.address, ethers.constants.AddressZero);
      await acdmPlatform.register(addr1.address, owner.address);
      await acdmPlatform.register(addr2.address, addr1.address);

      const amount = 1;
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).addOrder(amount, 1000000);

      await expect(await acdmPlatform.connect(addr2).buyOrder(0, {value: 1000000}))
        .to.emit(acdmPlatform, "OrderBought").withArgs(addr2.address, amount);
      await expect(await acdmToken.balanceOf(addr2.address)).to.be.equal(amount);
    });

    it("Shoud buy part of the order successfully", async function () {
      const amount = 2;
      await blockTimestampTools.forwardTimestamp(roundInterval);
      await acdmPlatform.connect(owner).buyACDM({ value: ethers.utils.parseEther("0.000000000001") });
      await acdmToken.approve(acdmPlatform.address, amount);
      await acdmPlatform.connect(owner).addOrder(amount, 10000000000);
      await acdmPlatform.connect(addr2).buyOrder(0, {value: 10000000000})

      await expect(await acdmToken.balanceOf(addr2.address)).to.be.equal(1);
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