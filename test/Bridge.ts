import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Bridge } from '../typechain-types/contracts/Bridge';
import { ERC20Basic } from '../typechain-types/contracts/ERC20Basic';

describe("Bridge", function () {
  const TO_NETWORK = 1;
  const FROM_NETWORK = 2;

  let bridgeContract: Bridge;
  let erc20Contract: ERC20Basic;

  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let validator: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, validator] = await ethers.getSigners();

    const contractFactoryForERC20Basic: ContractFactory = await ethers.getContractFactory("ERC20Basic", owner);
    erc20Contract = (await contractFactoryForERC20Basic.deploy()) as ERC20Basic;
    await erc20Contract.deployed();

    const contractFactory: ContractFactory = await ethers.getContractFactory('Bridge', owner);
    bridgeContract = (await contractFactory.deploy(validator.address)) as Bridge;
    await bridgeContract.deployed();
  });

  describe("swap", function () {
    it("Shoud swap successfully", async function () {
      const amount = 10;
      const toAddress = addr2;
      const fromAddress = owner;
      await expect(await bridgeContract.connect(fromAddress).swap(TO_NETWORK, toAddress.address, FROM_NETWORK, fromAddress.address, erc20Contract.address, amount))
        .to.emit(bridgeContract, 'Swaped').withArgs(TO_NETWORK, toAddress.address, FROM_NETWORK, fromAddress.address, erc20Contract.address, amount);
    });
  });

  describe("redeem", function () {
    it("Shoud redeem successfully", async function () {
      let toNetwork = (await ethers.provider.getNetwork()).chainId;
      let toAddress = addr2;
      let erc20Address = erc20Contract.address;
      let amount = 10;
      let nonce = 1;

      let encodedData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "address", "address", "uint256", "uint256"],
        [toNetwork, toAddress.address, erc20Address, amount, nonce]
      );
      let arrayfyedData = ethers.utils.arrayify(encodedData);
      let hash = ethers.utils.keccak256(arrayfyedData);
      let signature = await validator.signMessage(ethers.utils.arrayify(hash));

      await expect(await bridgeContract.connect(owner).redeem(signature, toNetwork, toAddress.address, erc20Contract.address, amount, nonce))
        .to.emit(bridgeContract, 'Redeemed').withArgs(signature, erc20Contract.address, amount, nonce);
    });

    it("Shoud fail if chainId mismatch", async function () {
      let toNetwork = 1;
      let toAddress = addr2;
      let erc20Address = erc20Contract.address;
      let amount = 10;
      let nonce = 1;

      let encodedData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "address", "address", "uint256", "uint256"],
        [toNetwork, toAddress.address, erc20Address, amount, nonce]
      );
      let arrayfyedData = ethers.utils.arrayify(encodedData);
      let hash = ethers.utils.keccak256(arrayfyedData);
      let signature = await validator.signMessage(ethers.utils.arrayify(hash));

      await expect(bridgeContract.connect(owner).redeem(signature, toNetwork, toAddress.address, erc20Contract.address, amount, nonce))
        .to.be.revertedWith("ChainId mismatch");
    });

    it("Shoud fail if signature was already used", async function () {
      let toNetwork = (await ethers.provider.getNetwork()).chainId;
      let toAddress = addr2;
      let erc20Address = erc20Contract.address;
      let amount = 10;
      let nonce = 1;

      let encodedData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "address", "address", "uint256", "uint256"],
        [toNetwork, toAddress.address, erc20Address, amount, nonce]
      );
      let arrayfyedData = ethers.utils.arrayify(encodedData);
      let hash = ethers.utils.keccak256(arrayfyedData);
      let signature = await validator.signMessage(ethers.utils.arrayify(hash));

      await bridgeContract.connect(owner).redeem(signature, toNetwork, toAddress.address, erc20Contract.address, amount, nonce);

      await expect(bridgeContract.connect(owner).redeem(signature, toNetwork, toAddress.address, erc20Contract.address, amount, nonce))
      .to.be.revertedWith("Signature was already used");
    });

    it("Shoud fail if signature is invalid", async function () {
      let toNetwork = (await ethers.provider.getNetwork()).chainId;
      let toAddress = addr2;
      let erc20Address = erc20Contract.address;
      let amount = 10;
      let nonce = 1;

      let encodedData = ethers.utils.defaultAbiCoder.encode(
        [],
        []
      );
      let arrayfyedData = ethers.utils.arrayify(encodedData);
      let hash = ethers.utils.keccak256(arrayfyedData);
      let signature = await validator.signMessage(ethers.utils.arrayify(hash));

      await expect(bridgeContract.connect(owner).redeem(signature, toNetwork, toAddress.address, erc20Contract.address, amount, nonce))
      .to.be.revertedWith("Signature is not valid");
    });
  });
});