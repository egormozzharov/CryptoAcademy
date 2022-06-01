import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ERC20Basic } from '../typechain-types/ERC20Basic';
import { Bridge } from '../typechain-types/contracts/Bridge';

describe("Bridge", function () {
  const TO_NETWORK = 'TO_NETWORK';
  const FROM_NETWORK = 'FROM_NETWORK';

  let bridgeContract: Bridge;
  let erc20Contract: ERC20Basic;

  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const contractFactoryForERC20Basic: ContractFactory = await ethers.getContractFactory("ERC20Basic", owner);
    erc20Contract = (await contractFactoryForERC20Basic.deploy()) as ERC20Basic;
    await erc20Contract.deployed();

    const contractFactory: ContractFactory = await ethers.getContractFactory('Bridge', owner);
    bridgeContract = (await contractFactory.deploy(FROM_NETWORK)) as Bridge;
    await bridgeContract.deployed();
  });

  describe("swap", function () {
    it("Shoud swap successfully", async function () {
      const amount = 10;
      const toAddress = addr2;
      const fromAddress = owner;
      await bridgeContract.connect(fromAddress).swap(TO_NETWORK, toAddress.address, erc20Contract.address, amount)
      await expect(await bridgeContract.connect(fromAddress).swap(TO_NETWORK, toAddress.address, erc20Contract.address, amount))
        .to.emit(bridgeContract, 'SwapExecuted').withArgs(TO_NETWORK, toAddress.address, FROM_NETWORK, fromAddress.address, erc20Contract.address, amount);
    });
  });
});