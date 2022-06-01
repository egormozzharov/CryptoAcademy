// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";
import "./interfaces/IERC20.sol";

contract Bridge {
    mapping(string => bool) public signaturesWereProcessed;

    event SwapExecuted(string toNetwork, address toAddress, string fromNetwork, address fromAddress, address tokenContractAddress, uint amount);

    string private _currentNetwork;

    constructor(string memory currentNetwork) {
        _currentNetwork = currentNetwork;
    }

    function swap(string calldata toNetwork, address toAddress, address tokenContractAddress, uint amount) external {
        IERC20Burnable(tokenContractAddress).burn(msg.sender, amount);
        emit SwapExecuted(toNetwork, toAddress, _currentNetwork, msg.sender, tokenContractAddress, amount);
    }

    function redeem(string calldata messageWithSignature, string calldata signature) external {
        require(signaturesWereProcessed[signature] == false, "Signature was already used");
        require(verifySignature(messageWithSignature, signature), "Signature is not valid");
        signaturesWereProcessed[signature] = true;
        address tokenContractAddress = getTokenContractAddress(messageWithSignature);
        address toAddress = getToAddress(messageWithSignature);
        uint amount = getTokenAmount(messageWithSignature);
        IERC20Mintable(tokenContractAddress).mint(toAddress, amount);
    }

    function verifySignature(string calldata messageWithSignature, string calldata signature) internal returns (bool) {
        return true;
    }

    function getTokenContractAddress(string calldata messageWithSignature) internal returns (address) {
        return address(0);
    }

    function getTokenAmount(string calldata messageWithSignature) internal returns (uint) {
        return 0;
    }

    function getToAddress(string calldata messageWithSignature) internal returns (address) {
        return address(0);
    }
}