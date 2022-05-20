//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IMintable.sol";

contract StakingContract 
{
    address public owner;
    address public _stakingTokenAddress;
    address public _rewardTokenAddress;
    uint256 public _rewardIntervalInSeconds;
    uint256 public _rewardPercentage;
    bool public _isInitialized;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public stakeTime;

    event TokensStaked(address from, uint256 amount);
    event TokensUnstaked(address to, uint256 amount);
    event RewardsClaimed(address to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier initialized {
        require(_isInitialized == true, "Contract should be initialized first");
        _;
    }

    function init(address tokenAddress, address rewardTokenAddress, uint rewardPercentage, uint256 rewardIntervalInSeconds) public {
        _stakingTokenAddress = tokenAddress;
        _rewardTokenAddress = rewardTokenAddress;
        _rewardPercentage = rewardPercentage;
        _rewardIntervalInSeconds = rewardIntervalInSeconds;
        _isInitialized = true;
    }

    function stake(uint256 amount) initialized public {
        IERC20(_stakingTokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = amount;
        stakeTime[msg.sender] = block.timestamp;
        emit TokensStaked(msg.sender, amount);
    }

    function claim() initialized public {
        require(block.timestamp >= stakeTime[msg.sender] + _rewardIntervalInSeconds, "Tokens are only available after correct time period has elapsed");
        require(balances[msg.sender] > 0, "You balance should be greater than 0");
        uint256 rewardMultiplier = (block.timestamp - stakeTime[msg.sender])/ _rewardIntervalInSeconds;
        uint256 reward = ((balances[msg.sender] * _rewardPercentage / 100) * rewardMultiplier);
        stakeTime[msg.sender] = block.timestamp + _rewardIntervalInSeconds;
        IMintable(_rewardTokenAddress).mint(address(this), reward);
        IERC20(_rewardTokenAddress).transfer(msg.sender, reward);
        emit RewardsClaimed(msg.sender, reward);
    }

    function unstake() initialized public {
        require(block.timestamp >= stakeTime[msg.sender] + _rewardIntervalInSeconds, "Tokens are only available after correct time period has elapsed");
        require(balances[msg.sender] > 0, "You balance should be greater than 0");
        uint deposited = balances[msg.sender];
        balances[msg.sender] = 0;
        IERC20(_stakingTokenAddress).transfer(msg.sender, deposited);
        emit TokensUnstaked(msg.sender, deposited);
    }
}


