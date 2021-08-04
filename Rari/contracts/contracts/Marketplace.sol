// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract MagellanMarketContract {
   
    //here we create our \item that we auction compl;ex object with many details like a class - when  you have an ob ject with many things
    //when creating these structs you just have to think what does an auction item need
    struct AuctionItem {
        uint256 id;
        address tokenAddress;
        uint256 tokenId;
        address payable seller;
        uint256 askingPrice;
        bool isSold;

    }

     AuctionItem [] public itemsForSale;
     //we use mapping to avoid looping through arrays to find an entry instead we can map it to see if its active or not
     mapping(address => mapping(uint256 => bool)) activeItems;

     event itemAdded(uint256 id, uint256 tokenId, address tokenAddress, uint256 askingPrice);
     event itemSold(uint256 id, address buyer, uint256 askingPrice);

     modifier onlyItemOwner(address tokenAddress, uint256 tokenId){

         //setr up the interface for our token
         IERC721 tokenContract = IERC721(tokenAddress);

         //checking that the caller is the owner of this token
         require(tokenContract.ownerOf(tokenId) == msg.sender);
         _;

     }

     modifier hasTransferApproval(address tokenAddress, uint256 tokenId){

         //we make an interface for our ERC721 token address 
         IERC721 tokenContract = IERC721(tokenAddress);

         //checking that the caller is the owner of this token
         require(tokenContract.getApproved(tokenId) == address(this));
         _;

     }

     modifier itemExists(uint256 id){

        require(id < itemsForSale.length && itemsForSale[id].id == id, "Could Not Find Item");
         _;

     }

     modifier isForSale(uint256 id){

        require(itemsForSale[id].isSold == false, "Item Has Been Bought");
         _;

     }

     //here we simply add our token to the market - to add them to amrket we are simply adding them to a dynamic list of items for sale 
     //we asre adding a token to market
     function addItemToMarket(uint256 tokenId, address tokenAddress, uint256 askingPrice) onlyItemOwner(tokenAddress, tokenId) hasTransferApproval(tokenAddress, tokenId) external returns (uint256) {
         //require statments do a good job of eliminating a need for if statments
         require(activeItems[tokenAddress][tokenId] == false, "Item Is Already Up For Sale");
         //we get the last entry in the items for sale array 
         uint256 newItemId = itemsForSale.length;
         itemsForSale.push(AuctionItem(newItemId, tokenAddress, tokenId, payable(msg.sender), askingPrice, false));
         activeItems[tokenAddress][tokenId] = true;

         assert(itemsForSale[newItemId].id == newItemId);
         emit itemAdded(newItemId, tokenId, tokenAddress, askingPrice);
         return newItemId;
     }

    //we implement very similiar functionality to the wallet
    //having an id to specify the object in an array is also essential


    //right now the buyiung is very limited first we do not support bidding and second we cannot withdraw an item or take it off marketr once it has been put on
     function buyItem(uint256 id) payable external itemExists(id) isForSale(id) hasTransferApproval(itemsForSale[id].tokenAddress, itemsForSale[id].tokenId) {
         require(msg.value >= itemsForSale[id].askingPrice, "Not Enough Purchasing Power");
         //theres allot you can build and do jsut by working with structs
         require(msg.sender != itemsForSale[id].seller);

        //im starting to realize how essentialy arrrays and structs are
        itemsForSale[id].isSold = true;
        activeItems[itemsForSale[id].tokenAddress][itemsForSale[id].tokenId] = false;
        //now we do the process of transferring 
        //coding is basically writing what you want the computer to do in english there some technicallyity to it but oince you understand that its not hard 
        //try just writing what you want in your words - logically describe what is going on under the hood
        IERC721(itemsForSale[id].tokenAddress).safeTransferFrom(itemsForSale[id].seller, msg.sender, itemsForSale[id].tokenId);
        itemsForSale[id].seller.transfer(msg.value);

        emit itemSold(id, msg.sender, itemsForSale[id].askingPrice);

    }

    //bidding you would need implement some sort of array where the buy goes to the highest bidder in a certian amount of time
    //withdraw we would just use the mapping to sort throught he array 
    //also you could get the code from raraible 
    //theres also multiple auction functions we can find online
    //we could also have the tokens transferred to the marketplace in the min iting process in our other contract 

    //we would need two functions instant buy 
    //withdraw 
    //place bid 
    //then we may need to add to a function with some code that autmitically transfer contract to market upon mint 


}