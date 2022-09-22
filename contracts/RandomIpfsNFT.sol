// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error RandomIpfsNFT__RangeOutOfBounds();
error RandomIpfsNFT__NeedMoreETH();
error RandomIpfsNFT__TransferFail();

contract RandomIpfsNFT is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
    enum Breed {
        PUB,
        SHIBA_INU,
        ST_BERNARD
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;

    uint256 private immutable i_mintFee;

    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private constant MAX_CHANCE_VALUE = 100;

    mapping(uint256 => address) public s_requestIdToSender;

    // NFT variable
    uint256 private s_tokenCounter;
    string[] internal s_dogTokenUris;

    event NFTRequested(uint256 indexed requestId, address indexed requester);
    event NFTMinted(Breed indexed dogBreed, address indexed minter);

    constructor(
        address vrfCoordinator,
        uint64 subId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint256 mintFee,
        string[3] memory dogTokenUris
    ) ERC721("Random IPFS NFT", "RIN") VRFConsumerBaseV2(vrfCoordinator) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_subId = subId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_dogTokenUris = dogTokenUris;
        i_mintFee = mintFee;
    }

    function requestNFT() public payable {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNFT__NeedMoreETH();
        }

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NFTRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address owner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter++;

        uint256 rng = randomWords[0] % MAX_CHANCE_VALUE;
        Breed dogBreed = getBreedFromRng(rng);
        _safeMint(owner, newTokenId);
        _setTokenURI(newTokenId, s_dogTokenUris[uint256(dogBreed)]);
        emit NFTMinted(dogBreed, owner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNFT__TransferFail();
        }
    }

    function getBreedFromRng(uint256 rng) public pure returns (Breed) {
        uint256 lastSum = 0;
        uint256[3] memory arr = getChanceArray();
        for (uint256 i = 0; i < arr.length; i++) {
            if (rng >= lastSum && rng < lastSum + arr[i]) {
                return Breed(i);
            }
            lastSum += arr[i];
        }
        revert RandomIpfsNFT__RangeOutOfBounds();
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getDogTokenUri(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }
}
