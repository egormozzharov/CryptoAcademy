// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";
import "./interfaces/IERC20.sol";

contract NftMarketplace is ReentrancyGuard {

    error PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
    error ItemNotForSale(address nftAddress, uint256 tokenId);
    error NotListed(address nftAddress, uint256 tokenId);
    error AlreadyListed(address nftAddress, uint256 tokenId);
    error NotOwner();
    error NotApprovedForMarketplace();
    error PriceMustBeAboveZero();

    event ERC721ItemCreated(address indexed nftAddress, address ownerAddress, uint256 indexed tokenId);
    event ERC1155ItemCreated(address indexed nftAddress, address ownerAddress, uint256 indexed tokenId, uint256 indexed amount);
    event ItemListed(address indexed nftAddress, address indexed seller, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed nftAddress, address indexed seller, uint256 indexed tokenId);
    event ItemBought(address indexed nftAddress, address indexed buyer, uint256 indexed tokenId, uint256 price);

    struct Listing {
        uint256 price;
        address seller;
    }

    modifier notListed(address nftAddress, uint256 tokenId, address owner)
    {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(address nftAddress, uint256 tokenId, address spender) 
    {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NotOwner();
        }
        _;
    }

    mapping(address => mapping(uint256 => Listing)) private s_listings;

    address private _erc721Address;
    address private _erc1155Address;
    address private _paymentTokenAddress;

    constructor(address erc721Address, address erc1155Address, address paymentTokenAddress) {
        _erc721Address = erc721Address;
        _erc1155Address = erc1155Address;
        _paymentTokenAddress = paymentTokenAddress;
    }

    function createItemForERC721(address recipient, string calldata tokenUrl) 
        external
    {
        uint256 tokenId = IERC721Mintable(_erc721Address).mint(recipient, tokenUrl);
        emit ERC721ItemCreated(_erc721Address, recipient, tokenId);
    }

    function createItemForERC1155(address recipient, uint256 tokenId, uint256 amount, bytes memory data)
        external
    {
        IERC1155Mintable(_erc1155Address).mint(recipient, tokenId, amount, data);
        emit ERC1155ItemCreated(_erc1155Address, recipient, tokenId, amount);
    }

    function listItem(address nftAddress, uint256 tokenId, uint256 price)
        external
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(nftAddress, msg.sender, tokenId, price);
    }


    function buyItem(address nftAddress, uint256 tokenId, uint256 price)
        external
        payable
        isListed(nftAddress, tokenId)
        nonReentrant
    {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (price < listedItem.price) {
            revert PriceNotMet(nftAddress, tokenId, listedItem.price);
        }

        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        IERC20(_paymentTokenAddress).transferFrom(msg.sender, listedItem.seller, listedItem.price);
        emit ItemBought(nftAddress, msg.sender, tokenId, listedItem.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(nftAddress, msg.sender, tokenId);
    }

    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftAddress][tokenId];
    }
}