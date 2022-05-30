// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";
import "./interfaces/IERC20.sol";

contract NftMarketplace is ERC1155Holder, ERC721Holder {
    struct Listing {
        uint listingId;
        address contractAddress;
        uint tokenId;
        uint price;
        address seller;
        uint amount;
        bool hasValue;
    }

    struct Auction {
        uint auctionId;
        address contractAddress;
        uint tokenId;
        address seller;
        uint amountOfTokens;
        uint startTime;
        uint startPrice;
        address lastBidder;
        uint amountOfBids;
        bool isFinished;
        bool hasValue;
    }

    IERC721 private immutable _erc721Contract;
    IERC1155 private immutable _erc1155Contract;
    IERC20 private immutable _erc20Contract;

    uint private _auctionIdCounter;
    uint private _listingIdCounter;
    address private immutable _erc721Address;
    address private immutable _erc1155Address;
    address private immutable _paymentTokenAddress;
    uint private immutable _auctionDurationTime;

    mapping(uint => Listing) public listings;
    mapping(uint => Auction) public auctions;

    event ERC721ItemCreated(address indexed contractAddress, address ownerAddress, uint indexed tokenId, string url);
    event ERC1155ItemCreated(address indexed contractAddress, address ownerAddress, uint indexed tokenId, uint amount, string url);
    event ItemListed(uint listingId, address indexed contractAddress, address seller, uint indexed tokenId, uint price, uint amount);
    event ItemCanceled(uint listingId, address indexed contractAddress, address seller, uint indexed tokenId);
    event ItemBought(address indexed contractAddress, address buyer, uint indexed tokenId, uint price);
    event ItemListedOnAuction(address indexed contractAddress, uint auctionId, uint indexed tokenId, uint amountOfTokens, uint startPrice);
    event AuctionFinished(uint auctionId);

    error NotListed(address contractAddress, uint tokenId);
    error AlreadyListed(address contractAddress, uint tokenId);
    error NotOwner();
    error PriceMustBeAboveZero();
    error AuctionIsFinished(uint auctionId);
    error AuctionIsNotExists(uint auctionId);
    error AuctionDurationIsNotOverYet(uint auctionId);
    error YourBidPriceIsLessThanCurrentBidPrice(uint auctionId);

    modifier isListingOwner(uint listingId)
    {
        Listing storage listing = listings[listingId];
        if (listing.seller != msg.sender) revert NotOwner();
        _;
    }

    constructor(address erc721Address, address erc1155Address, address paymentTokenAddress, uint auctionDurationTime) {
        _erc721Address = erc721Address;
        _erc1155Address = erc1155Address;
        _paymentTokenAddress = paymentTokenAddress;
        _auctionDurationTime = auctionDurationTime;
        _erc1155Contract = IERC1155(erc1155Address);
        _erc721Contract = IERC721(erc721Address);
        _erc20Contract = IERC20(paymentTokenAddress);
    }

    function createItem(address recipient, string calldata tokenUrl) 
        external
    {
        uint tokenId = IERC721Mintable(_erc721Address).mint(recipient, tokenUrl);
        emit ERC721ItemCreated(_erc721Address, recipient, tokenId, tokenUrl);
    }

    function createItem(address recipient, uint amount, string calldata url)
        external
    {
        uint tokenId = IERC1155Mintable(_erc1155Address).mint(recipient, amount, url);
        emit ERC1155ItemCreated(_erc1155Address, recipient, tokenId, amount, url);
    }

    function listItem(uint tokenId, uint price)
        external
        returns (uint)
    {
        if (price <= 0) revert PriceMustBeAboveZero();
        _listingIdCounter++;
        listings[_listingIdCounter] = Listing({
            listingId: _listingIdCounter,
            contractAddress: _erc721Address,
            tokenId: tokenId,
            price: price,
            seller: msg.sender,
            amount: 1,
            hasValue: true
        });
        _erc721Contract.transferFrom(msg.sender, address(this), tokenId);
        emit ItemListed(_listingIdCounter, _erc721Address, msg.sender, tokenId, price, 1);
        return _listingIdCounter;
    }

    function listItem(uint tokenId, uint amount, uint price)
        external
        returns (uint)
    {
        if (price <= 0) revert PriceMustBeAboveZero();
        _listingIdCounter++;
        listings[_listingIdCounter] = Listing({
            listingId: _listingIdCounter,
            contractAddress: _erc1155Address,
            tokenId: tokenId,
            price: price,
            seller: msg.sender,
            amount: amount,
            hasValue: true
        });
        _erc1155Contract.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        emit ItemListed(_listingIdCounter, _erc1155Address, msg.sender, tokenId, price, amount);
        return _listingIdCounter;
    }

    function buyItem(uint listingId)
        external
    {
        Listing storage listing = listings[listingId];
        if (!listing.hasValue) revert NotListed(listing.contractAddress, listing.tokenId);
        _erc20Contract.transferFrom(msg.sender, listing.seller, listing.price);
        if (listing.contractAddress == _erc721Address) {
            _erc721Contract.safeTransferFrom(address(this), msg.sender, listing.tokenId);
            emit ItemBought(_erc721Address, msg.sender, listing.tokenId, listing.price);
        } else {
            _erc1155Contract.safeTransferFrom(address(this), msg.sender, listing.tokenId, listing.amount, "");
            emit ItemBought(_erc1155Address, msg.sender, listing.tokenId, listing.price);
        }
        delete (listings[listingId]);
    }

    function cancelListing(uint listingId)
        external isListingOwner(listingId)
    {
        Listing storage listing = listings[listingId];
        if (!listing.hasValue) revert NotListed(listing.contractAddress, listing.tokenId);
        emit ItemCanceled(listingId, listing.contractAddress, msg.sender, listing.tokenId);
        delete (listings[listingId]);
    }

    function listItemOnAuction(uint tokenId, uint startPrice)
        external
        returns (uint)
    {
        IERC721(_erc721Address).transferFrom(msg.sender, address(this), tokenId);
        Auction memory auction = Auction({
            auctionId: _auctionIdCounter++,
            contractAddress: _erc721Address,
            tokenId: tokenId,
            seller: msg.sender,
            amountOfTokens: 1,
            startTime: block.timestamp,
            startPrice: startPrice,
            lastBidder: address(0),
            amountOfBids: 0,
            isFinished: false,
            hasValue: true
        });
        auctions[_auctionIdCounter] = auction;
        emit ItemListedOnAuction(_erc721Address, _auctionIdCounter, tokenId, 1, startPrice);
        return _auctionIdCounter;
    }

    function listItemOnAuction(uint tokenId, uint amountOfTokens, uint startPrice)
        external
        returns (uint)
    {
        IERC1155(_erc1155Address).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amountOfTokens,
            ""
        );
        Auction memory auction = Auction({
            auctionId: _auctionIdCounter++,
            contractAddress: _erc1155Address,
            tokenId: tokenId,
            seller: msg.sender,
            amountOfTokens: amountOfTokens, 
            startTime: block.timestamp,
            startPrice: startPrice,
            lastBidder: address(0),
            amountOfBids: 0,
            isFinished: false,
            hasValue: true
        });
        auctions[_auctionIdCounter] = auction;
        emit ItemListedOnAuction(_erc1155Address, _auctionIdCounter, tokenId, amountOfTokens, startPrice);
        return _auctionIdCounter;
    }

    function makeBid(uint auctionId, uint newPrice)
        external
    {
        Auction storage auction = auctions[auctionId];
        if (!auction.hasValue) revert AuctionIsNotExists(auctionId);
        if (auction.isFinished) revert AuctionIsFinished(auctionId);
        if (auction.startPrice > newPrice) revert YourBidPriceIsLessThanCurrentBidPrice(auctionId);
        if (auction.amountOfBids > 0) _erc20Contract.transfer(auction.lastBidder, auction.startPrice);
        auction.startPrice = newPrice;
        auction.amountOfBids += 1;
        auction.lastBidder = msg.sender;
        _erc20Contract.transferFrom(msg.sender, address(this), newPrice);
    }

    function finishAuction(uint auctionId)
        external
    {
        Auction storage auction = auctions[auctionId];
        if (block.timestamp < auction.startTime + _auctionDurationTime) revert AuctionDurationIsNotOverYet(auctionId);
        if (!auction.hasValue) revert AuctionIsNotExists(auctionId);
        if (auction.isFinished) revert AuctionIsFinished(auctionId);
        if (auctionConditionsAreMet(auctionId))
        {
            if (auction.contractAddress == _erc721Address)
            {
                _erc721Contract.safeTransferFrom(address(this), auction.lastBidder, auction.tokenId);
            }
            else
            {
                _erc1155Contract.safeTransferFrom(
                    address(this),
                    auction.lastBidder,
                    auction.tokenId,
                    auction.amountOfTokens,
                    ""
                );
            }
            _erc20Contract.transfer(auction.seller, auction.startPrice);
        }
        else 
        {
            if (auction.contractAddress == _erc721Address) 
            {
                _erc721Contract.safeTransferFrom(address(this), auction.seller, auction.tokenId);
            }
            else 
            {
                _erc1155Contract.safeTransferFrom(address(this), auction.seller, auction.tokenId, auction.amountOfTokens, "");
            }
            _erc20Contract.transfer(auction.lastBidder, auction.startPrice);
        }
        auctions[auctionId].isFinished = true;
        emit AuctionFinished(auctionId);
    }

    function auctionConditionsAreMet(uint auctionId)
        private
        view
        returns (bool)
    {
        Auction storage auction = auctions[auctionId];
        return auction.amountOfBids >= 2;
    }
}