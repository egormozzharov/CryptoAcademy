// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ACDMToken is ERC20 {
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(uint256 initialSupply) ERC20("ACDM", "ACDM") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address account, uint256 amount) external returns (bool){
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external returns (bool) {
        _burn(account, amount);
        return true;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}