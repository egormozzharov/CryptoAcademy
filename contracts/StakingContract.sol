//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

contract StakingContract 
{
    address public immutable _lpTokenAddress;

    address public owner;

    bool internal locked;

    uint256 public timePeriod;
    uint256 public timePeriodInSeconds = 3600;

    mapping(address => uint256) public alreadyWithdrawn;
    mapping(address => uint256) public balances;
    uint256 public contractBalance;

    event TokensStaked(address from, uint256 amount);
    event TokensUnstaked(address to, uint256 amount);

    modifier noReentrant() {
        require(!locked, "No re-entrancy");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Message sender must be the contract's owner.");
        _;
    }

    constructor(address lpTokenAddress) {
        _lpTokenAddress = lpTokenAddress;
        owner = msg.sender;
        locked = false;
        timePeriod = block.timestamp + timePeriodInSeconds;
    }

    function stake(uint256 amount) public {
        require(IERC20(_lpTokenAddress).balanceOf(msg.sender) >= amount,"Sender balance is less than staking amount");
        require(IERC20(_lpTokenAddress).allowance(msg.sender, address(this)) >= amount, "Sender should give allowance for the lpToken to the current contract");
        IERC20(_lpTokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = balances[msg.sender] + amount;
        emit TokensStaked(msg.sender, amount);
    }

    function unstakeTokens(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient token balance, try lesser amount");
        if (block.timestamp >= timePeriod) {
            alreadyWithdrawn[msg.sender] = alreadyWithdrawn[msg.sender] + amount;
            balances[msg.sender] = balances[msg.sender] - amount;
            IERC20(_lpTokenAddress).transfer(msg.sender, amount);
            emit TokensUnstaked(msg.sender, amount);
        } else {
            revert("Tokens are only available after correct time period has elapsed");
        }
    }
}


