pragma solidity >=0.5.0;

interface IERC20Mintable {
    function mint(address account, uint256 amount) external returns (bool);
}