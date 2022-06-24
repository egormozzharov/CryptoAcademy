// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20Burnable.sol";
import "./interfaces/IERC20Mintable.sol";

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
    address public immutable owner;
    address public editor;
    uint public immutable roundTime;
    uint public pricePerUnitInCurrentPeriod;
    uint public amountInCurrentPeriod;
    uint public tradingWeiAmount;
    uint public saleEndTime;
    uint public tradingEndTime;
    uint public rewardFractionForSaleRef1 = 50;
    uint public rewardFractionForSaleRef2 = 30;
    uint public rewardFractionForTradeRef1 = 25;
    uint public rewardFractionForTradeRef2 = 25;

    Order[] public orders;
    mapping (address => address[]) public usersWithReferers;

    event UserRegistered(address _newUser, address _referer);
    event SaleRoundStarted();
    event BuyACDM(address buyer, uint amount);
    event BuyOrder(address buyer, uint amount);
    event TradeRoundStarted();
    event OrderAdded(uint _amount, uint _pricePerUnit, address owner);
    event OrderRemoved(uint orderId);

    modifier onlyOwner {
        require(msg.sender == owner, "Only chairperson can call this function");
        _;
    }

    modifier onlyEditorOrOwner() {
        require(msg.sender == editor || msg.sender == owner, "Only editor can call this function");
        _;
    }

    constructor(address _acdmToken, uint _roundTime) {
        require(_acdmToken != address(0), "ACDM token cannot be the zero address");
        owner = msg.sender;
        acdmToken = _acdmToken;
        roundTime = _roundTime;
        isFirstRound = true;
        tradingWeiAmount = 1 * 10**18;
        amountInCurrentPeriod = 100000 * 10**5;
        pricePerUnitInCurrentPeriod = (tradingWeiAmount / amountInCurrentPeriod);
    }

    function setEditor(address _editor) external onlyOwner {
        editor = _editor;
    }

    function register(address _newUser, address _referer) external {
        require(_newUser != address(0), "User cannot be the zero address");
        address[] storage referers = usersWithReferers[_newUser];
        if (_referer != address(0)) {
            referers.push(_referer);
            if (usersWithReferers[_referer].length > 0) {
                referers.push(usersWithReferers[_referer][0]);
            }
        }
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

    function buyACDM() payable external {
        require(saleIsActive == true, "Sale should be active");
        uint amountToBuy = msg.value / pricePerUnitInCurrentPeriod;
        require (amountInCurrentPeriod > amountToBuy, "Order amount must be greater or equal to the sender amount");
        amountInCurrentPeriod = amountInCurrentPeriod - amountToBuy;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        address[] storage referers = usersWithReferers[msg.sender];
        if (referers.length == 1) sendSaleRewardToRef1(referers);
        if (referers.length == 2) { 
            sendSaleRewardToRef1(referers);
            sendSaleRewardToRef2(referers);
        }
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
        require(tradingIsActive == true, "Trading should be active");
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
        require(tradingIsActive == true, "Trading should be active");
        Order memory order = orders[_orderId];
        uint amountToBuy = msg.value / order.pricePerUnit;
        require (amountToBuy > 0, "Amount to buy must be greater than zero");
        require (order.amount >= amountToBuy, "Order amount must be greater or equal to the sender amount");
        if (order.amount == amountToBuy) {
            order.isProcessed = true;
            order.amount = 0;
        } else order.amount = order.amount - amountToBuy;
        tradingWeiAmount = tradingWeiAmount + msg.value;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        address[] storage referers = usersWithReferers[msg.sender];
        if (referers.length == 1) sendTradeRewardToRef1(referers);
        if (referers.length == 2) {
            sendTradeRewardToRef1(referers);
            sendTradeRewardToRef2(referers);
        }
        emit BuyOrder(msg.sender, amountToBuy);
    }

    function setRewardFractionForSaleRef1(uint _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForSaleRef1 = _rewardFraction;
    }

    function setRewardFractionForSaleRef2(uint _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForSaleRef2 = _rewardFraction;
    }

    function setRewardFractionForTradeRef1(uint _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForTradeRef1 = _rewardFraction;
    }

    function setRewardFractionForTradeRef2(uint _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForTradeRef2 = _rewardFraction;
    }

    function sendSaleRewardToRef1(address[] storage referers) private {
        payable(referers[0]).send((msg.value * rewardFractionForSaleRef1) / 1000);
    }

    function sendSaleRewardToRef2(address[] storage referers) private {
        payable(referers[0]).send((msg.value * rewardFractionForSaleRef2) / 1000);
    }

    function sendTradeRewardToRef1(address[] storage referers) private {
        payable(referers[0]).send((msg.value * rewardFractionForTradeRef1) / 1000);
    }

    function sendTradeRewardToRef2(address[] storage referers) private {
        payable(referers[1]).send((msg.value * rewardFractionForTradeRef2) / 1000);
    }

    function getNextPricePerUnitInCurrentPeriod() private view returns(uint) {
        if (isFirstRound) return pricePerUnitInCurrentPeriod;
        return pricePerUnitInCurrentPeriod * 103 / 100 + 4 * 10**12;
    }

    function getNextAmountOfACDM() private view returns(uint) {
        if (isFirstRound) return amountInCurrentPeriod;
        return tradingWeiAmount / pricePerUnitInCurrentPeriod;
    }
}
