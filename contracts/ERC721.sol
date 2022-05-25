// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./interfaces/IERC721Mintable.sol";

contract MyNFT is ERC721URIStorage, Ownable, IERC721Mintable {
    using Counters for Counters.Counter;
    Counters.Counter public tokenIds;
    address private _minter;

    modifier onlyMinter {
        require(msg.sender == _minter, "Only minter can mint");
        _;
    }

    constructor() ERC721("MyNFT", "NFT") {}

    function mint(address recipient, string memory tokenURI)
        public
        override
        onlyMinter
        returns (uint256)
    {
        tokenIds.increment();

        uint256 newItemId = tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
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
