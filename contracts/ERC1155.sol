// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC1155Mintable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC1155Contract is ERC1155URIStorage, Ownable, IERC1155Mintable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;
    address public minter;

    modifier onlyMinter {
        require(msg.sender == minter, "Only minter can mint");
        _;
    }

    constructor() ERC1155("") {}

    function mint(address recipient, uint256 amount, string calldata uri)
        public
        override
        onlyMinter
        returns (uint256)
    {
        tokenIds.increment();
        uint256 newItemId = tokenIds.current();
        _mint(recipient, newItemId, amount, "");
        _setURI(newItemId, uri);
        return newItemId;
    }

    function setMinter(address minterAddress) 
        public 
        onlyOwner
    {
        minter = minterAddress;
    }
}