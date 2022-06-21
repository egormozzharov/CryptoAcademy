pragma solidity >=0.5.0;

interface IStaking {
    function getBalance(address _address) external returns (uint);
}