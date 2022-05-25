pragma solidity >=0.8.0;

interface IERC721Mintable {
    function mint(address recipient, string memory tokenURI) external returns (uint256);
}
