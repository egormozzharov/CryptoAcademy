pragma solidity >=0.5.0;

interface IDAO {
    function lastVotingEndTime(address _address) external returns (uint);
}