// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "hardhat/console.sol";

contract ACDMPlatform {
    struct Order {
        bool isProcessed;
        address owner;
        uint amount;
        uint pricePerUnit;
    }

    bool public isFirstRound;
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
    mapping (address => address[]) public usersWithReferers;

    event UserRegistered(address _newUser, address _referer);
    event SaleRoundStarted();
    event BuyACDM(address buyer, uint amount);
    event BuyOrder(address buyer, uint amount);

    event TradeRoundStarted();
    event OrderAdded(uint _amount, uint _pricePerUnit, address owner);
    event OrderRemoved(uint orderId);

    constructor(address _acdmToken, uint _roundTime) {
        require(_acdmToken != address(0), "ACDM token cannot be the zero address");
        acdmToken = _acdmToken;
        roundTime = _roundTime;
        isFirstRound = true;
        tradingWeiAmount = 1 * 10**18;
        amountInCurrentPeriod = 100000 * 10**6;
        pricePerUnitInCurrentPeriod = (tradingWeiAmount / amountInCurrentPeriod);
    }

    function register(address _newUser, address _referer) external {
        require(_newUser != address(0), "User cannot be the zero address");
        address[] memory referers = new address[](2);
        referers[0] = _referer;
        if (usersWithReferers[_referer].length > 0) {
            referers[1] = usersWithReferers[_referer][0];
        }
        usersWithReferers[_newUser] = referers;
        emit UserRegistered(_newUser, _referer);
    }

    function startSaleRound() external {
        require(block.timestamp >= tradingEndTime, "Tranding period is not ended yet");
        pricePerUnitInCurrentPeriod = getNextPricePerUnitInCurrentPeriod();
        amountInCurrentPeriod = getNextAmountOfACDM();
        isFirstRound = false;
        tradingIsActive = false;
        saleIsActive = true;
        IERC20Mintable(acdmToken).mint(address(this), amountInCurrentPeriod);
        emit SaleRoundStarted();
    }

    function getNextPricePerUnitInCurrentPeriod() private view returns(uint) {
        if (isFirstRound) {
            return pricePerUnitInCurrentPeriod;
        }
        return pricePerUnitInCurrentPeriod * 103 / 100 + 4 * 10**12;
    }

    function getNextAmountOfACDM() private view returns(uint) {
        if (isFirstRound) {
           return amountInCurrentPeriod;
        }
        return tradingWeiAmount / pricePerUnitInCurrentPeriod;
    }

    function buyACDM() payable external {
        console.log("msgvalue=", msg.value);
        console.log("pricePerUnitInCurrentPeriod=", pricePerUnitInCurrentPeriod);
        uint amountToBuy = msg.value / pricePerUnitInCurrentPeriod;
        console.log("amountToBuy=", amountToBuy);
        console.log("amountInCurrentPeriod=", amountInCurrentPeriod);
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
        require(tradingIsActive == true, "Trading should be acvive");
        IERC20(acdmToken).transferFrom(msg.sender, address(this), _amount);
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
        Order storage order = orders[_orderId];
        IERC20(acdmToken).transfer(order.owner, order.amount);
        delete orders[_orderId];
        emit OrderRemoved(_orderId);
    }

    function buyOrder(uint _orderId) payable external {
        Order memory order = orders[_orderId];
        uint amountToBuy = msg.value / order.pricePerUnit;
        require (amountToBuy > 0, "Amount to buy must be greater that zero");
        require (order.amount >= amountToBuy, "Order amount must be greater or equal to the sender amount");
        if (order.amount == amountToBuy) {
            order.isProcessed = true;
            order.amount = 0;
        } else {
            order.amount = order.amount - amountToBuy;
        }
        tradingWeiAmount = tradingWeiAmount + msg.value;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        emit BuyOrder(msg.sender, amountToBuy);
    }
}
