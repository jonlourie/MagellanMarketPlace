Moralis.initialize("WaAJQmgXHPJJRbaaOo137lAJDKIE9VdUfks55OTo");
Moralis.serverURL = 'https://vq8p9xh8ydgz.usemoralis.com:2053/server'
//inititialize moralis
const TOKEN_CONTRACT_ADDRESS = "0x00aF428A26b2F2f14266Ade5e0Ea26def52506D5";
const MARKETPLACE_CONTRACT_ADDRESS = "0xae157A19119e9a36D2aAd27d4e1d3B8701EE7b4B";

init = async () => {

    //I think he was already logged inot metamaks which is why it showed up different for him
    hideElement(openCreateItemButton);
    hideElement(userProfileButton);
    hideElement(createItemForm);
    hideElement(userInfo);

    hideElement(openUserItemsButton);
    hideElement(userItemsSection);

    

    window.web3 = await Moralis.Web3.enable();

    //here we call the ethereum token contract and define it

    window.tokenContract = new web3.eth.Contract(tokenContractAbi, TOKEN_CONTRACT_ADDRESS);
    window.marketPlaceContract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);

    initUser();
}

//if its the current user hide the connect button show profile only 
//if its not the current user then do the opposite 
//here we initializing our user
initUser = async () => {
    if(await Moralis.User.current()) {

        hideElement(userConnectButton);
        showElement(userProfileButton);
        showElement(openCreateItemButton);
        showElement(openUserItemsButton);
        loadUserItems();
        

    }else {

        hideElement(userProfileButton);
        hideElement(openCreateItemButton);
        hideElement(openUserItemsButton);
        showElement(userConnectButton);

    }
}   

//here we log in the user to metamask or authenticate we also run initialize user if the program detects 
//current user we will run initialize user to basicaly make it so new logins from addresses will dsplay this experiment
login = async () => {
    try{

        await Moralis.Web3.authenticate();
        initUser(); //we call this function again because then it will trigger the correct button to be shown

    } catch (error) {

        alert(error);
        //standard error whatever it is

    }
}

logOut = async () => {
    
    await Moralis.User.logOut();
    hideElement(userInfo);
    hideElement(createItemForm);
    initUser(); //we always call the init user method when we transation as it handles showing the coreect button 
    //when we logout we no longer get a user we need to show display the proper buttons
}

openUserInfo = async() => {

    //if we are logged in this will bne defined if we are not it will be undefined
    user = await Moralis.User.current(); //using this we can get the current user and laod them into the user object
    if(user) {

        const email = user.get('email');
        if(email){
            userEmailField.value = email;
        }else{

            userEmailField.value = "";

        }

        userUsernameField.value = user.get('username'); //automatic moralis function 

        const userAvatar = user.get('avatar');
        if(userAvatar) {

            userAvatarImage.src = userAvatar.url();
            showElement(userAvatarImage);

        }else{

            hideElement(userAvatarImage);
        }

        showElement(userInfo);

    }else{

        //we call login because they are probably not logged in if they cant access user info username given 
        login();
    }
}

saveUserInfo = async () => {

    user.set('email', userEmailField.value);
    user.set('username', userUsernameField.value);

    //taken from documentation in moralis
    
    if (userAvatarFile.files.length > 0) {

        const avatar = new Moralis.File("avatar.jpg", userAvatarFile.files[0]);
        user.set('avatar', avatar); //we set 'avatar' to avatar variable we created 
        //moralis does any type of file not just jpgs

    }

    await user.save();
    alert("User Info Saved Successfully");
    openUserInfo();
}

