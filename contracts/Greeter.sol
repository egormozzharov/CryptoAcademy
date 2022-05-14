// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IBurnable {
    function burn(address account, uint256 amount) external returns (bool);
}

interface IMintable {
    function mint(address account, uint256 amount) external returns (bool);
}

contract ERC20Basic is IERC20, IBurnable, IMintable {

    string public constant name = "ERC20Basic";
    string public constant symbol = "ERC";
    uint8 public constant decimals = 2;
    uint256 public constant unitsOneWeiCanBuy = 5;
    address public owner;

    mapping(address => uint256) balances;
    mapping(address => mapping (address => uint256)) allowed;

    uint256 totalSupply_ = 10000;

    constructor() {
        owner = msg.sender;
        balances[msg.sender] = totalSupply_;
    }

    function totalSupply() public override view returns (uint256) {
        return totalSupply_;
    }

    function balanceOf(address tokenOwner) public override view returns (uint256) {
        return balances[tokenOwner];
    }

    function transfer(address receiver, uint256 numTokens) public override returns (bool) {
        return transfer(msg.sender, receiver, numTokens);
    }

    function transfer(address from, address to, uint256 numTokens) private returns (bool) {
        require(numTokens <= balances[from]);
        balances[from] = balances[from] - numTokens;
        balances[to] = balances[to] + numTokens;
        emit Transfer(from, to, numTokens);
        return true;
    }

    function approve(address delegate, uint256 numTokens) public override returns (bool) {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate) public override view returns (uint) {
        return allowed[owner][delegate];
    }

    function transferFrom(address owner, address buyer, uint256 numTokens) public override returns (bool) {
        require(numTokens <= balances[owner]);
        require(numTokens <= allowed[owner][msg.sender]);

        balances[owner] = balances[owner]-numTokens;
        allowed[owner][msg.sender] = allowed[owner][msg.sender]-numTokens;
        balances[buyer] = balances[buyer]+numTokens;
        emit Transfer(owner, buyer, numTokens);
        return true;
    }

    function burn(address account, uint256 amount) public override returns (bool) {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            balances[account] = accountBalance - amount;
        }
        totalSupply_ = totalSupply_ - amount;

        emit Transfer(account, address(0), amount);
        return true;
    }

    function mint(address account, uint256 amount) public override returns (bool) {
        require(msg.sender != owner, "Only owner can call mint");
        require(account != address(0), "ERC20: mint to the zero address");
        totalSupply_ = totalSupply_ + amount;
        balances[account] = balances[account] + amount;
        emit Transfer(address(0), account, amount);
        return true;
    }

    receive() external payable {
        uint256 amount = msg.value * unitsOneWeiCanBuy;
        require(balanceOf(owner) >= amount, "Not enough tokens");
        transfer(owner, msg.sender, amount);
        emit Transfer(owner, msg.sender, amount);
        payable(owner).transfer(msg.value);
    }
}
