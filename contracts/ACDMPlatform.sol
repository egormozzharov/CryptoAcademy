// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20Burnable.sol";
import "./interfaces/IERC20Mintable.sol";

contract ACDMPlatform {
    enum RoundState { Sale, Trading }

    struct Round {
        RoundState state;
        uint248 endTime;
    }

    struct Order {
        address owner;
        uint amount;
        uint pricePerUnit;
    }

    uint public immutable roundTime;
    address public immutable acdmToken;
    address public immutable owner;
    address public editor;
    uint public pricePerUnitInCurrentPeriod;
    uint public amountInCurrentPeriod;
    uint public tradingWeiAmount;
    uint16 public rewardFractionForSaleRef1 = 50;
    uint16 public rewardFractionForSaleRef2 = 30;
    uint16 public rewardFractionForTradeRef1 = 25;
    uint16 public rewardFractionForTradeRef2 = 25;
    Round public round;

    Order[] public orders;
    mapping (address => address) public userReferer;

    event UserRegistered(address _newUser, address _referer);
    event SaleRoundStarted();
    event ACDMBought(address buyer, uint amount);
    event OrderBought(address buyer, uint amount);
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
        tradingWeiAmount = 1 * 10**18;
        pricePerUnitInCurrentPeriod = 10**2;
        amountInCurrentPeriod = 10**5;
        round.state = RoundState.Sale;
        round.endTime = uint248(block.timestamp + _roundTime);
        IERC20Mintable(_acdmToken).mint(address(this), amountInCurrentPeriod);
    }

    function setEditor(address _editor) external onlyOwner {
        editor = _editor;
    }

    function register(address _newUser, address _referer) external {
        require(_newUser != address(0), "User cannot be the zero address");
        userReferer[_newUser] = _referer;
        emit UserRegistered(_newUser, _referer);
    }

    function buyACDM() payable external {
        require(round.state == RoundState.Sale, "Sale should be active");
        uint amountToBuy = msg.value / pricePerUnitInCurrentPeriod;
        require (amountInCurrentPeriod >= amountToBuy, "Order amount must be greater or equal to the sender amount");
        amountInCurrentPeriod = amountInCurrentPeriod - amountToBuy;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        address firstLevelRef = userReferer[msg.sender];
        address secondLevelRef = userReferer[firstLevelRef];
        if (firstLevelRef != address(0)) sendSaleRewardToRef1(firstLevelRef);
        if (secondLevelRef != address(0)) sendSaleRewardToRef2(secondLevelRef);
        trySwitchRoundType();
        emit ACDMBought(msg.sender, amountToBuy);
    }

    function addOrder(uint _amount, uint _pricePerUnit) external {
        require(round.state == RoundState.Trading, "Trading should be active");
        IERC20(acdmToken).transferFrom(msg.sender, address(this), _amount);
        Order memory order = Order({
            amount: _amount,
            pricePerUnit: _pricePerUnit,
            owner: msg.sender
        });
        orders.push(order);
        trySwitchRoundType();
        emit OrderAdded(_amount, _pricePerUnit, msg.sender);
    }

    function removeOrder(uint _orderId) external {
        Order storage order = orders[_orderId];
        IERC20(acdmToken).transfer(order.owner, order.amount);
        delete orders[_orderId];
        trySwitchRoundType();
        emit OrderRemoved(_orderId);
    }

    function buyOrder(uint _orderId) payable external {
        require(round.state == RoundState.Trading, "Trading should be active");
        Order memory order = orders[_orderId];
        uint amountToBuy = msg.value / order.pricePerUnit;
        require (amountToBuy > 0, "Amount to buy must be greater than zero");
        require (order.amount >= amountToBuy, "Order amount must be greater or equal to the sender amount");
        if (order.amount == amountToBuy) 
            delete orders[_orderId];
        else
            order.amount -= amountToBuy;
        tradingWeiAmount += msg.value;
        IERC20(acdmToken).transfer(msg.sender, amountToBuy);
        address firstLevelRef = userReferer[msg.sender];
        address secondLevelRef = userReferer[firstLevelRef];
        if (firstLevelRef != address(0)) sendTradeRewardToRef1(firstLevelRef);
        if (secondLevelRef != address(0)) sendTradeRewardToRef2(secondLevelRef);
        trySwitchRoundType();
        emit OrderBought(msg.sender, amountToBuy);
    }

    function startSaleRound() public {
        require(startSaleRoundCondition(), "Trading period is not ended yet");
        pricePerUnitInCurrentPeriod = getNextPricePerUnitInCurrentPeriod();
        amountInCurrentPeriod = getNextAmountOfACDM();
        round = Round({
            state: RoundState.Sale,
            endTime: uint248(block.timestamp + roundTime)
        });
        IERC20Mintable(acdmToken).mint(address(this), amountInCurrentPeriod);
        emit SaleRoundStarted();
    }

    function startTradeRound() public {
        require(startTradeRoundCondition(), "Sales period is not ended yet");
        if (amountInCurrentPeriod > 0) IERC20Burnable(acdmToken).burn(address(this), amountInCurrentPeriod);
        tradingWeiAmount = 0;
        round = Round({
            state: RoundState.Trading,
            endTime: uint248(block.timestamp + roundTime)
        });
        emit TradeRoundStarted();
    }

    function setRewardFractionForSaleRef1(uint16 _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForSaleRef1 = _rewardFraction;
    }

    function setRewardFractionForSaleRef2(uint16 _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForSaleRef2 = _rewardFraction;
    }

    function setRewardFractionForTradeRef1(uint16 _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForTradeRef1 = _rewardFraction;
    }

    function setRewardFractionForTradeRef2(uint16 _rewardFraction) external onlyEditorOrOwner {
        require(_rewardFraction < 1000, "Reward fraction should be less than 1000");
        rewardFractionForTradeRef2 = _rewardFraction;
    }

    function sendSaleRewardToRef1(address referer) private {
        payable(referer).send((msg.value * rewardFractionForSaleRef1) / 1000);
    }

    function sendSaleRewardToRef2(address referer) private {
        payable(referer).send((msg.value * rewardFractionForSaleRef2) / 1000);
    }

    function sendTradeRewardToRef1(address referer) private {
        payable(referer).send((msg.value * rewardFractionForTradeRef1) / 1000);
    }

    function sendTradeRewardToRef2(address referer) private {
        payable(referer).send((msg.value * rewardFractionForTradeRef2) / 1000);
    }

    function getNextPricePerUnitInCurrentPeriod() private view returns(uint) {
        return (pricePerUnitInCurrentPeriod * 103 / 100 + 40);
    }

    function getNextAmountOfACDM() private view returns(uint) {
        return tradingWeiAmount / pricePerUnitInCurrentPeriod;
    }

    function trySwitchRoundType() private {
        if (startTradeRoundCondition())
            startTradeRound();
        else if (startSaleRoundCondition())
            startSaleRound();
    }

    function startTradeRoundCondition() private returns(bool) {
        return (round.state == RoundState.Sale) && ((block.timestamp >= round.endTime) || (amountInCurrentPeriod == 0));
    }

    function startSaleRoundCondition() private returns(bool) {
        return (round.state == RoundState.Trading) && (block.timestamp >= round.endTime);
    }
}
