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
    error PriceNotMet(address contractAddress, uint tokenId, uint price);
    error NotListed(address contractAddress, uint tokenId);
    error AlreadyListed(address contractAddress, uint tokenId);
    error NotOwner();
    error NotApprovedForMarketplace();
    error PriceMustBeAboveZero();
    error AuctionIsFinished(uint auctionId);
    error AuctionIsNotExists(uint auctionId);
    error YourBidPriceIsLessThanCurrentBidPrice(uint auctionId);

    event ERC721ItemCreated(address indexed contractAddress, address ownerAddress, uint indexed tokenId, string url);
    event ERC1155ItemCreated(address indexed contractAddress, address ownerAddress, uint indexed tokenId, uint amount, string url);
    event ItemListed(uint listingId, address indexed contractAddress, address seller, uint indexed tokenId, uint price, uint amount);
    event ItemCanceled(uint listingId, address indexed contractAddress, address seller, uint indexed tokenId);
    event ItemBought(address indexed contractAddress, address buyer, uint indexed tokenId, uint price);
    event ItemListedOnAuction(address indexed contractAddress, uint auctionId, uint indexed tokenId, uint amountOfTokens, uint minTotalPrice);
    event AuctionFinished(uint auctionId);

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
        uint lastPrice;
        address lastBidder;
        uint amountOfBids;
        bool isFinished;
        bool hasValue;
    }

    modifier isListed(uint listingId) 
    {
        Listing memory listing = _listings[listingId];
        if (!listing.hasValue) revert NotListed(listing.contractAddress, listing.tokenId);
        _;
    }

    modifier auctionExists(uint auctionId) 
    {
        Auction memory auction = _auctions[auctionId];
        if (!auction.hasValue) revert AuctionIsNotExists(auctionId);
        _;
    }

    modifier isNotFinishedAuction(uint auctionId) 
    {
        Auction memory auction = _auctions[auctionId];
        if (auction.isFinished) revert AuctionIsFinished(auctionId);
        _;
    }

    modifier isListingOwner(uint listingId)
    {
        Listing memory listing = _listings[listingId];
        if (listing.seller != msg.sender) revert NotOwner();
        _;
    }

    modifier auctionCanBeFinished(uint auctionId)
    {
        Auction memory auction = _auctions[auctionId];
        require(
            block.timestamp >= auction.startTime + _auctionDurationTime,
            "Auction duration is not over yet"
        );
        _;
    }

    mapping(uint => Listing) private _listings;
    mapping(uint => Auction) private _auctions;

    IERC721 private immutable _erc721Contract;
    IERC1155 private immutable _erc1155Contract;
    IERC20 private immutable _erc20Contract;

    uint private _auctionIdCounter;
    uint private _listingIdCounter;
    address private immutable _erc721Address;
    address private immutable _erc1155Address;
    address private immutable _paymentTokenAddress;
    uint private immutable _auctionDurationTime;

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

    function createItem(address recipient, uint tokenId, uint amount, string calldata url)
        external
    {
        IERC1155Mintable(_erc1155Address).mint(recipient, amount, url);
        emit ERC1155ItemCreated(_erc1155Address, recipient, tokenId, amount, url);
    }

    function listItem(uint tokenId, uint price)
        external
        returns (uint)
    {
        if (price <= 0) revert PriceMustBeAboveZero();
        if (_erc721Contract.getApproved(tokenId) != address(this)) revert NotApprovedForMarketplace();

        _listingIdCounter++;
        _listings[_listingIdCounter] = Listing(_listingIdCounter, _erc721Address, tokenId, price, msg.sender, 1, true);

        _erc721Contract.transferFrom(msg.sender, address(this), tokenId);
        emit ItemListed(_listingIdCounter, _erc721Address, msg.sender, tokenId, price, 1);
        return _listingIdCounter;
    }

    function listItem(uint tokenId, uint amount, uint price)
        external
        returns (uint)
    {
        if (price <= 0) revert PriceMustBeAboveZero();
        if (!_erc1155Contract.isApprovedForAll(msg.sender, address(this))) revert NotApprovedForMarketplace();
        _listingIdCounter++;
        _listings[_listingIdCounter] = Listing(_listingIdCounter, _erc1155Address, tokenId, price, msg.sender, amount, true);
        
        _erc1155Contract.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        emit ItemListed(_listingIdCounter, _erc1155Address, msg.sender, tokenId, price, amount);
        return _listingIdCounter;
    }

    function buyItem(uint listingId, uint price)
        external
        isListed(listingId)
    {
        Listing memory listing = _listings[listingId];
        if (price < listing.price) revert PriceNotMet(_erc721Address, listing.tokenId, listing.price);

        delete (_listings[listingId]);

        _erc20Contract.transferFrom(msg.sender, listing.seller, listing.price);
        if (listing.contractAddress == _erc721Address) {
            _erc721Contract.safeTransferFrom(address(this), msg.sender, listing.tokenId);
            emit ItemBought(_erc721Address, msg.sender, listing.tokenId, listing.price);
        } else {
            _erc1155Contract.safeTransferFrom(address(this), msg.sender, listing.tokenId, listing.amount, "");
            emit ItemBought(_erc1155Address, msg.sender, listing.tokenId, listing.price);
        }
    }

    function cancelListing(uint listingId)
        external isListingOwner(listingId)
        isListed(listingId)
    {
        Listing memory listing = _listings[listingId];
        delete (_listings[listingId]);
        emit ItemCanceled(listingId, listing.contractAddress, msg.sender, listing.tokenId);
    }

    function getListing(uint listingId)
        external
        view
        returns (Listing memory)
    {
        return _listings[listingId];
    }

    function getAuction(uint auctionId)
        external
        view
        returns (Auction memory)
    {
        return _auctions[auctionId];
    }

    function listItemOnAuction(uint tokenId, uint minTotalPrice)
        external
        returns (uint)
    {
        IERC721(_erc721Address).transferFrom(msg.sender, address(this), tokenId);

        Auction memory auction = Auction(
            _auctionIdCounter++,
            _erc721Address,
            tokenId,
            msg.sender,
            1,
            block.timestamp,
            minTotalPrice,
            address(0),
            0,
            false,
            true
        );
        _auctions[_auctionIdCounter] = auction;
        emit ItemListedOnAuction(_erc721Address, _auctionIdCounter, tokenId, 1, minTotalPrice);
        return _auctionIdCounter;
    }

    function listItemOnAuction(uint tokenId, uint amountOfTokens, uint minTotalPrice)
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

        Auction memory auction = Auction(
            _auctionIdCounter++,
            _erc1155Address,
            tokenId,
            msg.sender,
            amountOfTokens, 
            block.timestamp,
            minTotalPrice,
            address(0),
            0,
            false,
            true
        );
        _auctions[_auctionIdCounter] = auction;
        emit ItemListedOnAuction(_erc1155Address, _auctionIdCounter, tokenId, amountOfTokens, minTotalPrice);
        return _auctionIdCounter;
    }

    function makeBid(uint auctionId, uint totalPrice)
        external
        auctionExists(auctionId)
        isNotFinishedAuction(auctionId)
    {
        Auction memory auction = _auctions[auctionId];
        if (auction.lastPrice > totalPrice) revert YourBidPriceIsLessThanCurrentBidPrice(auctionId);
        _auctions[auctionId].lastPrice = totalPrice;
        _auctions[auctionId].amountOfBids += 1;
        _auctions[auctionId].lastBidder = msg.sender;
        
        _erc20Contract.transferFrom(msg.sender, address(this), totalPrice);
        if (auction.amountOfBids > 0)
            _erc20Contract.transfer(auction.lastBidder, auction.lastPrice);
    }

    function finishAuction(uint auctionId)
        external
        auctionExists(auctionId)
        isNotFinishedAuction(auctionId)
        auctionCanBeFinished(auctionId)
    {
        Auction memory auction = _auctions[auctionId];
        if (auctionConditionsAreMet(auctionId))
        {
            if (auction.contractAddress == _erc721Address) {
                _erc721Contract.safeTransferFrom(address(this), auction.lastBidder, auction.tokenId);
            } else {
                _erc1155Contract.safeTransferFrom(
                    address(this),
                    auction.lastBidder,
                    auction.tokenId,
                    auction.amountOfTokens,
                    ""
                );
            }
            _erc20Contract.transfer(auction.seller, auction.lastPrice);
        }
        else 
        {
            if (auction.contractAddress == _erc721Address) 
                _erc721Contract.safeTransferFrom(address(this), auction.seller, auction.tokenId);
            else 
                _erc1155Contract.safeTransferFrom(address(this), auction.seller, auction.tokenId, auction.amountOfTokens, "");
            _erc20Contract.transferFrom(address(this), auction.lastBidder, auction.lastPrice);
        }
        _auctions[auctionId].isFinished = true;
        emit AuctionFinished(auctionId);
    }

    function auctionConditionsAreMet(uint auctionId)
        private
        view
        returns (bool)
    {
        Auction memory auction = _auctions[auctionId];
        return auction.amountOfBids >= 2;
    }
}