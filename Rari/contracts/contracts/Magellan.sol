// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol";

//we import both our inhertiance and our sdk like packages "using Statements" in other words

contract Magellan is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds; 

    //whenever we have our contract parameters we need parametrers for ERC721
    constructor () ERC721 ("MagellanToken", "MAGE") {}

    //here we have opur item struct
    struct Item {

        uint256 id;
        address creator;
        string uri;
    }

    //create our mapped ids
    mapping(uint256 => Item) public Items;

    function createItem(string memory uri) public returns (uint256){
        _tokenIds.increment();

        //we increment the new token id and create a new mapping with a new id attached
        uint256 newItemID = _tokenIds.current();

        //here we do the minting
        _safeMint(msg.sender, newItemID);

        //then we create a new item mapped to the id, sender, and uri(metadata)
        Items[newItemID] = Item(newItemID, msg.sender, uri);
        return newItemID;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        //we simply return the URL of this object
        return Items[tokenId].uri;   
    }


}