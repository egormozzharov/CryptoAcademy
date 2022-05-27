pragma solidity >=0.8.0;

interface IERC1155Mintable {
    function mint(address recipient, uint256 tokenId, uint256 amount, string calldata uri) external returns (uint256);
}
