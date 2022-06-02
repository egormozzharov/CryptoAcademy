// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";
import "./interfaces/IERC20.sol";
import "hardhat/console.sol";

contract Bridge {
    mapping(bytes => bool) public signaturesWereProcessed;

    event SwapExecuted(string toNetwork, address toAddress, string fromNetwork, address fromAddress, address tokenContractAddress, uint amount);
    event RedeemExecuted();

    string private _currentNetwork;
    address immutable private _validatorAddress;

    constructor(string memory currentNetwork, address validatorAddress) {
        _currentNetwork = currentNetwork;
        _validatorAddress = validatorAddress;
    }

    function swap(string calldata toNetwork, address toAddress, address tokenContractAddress, uint amount) external {
        IERC20Burnable(tokenContractAddress).burn(msg.sender, amount);
        emit SwapExecuted(toNetwork, toAddress, _currentNetwork, msg.sender, tokenContractAddress, amount);
    }

    function redeem(bytes calldata signature, address tokenContractAddress, uint amount, uint nonce) external {
        require(signaturesWereProcessed[signature] == false, "Signature was already used");
        require(this.checkSignature(signature, tokenContractAddress, amount, nonce), "Signature is not valid");
        signaturesWereProcessed[signature] = true;
        IERC20Mintable(tokenContractAddress).mint(msg.sender, amount);
        emit RedeemExecuted();
    }

    function checkSignature(bytes calldata signature, address tokenContractAddress, uint amount, uint nonce) external view returns (bool) {
        bytes memory data = abi.encode(tokenContractAddress, amount, nonce);
        bytes32 hash = keccak256(data);
        bytes32 ethereumSignerdMessage = ECDSA.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(ethereumSignerdMessage, signature);
        return signer == _validatorAddress;
    }
}