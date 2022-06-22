pragma solidity >=0.5.0;

interface IERC20Burnable {
    function burn(address account, uint256 amount) external returns (bool);
}