// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

contract NextPriceGenerator {
    uint private currentPrice;
    bool private isFirstStep;
    constructor(uint _initialPrice) {
        currentPrice = _initialPrice;
        isFirstStep = true;
    }

    function getNext() public returns (uint) {
        if (isFirstStep) {
            isFirstStep = false;
            return currentPrice;
        }
        return currentPrice * 103 / 100 + 4 * 10**12;
    }
}

contract ACDMPlatform {
    struct Order {
        bool isProcessed;
        address owner;
        uint amount;
        uint pricePerUnit;
    }

    bool public saleIsActive;
    bool public tradingIsActive;
    address public immutable acdmToken;
    uint public immutable roundTime;
    uint public pricePerUnitInCurrentPeriod;
    uint public amountInCurrentPeriod;
    uint public tradingWeiAmount;
    uint public saleEndTime;
    uint public tradingEndTime;

    Order[] public orders;

    event UserRegistered(address _newUser, address _referer);
    event SaleRoundStarted();
    event BuyACDM(address buyer, uint amount);

    event TradeRoundStarted();
    event OrderAdded(uint _amount, uint _pricePerUnit, address owner);
    event OrderRemoved(uint orderId);

    NextPriceGenerator public nextPriceGenerator;

    constructor(address _acdmToken, uint _roundTime) {
        require(_acdmToken != address(0), "ACDM token cannot be the zero address");
        acdmToken = _acdmToken;
        roundTime = _roundTime;
        tradingWeiAmount = 1 * 10**18;
        pricePerUnitInCurrentPeriod = (1 * 10**18 / 100000 * 10**6);
        nextPriceGenerator = new NextPriceGenerator(pricePerUnitInCurrentPeriod);
    }

    function register(address _newUser, address _referer) external {
        emit UserRegistered(_newUser, _referer);
    }

    function startSaleRound() external {
        require(block.timestamp >= tradingEndTime, "Tranding period is not ended yet");
        tradingIsActive = false;
        saleIsActive = true;
        pricePerUnitInCurrentPeriod = nextPriceGenerator.getNext();
        amountInCurrentPeriod = tradingWeiAmount / pricePerUnitInCurrentPeriod;
        IERC20Mintable (acdmToken).mint(address(this), amountInCurrentPeriod);
        emit SaleRoundStarted();
    }

    function buyACDM() payable external {
        uint amountToBuy = msg.value / pricePerUnitInCurrentPeriod;
        require (amountInCurrentPeriod > amountToBuy, "Order amount must be greater or equal to the sender amount");
        amountInCurrentPeriod = amountInCurrentPeriod - amountToBuy;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        emit BuyACDM(msg.sender, amountToBuy);
    }

    function startTradeRound() external {
        require((block.timestamp > saleEndTime) || (amountInCurrentPeriod == 0), "Sales period is not ended yet");
        if (amountInCurrentPeriod > 0) IERC20Burnable(acdmToken).burn(address(this), amountInCurrentPeriod);
        saleIsActive = false;
        tradingIsActive = true;
        tradingWeiAmount = 0;
        emit TradeRoundStarted();
    }

    function addOrder(uint _amount, uint _pricePerUnit) external {
        Order memory order = Order(
        {
            amount: _amount,
            pricePerUnit: _pricePerUnit,
            owner: msg.sender,
            isProcessed: false
        });
        orders.push(order);
        emit OrderAdded(_amount, _pricePerUnit, msg.sender);
    }

    function removeOrder(uint _orderId) external {
        delete orders[_orderId];
        emit OrderRemoved(_orderId);
    }

    function buyOrder(uint _orderId) payable external {
        Order memory order = orders[_orderId];
        uint amountToBuy = msg.value / order.pricePerUnit;
        require (order.amount > amountToBuy, "Order amount must be greater or equal to the sender amount");
        if (order.amount == amountToBuy) {
            order.isProcessed = true;
            order.amount = 0;
        } else {
            order.amount = order.amount - amountToBuy;
        }
        tradingWeiAmount = tradingWeiAmount + msg.value;
    }
}
