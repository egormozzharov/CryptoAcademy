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
    address immutable private _validatorAddress;

    event SwapExecuted(uint toNetwork, address toAddress, uint fromNetwork, address fromAddress, address tokenContractAddress, uint amount);
    event RedeemExecuted(bytes signature, address tokenContractAddress, uint amount, uint nonce);

    constructor(address validatorAddress) {
        _validatorAddress = validatorAddress;
    }

    function swap(uint toNetwork, address toAddress, uint fromNetwork, address tokenContractAddress, uint amount) external {
        IERC20Burnable(tokenContractAddress).burn(msg.sender, amount);
        emit SwapExecuted(toNetwork, toAddress, fromNetwork, msg.sender, tokenContractAddress, amount);
    }

    function redeem(bytes calldata signature, address tokenContractAddress, uint amount, uint nonce) external {
        require(signaturesWereProcessed[signature] == false, "Signature was already used");
        require(checkSignature(signature, tokenContractAddress, amount, nonce), "Signature is not valid");
        signaturesWereProcessed[signature] = true;
        IERC20Mintable(tokenContractAddress).mint(msg.sender, amount);
        emit RedeemExecuted(signature, tokenContractAddress, amount, nonce);
    }

    function checkSignature(bytes calldata signature, address tokenContractAddress, uint amount, uint nonce) private view returns (bool) {
        bytes memory data = abi.encode(tokenContractAddress, amount, nonce);
        bytes32 hash = keccak256(data);
        bytes32 ethereumSignerdMessage = ECDSA.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(ethereumSignerdMessage, signature);
        return signer == _validatorAddress;
    }
}