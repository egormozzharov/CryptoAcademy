// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC1155Mintable.sol";

contract ERC1155Contract is ERC1155URIStorage, Ownable, IERC1155Mintable {
    uint256 public constant COPPER = 0;
    uint256 public constant CRYSTAL = 1;
    uint256 public constant ELDER_SWORD = 2;
    uint256 public constant KNIFE = 3;
    uint256 public constant WAND = 4;

    address private _minter;

    modifier onlyMinter {
        require(msg.sender == _minter, "Only minter can mint");
        _;
    }

    constructor() ERC1155("") {
        _mint(msg.sender, COPPER, 10**18, "");
        _mint(msg.sender, CRYSTAL, 10**27, "");
        _mint(msg.sender, ELDER_SWORD, 1, "");
        _mint(msg.sender, KNIFE, 10**9, "");
        _mint(msg.sender, WAND, 10**9, "");
    }

    function mint(address recipient, uint256 tokenId, uint256 amount, string calldata uri)
        public
        override
        onlyMinter
        returns (uint256)
    {
        _mint(recipient, tokenId, amount, "");
        _setURI(tokenId, uri);
        return tokenId;
    }

    function setMinter(address minter) 
        public 
        onlyOwner
    {
        _minter = minter;
    }

    function getMinter() 
        public 
        view
        returns (address)
    {
        return _minter;
    }
}