createItem = async() => {

    if(createItemFile.files.length == 0) {

        alert("Please select a file");
        return;

    }else if (createItemNameField.value.length == 0){
        
        alert("Please provide a name for the item");
        return;
    }

    //we derfine our nft file
    const nftFile = new Moralis.File("nftfile.jpg", createItemFile.files[0]);
    await nftFile.saveIPFS();
    //thats how easy it is tro save to IPFS

    //file path
    const nftFilePath = nftFile.ipfs();
    const nftFileHash = nftFile.hash();

    const metaData = {

        name: createItemNameField.value,
        description: createItemDescriptionField.value,
        image: nftFilePath,
        nftFileHash: nftFileHash,

    };

    //now we store our metadata object in ifps

    const nftFileMetadataFile = new Moralis.File("metadata.json", {base64 : btoa(JSON.stringify(metaData))});
    await nftFileMetadataFile.saveIPFS();

    //we now saved both the image and metadata to ipfs using moralis creating the foundation for our NFT we need only to tokenize it basically

    const nftFileMetadataFilePath = nftFileMetadataFile.ipfs();
    const nftFileMetadataFileHash = nftFileMetadataFile.hash();

    //we create our nft to be stored on moralis data base under items ///

    //this returns a minted token with id
    const nftId = await mintNft(nftFileMetadataFilePath);

    const Item = Moralis.Object.extend("Item");

    //for the databasee
    const item = new Item();
    item.set('name', createItemNameField.value);
    item.set('description', createItemDescriptionField.value);
    item.set('nftFilePath', nftFilePath);
    item.set('nftFileHash', nftFileHash);
    item.set('nftFileMetadataFilePath', nftFileMetadataFilePath);
    item.set('nftFileMetadataFileHash', nftFileMetadataFileHash);
    item.set('nftId', nftId);
    //we also make it so we show thje main contract address of Magellan whichj all the ERC721 tokens are using
    item.set('nftContractAddress', TOKEN_CONTRACT_ADDRESS);
    await item.save();
    console.log(item);

    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');

    //I compeltely forgot about these switch methods
    //we could implement a bidding method here in the interface 
    switch(createItemStatusField.value) {
        case "0":
            return;
        case "1":
            await ensureMarketPlaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
            //you can always come back and see how you puth these solidity and jhavascript together //send from user address bring up metamask
            //we added our item to our market here 
            await marketPlaceContract.methods.addItemToMarket(nftId, TOKEN_CONTRACT_ADDRESS, createItemPriceField.value).send({from: userAddress});
            break;
        case "2":
            alert("not yet supported");
            return;
    }
}

//here is our minting function
mintNft = async(metaDataURL) => {

    //here is how we get the metadata into the token contract
    //there are multipole ways to create an nft but we used the ERC721 standard - its essentially just unique ID's mapped to an address and URI
    //in the token contract we mapped the ID to an item with an address a uri and that ID creating our nft
    //this last method send i think takes inputs form the abi im pretty sure
    //this method should pop up metamask because we interacting sending something to the blockchain 
    //need to access specific dat from within the contract - this is how we write to the smart contract 
    const receipt = await tokenContract.methods.createItem(metaDataURL).send({from: ethereum.selectedAddress});
    console.log(receipt);
    //the safemint will call mint which emits an event that returns a token ID
    return receipt.events.Transfer.returnValues.tokenId;

}

openUserItems = async() => {

    //if we are logged in this will bne defined if we are not it will be undefined
    user = await Moralis.User.current(); //using this we can get the current user and laod them into the user object
    if(user) {

        showElement(userItemsSection);

    }else{

        //we call login because they are probably not logged in if they cant access user info username given 
        login();
    }
}

//here we run and access our cloud function

loadUserItems = async () => {
    //here we have our endpoints for the cloud function
    //comment this out and see if you are able to even retrieve the data, I knbow I am because I have done it
    const ownedItems = await Moralis.Cloud.run("getUserItems");
    //gets all the logged nfts 

    ownedItems.forEach(item => {
        getAndRenderItemData(item, renderUserItem);
    });

    //console.log(ownedItems);

}

//generic function to work with a variety of template and template types
initTemplate = (id) => {
    const template = document.getElementById(id);
    //we make the original id now equal toi nothing
    template.id = "";
    //we remove ourselves from the html document and store the variable
    template.parentNode.removeChild(template);
    return template;
}

