//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IERC20Mintable.sol";
import "./interfaces/IDAO.sol";

import "hardhat/console.sol";

contract StakingContract is ReentrancyGuard {
    uint256 public immutable _rewardIntervalInSeconds;
    address public immutable _stakingTokenAddress;
    address public immutable _rewardTokenAddress;
    address public owner;
    address public _daoContract;
    bytes32 public _merkleRoot;
    uint256 public _rewardPercentage;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public stakeTime;

    event TokensStaked(address from, uint256 amount);
    event TokensUnstaked(address to, uint256 amount);
    event RewardsClaimed(address to, uint256 amount);

    constructor(address tokenAddress, address rewardTokenAddress, uint rewardPercentage, uint256 rewardIntervalInSeconds) {
        owner = msg.sender;
        _stakingTokenAddress = tokenAddress;
        _rewardTokenAddress = rewardTokenAddress;
        _rewardPercentage = rewardPercentage;
        _rewardIntervalInSeconds = rewardIntervalInSeconds;
    }

    function setMerkleTreeRoot(bytes32 root) external {
        require(msg.sender == _daoContract || msg.sender == owner, "Only DAO Contract or owner is allowed to set MerkleTreeRoot");
        _merkleRoot = root;
    }

    function isInWhiteList(bytes32[] memory proof) public view returns(bool) {
        bytes32 _leaf = keccak256(abi.encodePacked(msg.sender));
        return MerkleProof.verify(proof, _merkleRoot, _leaf);
    }

    function balanceOf(address _address) external view returns (uint) {
        return balances[_address];
    }

    function setDao(address daoContract) external {
        _daoContract = daoContract;
    }

    function stake(uint256 amount, bytes32[] memory proof) external {
        require(isInWhiteList(proof), "You are not allowed to stake");
        require(balances[msg.sender] == 0, "You already have tokens staked");
        _claim();
        IERC20(_stakingTokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] = amount;
        emit TokensStaked(msg.sender, amount);
    }

    function claim() external {
        require(block.timestamp >= stakeTime[msg.sender] + _rewardIntervalInSeconds, "Tokens are only available after correct time period has elapsed");
        require(balances[msg.sender] > 0, "You balance should be greater than 0");
        _claim();
    }

    function unstake() external {
        require(block.timestamp >= lastVotingEndTime(msg.sender), "Tokens are only available after dao proposals intervals has elapsed");
        require(block.timestamp >= stakeTime[msg.sender] + _rewardIntervalInSeconds, "Tokens are only available after correct time period has elapsed");
        require(balances[msg.sender] > 0, "You balance should be greater than 0");
        _claim();
        uint deposited = balances[msg.sender];
        balances[msg.sender] = 0;
        IERC20(_stakingTokenAddress).transfer(msg.sender, deposited);
        emit TokensUnstaked(msg.sender, deposited);
    }

    function _claim() private {
        uint256 rewardMultiplier = (block.timestamp - stakeTime[msg.sender]) / _rewardIntervalInSeconds;
        uint256 reward = ((balances[msg.sender] * _rewardPercentage / 100) * rewardMultiplier);
        stakeTime[msg.sender]  += rewardMultiplier * _rewardIntervalInSeconds;
        IERC20Mintable(_rewardTokenAddress).mint(address(this), reward);
        IERC20(_rewardTokenAddress).transfer(msg.sender, reward);
        emit RewardsClaimed(msg.sender, reward);
    }

    function lastVotingEndTime(address _address) private nonReentrant() returns (uint) {
        require(_daoContract != address(0), "DAO Contract address should be set");
        return IDAO(_daoContract).lastVotingEndTime(_address);
    }
}