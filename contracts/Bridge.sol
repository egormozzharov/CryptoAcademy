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
    address immutable private _validatorAddress;
    mapping(bytes => bool) public signaturesWereProcessed;

    event Swaped(uint toNetwork, address toAddress, uint fromNetwork, address fromAddress, address tokenContractAddress, uint amount);
    event Redeemed(bytes signature, address tokenContractAddress, uint amount, uint nonce);

    constructor(address validatorAddress) {
        _validatorAddress = validatorAddress;
    }

    function swap(uint toNetwork, address toAddress, uint fromNetwork, address fromAddress, address tokenContractAddress, uint amount) external {
        IERC20Burnable(tokenContractAddress).burn(fromAddress, amount);
        console.log(getChainID());
        emit Swaped(toNetwork, toAddress, fromNetwork, fromAddress, tokenContractAddress, amount);
    }

    function redeem(bytes calldata signature, uint toNetwork, address toAddress, address tokenContractAddress, uint amount, uint nonce) external {
        require(toNetwork == getChainID(), "ChainId mismatch");
        require(signaturesWereProcessed[signature] == false, "Signature was already used");
        require(checkSignature(signature, toNetwork, toAddress, tokenContractAddress, amount, nonce), "Signature is not valid");
        signaturesWereProcessed[signature] = true;
        IERC20Mintable(tokenContractAddress).mint(toAddress, amount);
        emit Redeemed(signature, tokenContractAddress, amount, nonce);
    }

    function checkSignature(bytes calldata signature, uint toNetwork, address toAddress, address tokenContractAddress, uint amount, uint nonce) private view returns (bool) {
        bytes memory data = abi.encode(toNetwork, toAddress, tokenContractAddress, amount, nonce);
        bytes32 hash = keccak256(data);
        bytes32 ethereumSignedMessage = ECDSA.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(ethereumSignedMessage, signature);
        return signer == _validatorAddress;
    }

    function getChainID() private view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
    return id;
}
}