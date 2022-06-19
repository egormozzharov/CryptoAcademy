// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract XXXToken is ERC20 {
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(uint256 initialSupply) ERC20("XXXToken", "XXX") {
        _mint(msg.sender, initialSupply);
    }
}