//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

// http://batog.info/papers/scalable-reward-distribution.pdf
contract StakingContract 
{
    address public owner;
    address public _stakingTokenAddress;
    address public _rewardTokenAddress;
    uint256 public _timePeriodInSeconds;

    mapping(address => uint256) internal balances;
    mapping(address => uint256) internal timeToUnstake;
    mapping(address => uint256) internal initialDividentsMultipliers;
    uint256 internal currentDividentMultiplier;
    uint256 internal totalSupply;

    event TokensStaked(address from, uint256 amount);
    event TokensUnstaked(address to, uint256 amount, uint256 rewardAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Message sender must be the contract's owner.");
        _;
    }

    constructor(address tokenAddress, address rewardTokenAddress, uint256 timePeriod) {
        owner = msg.sender;
        _stakingTokenAddress = tokenAddress;
        _rewardTokenAddress = rewardTokenAddress;
        _timePeriodInSeconds = timePeriod;
    }

    function stake(uint256 amount) public {
        require(IERC20(_stakingTokenAddress).balanceOf(msg.sender) >= amount,"Sender balance is less than staking amount");
        require(IERC20(_stakingTokenAddress).allowance(msg.sender, address(this)) >= amount, "Sender should give allowance for the lpToken to the current contract");

        IERC20(_stakingTokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = amount;
        totalSupply += amount;
        timeToUnstake[msg.sender] = block.timestamp + _timePeriodInSeconds;
        initialDividentsMultipliers[msg.sender] = currentDividentMultiplier;
        emit TokensStaked(msg.sender, amount);
    }

    function distribute(uint256 dividentsAmount) onlyOwner public {
        require(IERC20(_rewardTokenAddress).balanceOf(address(this)) >= dividentsAmount, "Contract balance is less than reward amount");
        currentDividentMultiplier = currentDividentMultiplier + dividentsAmount / totalSupply;
    }

    function widthdraw() public {
        require(block.timestamp >= timeToUnstake[msg.sender], "Tokens are only available after correct time period has elapsed");
        require(balances[msg.sender] > 0, "Sender has no tokens to unstake");
        uint deposited = balances[msg.sender];
        uint reward = deposited * (currentDividentMultiplier - initialDividentsMultipliers[msg.sender]);
        totalSupply -= deposited;
        balances[msg.sender] = 0;
        IERC20(_stakingTokenAddress).transfer(msg.sender, deposited);
        IERC20(_rewardTokenAddress).transfer(msg.sender, reward);
        emit TokensUnstaked(msg.sender, deposited, reward);
    }
}


