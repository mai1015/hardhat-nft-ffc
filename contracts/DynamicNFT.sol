// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNFT is ERC721 {
    uint256 private s_tokenCounter;

    string private i_lowImageURI;
    string private i_highImageURI;
    string private constant base64EncodedSvgPrefix = "data:image/svg+xml;base64,"

    constructor(string memory lowSvg, string memory highSvg) ERC721("Dynamic Svg NFT", "DSN") {
        s_tokenCounter = 0;
        i_lowImageURI = lowSvg;
        i_highImageURI = highSvg;
    }

    function svgToImageUri() public pure returns (string memory) {}

    function mintNFT() public {
        _safeMint(msg.sender, s_tokenCounter++);
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
