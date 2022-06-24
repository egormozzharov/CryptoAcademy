import { ethers } from "hardhat";

export module blockTimestampTools {
  export const getBlockTimestamp = async (blockNumber: number): Promise<number> => {
    const block = await ethers.provider.getBlock(blockNumber);
    return block.timestamp;
  };

  export const forwardTimestamp = async (timestampInSecondsDelta: number) => {
    return await ethers.provider.send("evm_mine", [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + timestampInSecondsDelta]);
  };

  export const getCurrentBlockTimestamp = async () => {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
  }
}
