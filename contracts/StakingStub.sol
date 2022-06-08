// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StakingStub {
    uint256 public rewardPercentage;
    address public owner;
    address public editor;

    modifier onlyOwner {
        require(msg.sender == owner, "Only chairperson can call this function");
        _;
    }

    modifier onlyEditorOrOwner() {
        require(msg.sender == editor || msg.sender == owner, "Only editor can call this function");
        _;
    }

    constructor(uint _rewardPercentage) {
        owner = msg.sender;
        rewardPercentage = _rewardPercentage;
    }

    function setRewardPersentage(uint256 amount) external onlyEditorOrOwner {
        rewardPercentage = amount;
    }

    function setEditor(address _editor) external onlyOwner {
        editor = _editor;
    }
}
