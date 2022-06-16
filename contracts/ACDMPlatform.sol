// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

contract ACDMPlatform {
    //struct
    //value types
    //maps and arrays
    //events and errors
    //modifiers 

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
    uint public pricePerUnitInCurrentRound = 1 eth;
    uint public amountInCurrentRound = 100 000 ACDM;
    uint public tradingETHAmount; 

    Order[] public orders;

    event UserRegistered(address _newUser, address _referer);
    event SaleRoundStarted();
    event TradeRoundStarted();
    event OrderAdded(uint _amount, uint _pricePerUnit, address owner);
    event OrderRemoved(uint orderId);

    // error ExternalContractExecutionFailed();

    constructor(address _acdmToken, uint _roundTime) {
        require(_acdmToken != address(0), "ACDM token cannot be the zero address");
        acdmToken = _acdmToken;
        roundTime = _roundTime;
    }

    function register(address _newUser, address _referer) external {
        emit UserRegistered(_newUser, _referer);
    }

    function startSaleRound() external {
        // require (tradeRound has ended) 
        tradingIsActive = false;
        saleIsActive = true;
        pricePerUnitInCurrentPeriod = getNextPrice(pricePerUnitInCurrentPeriod);
        amountInCurrentPeriod = getNextAmount(tradingETHAmount, pricePerUnitInCurrentPeriod);
        
        // mint ACDM tokens
        emit SaleRoundStarted();
    }

    function getNextPrice(uint _currentPrice) private returns (uint) {
        return _currentPrice * 1,03 + 0,000004;
    }

    function getNextAmount(uint _tradingETHAmount, uint _currentPrice) private return (uint) {
        return _tradingETHAmount / _currentPrice; 
    }


    function buyACDM() payable external {
        if () {
            
        }
        //calculate ACDM tokens amount and send to the msg.sender
    }

    function startTradeRound() external {
        saleIsActive = false;
        tradingIsActive = true;
        tradingETHAmount = 0;
        // require(if ACDM tokens amount for sale = 0 or roundTime has ended)
        // burn ACDM tokens
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
        delete orders[orderId];
        emit OrderRemoved(orderId);
    }

    function buyOrder(uint _orderId) payable external {
        Order memory order = orders[orderId];
        uint amountToBuy = msg.value / order.pricePerUnit;
        require (order.amount > amountToBuy, "Order amount must be greater or equal to the sender amount");
        if (order.amount == amountToBuy) {
            order.isProcessed = true;
            order.amount = 0;
        } else {
            order.amount = order.amount - amountToBuy;
        }
        tradingETHAmount = tradingETHAmount + msg.value;
    }
}