renderUserItem = (item) => {
    //passing in true gives you the whole strucuture //we basically copy oppur stored template
    const userItem = userItemTemplate.cloneNode(true); //we do a deep clone with the true and get the whole structure of the given template

    //we get all the elements of our template 
    userItem.getElementsByTagName("img")[0].src = item.image;
    userItem.getElementsByTagName("img")[0].alt = item.name;
    userItem.getElementsByTagName("h5")[0].innerText = item.name;
    userItem.getElementsByTagName("p")[0].innerText = item.description;
    //we append the cloned template with data filled in to our userItems div tag
    userItems.appendChild(userItem);
   
}


//convert the metadata into data we can interpret and render
getAndRenderItemData = (item, renderFunction) => {
    fetch(item.tokenUri)
    //we convert the data into json then we work with the object
    .then(response => response.json())
    .then(data => {
        //adding new variables to our data object 
        data.symbol = item.symbol;
        data.symbol = item.tokenId;
        data.symbol = item.tokenAddress;
        renderFunction(data);
    });
    
}

//this is a check to enrue it has bveen approved
ensureMarketPlaceIsApproved = async (tokenId, tokenAddress) => {
    user = await Moralis.User.current();
    const userAddress = user.get('ethAddress');
    //we created a new instance of moralis contract here 
    const contract = new web3.eth.Contract(marketplaceContractAbi, MARKETPLACE_CONTRACT_ADDRESS);
    const approvedAddress = await contract.methods.getApproved(tokenId).call({from: userAddress});
    if(approvedAddress != MARKETPLACE_CONTRACT_ADDRESS) {
        await contract.methods.approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId).send({from: userAddress});
    }

}

//helper methods onle line functions
hideElement = (element) => element.style.display = "none";
showElement = (element) => element.style.display = "block";

//html references

const userConnectButton = document.getElementById("btnConnect");
userConnectButton.onclick = login; ///here we initialize the login button

const userProfileButton = document.getElementById("btnUserInfo");
//userProfileButton.onclick = showElement(userInfo);
//userProfileButton.onclick = openUserInfo();
//so we cant call a function with parameters i guess???
userProfileButton.onclick = openUserInfo; //so thats weird for some reason adding the parenthisis made this function not work error?
//here we have to make an inline function for this to work
//all your have to do to make an inline function or an arrow function is really name of function = () => equal to whatever functrion 

//you could implelment some functionality to close the profile button when tapped again if open close on click might do an in line function 

const userInfo = document.getElementById("userInfo");

const userUsernameField = document.getElementById("txtUsername");
const userEmailField = document.getElementById("txtEmail");
const userAvatarImage = document.getElementById("imgAvatar");
const userAvatarFile = document.getElementById("fileAvatar");

document.getElementById("btnCloseUserInfo").onclick = () => hideElement(userInfo);
//we can set onclick = to another function or we can have it do something by creating an inline function or function in code but we can notr make it eqaul to function calls

//logout html connection
document.getElementById("btnLogout").onclick = logOut;

document.getElementById("btnSaveUserInfo").onclick = saveUserInfo;

//create nft buttons 

const createItemForm = document.getElementById("createItem");

const createItemNameField = document.getElementById("txtCreateItemName");
const createItemDescriptionField = document.getElementById("txtCreateItemDescription");
const createItemPriceField = document.getElementById("numCreateItemPrice");
const createItemStatusField = document.getElementById("selectCreateItemStatus");
const createItemFile = document.getElementById("fileCreateItemFile");

const openCreateItemButton = document.getElementById("btnOpenCreateItem");
openCreateItemButton.onclick = () =>  showElement(createItemForm);

document.getElementById("btnCloseCreateItem").onclick = () => hideElement(createItemForm);
//hideElement(userProfileButton);
document.getElementById("btnCreateItem").onclick = createItem;
//theres an onclose button in javascript or on double click?

//user items
const userItemsSection = document.getElementById("userItems");
//this is what i got stuck on its so obvious that you needed to do append it to the actual section or div thats what appendChild does 
const userItems = document.getElementById("userItemsList");

document.getElementById("btnCloseUserItems").onclick = () => hideElement(userItemsSection);
const openUserItemsButton = document.getElementById("btnMyItems");
openUserItemsButton.onclick = openUserItems;

//item template -- so basically we remove it from the html document but then store the structure in this variable
//stored template
const userItemTemplate = initTemplate("itemTemplate");

init();