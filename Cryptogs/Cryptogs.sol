pragma solidity ^0.4.15;

/*
  https://cryptogs.io
  --Austin Thomas Griffith
  --ETHDenver
*/

import 'NFT.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Cryptogs is NFT, Ownable {

    string public constant name = "Cryptog";
    string public constant symbol = "TOGS";

    string public constant purpose = "ETHDenver";
    string public constant contact = "https://cryptogs.io";

    uint256 public constant RARITYMULTIPLIER = 1000000000000000;

    uint8 public constant FLIPPINESS = 128;

    function Cryptogs() public {
      //0 index should be a blank item owned by no one
      Item memory _item = Item({
        image: ""
      });
      items.push(_item);
    }

    struct Item{
      bytes32 image;
      //perhaps some are harder to flip over?
      //perhaps some have magical metadata?
      //I don't know, it's late and I'm weird
    }

    Item[] private items;

    function mint(bytes32 _image,address _owner) public onlyOwner returns (uint){
      Item memory _item = Item({
        image: _image
      });
      uint256 newId = items.push(_item) - 1;
      _transfer(0, _owner, newId);
      tokensOfImage[items[newId].image]++;
      Mint(items[newId].image,tokenIndexToOwner[newId]);
      return newId;
    }
    event Mint(bytes32 _image,address _owner);

    //lets keep a count of how many of a specific image is created too
    //that will allow us to calculate rarity on-chain if we want
    mapping (bytes32 => uint256) public tokensOfImage;

    function getToken(uint256 _id) public view returns (address owner,bytes32 image) {
      return (
        tokenIndexToOwner[_id],
        items[_id].image
      );
    }

    //we can get the rarity percentage bar off chain by multiplying the div width by
    // rarity(<tokenid>) / RARITYMULTIPLIER
    function rarity(uint256 _id) public constant returns (uint256) {
      return RARITYMULTIPLIER-(RARITYMULTIPLIER * tokensOfImage[items[_id].image])/(items.length - 1);
    }

    uint256 nonce = 0;

    struct Stack{
      address slammerTime;
      //this will be an array of ids but for now just doing one for simplicity
      uint256 id;
      address owner;
    }

    mapping (bytes32 => Stack) public stacks;
    mapping (bytes32 => bytes32) public stackCounter;

    function stackOwner(bytes32 _stack) public constant returns (address owner) {
      return stacks[_stack].owner;
    }

    //tx 1: of a game, player one approves the SlammerTime contract to take their tokens
    //this triggers an event to broadcast to other players that there is an open challenge
    function submitStack(address _slammerTime, uint256 _id, bool _public) public returns (bool) {
      //the sender must own the token
      require(tokenIndexToOwner[_id]==msg.sender);
      //they approve the slammertime contract to take the token away from them
      require(approve(_slammerTime,_id));

      bytes32 stackid = keccak256(nonce++,msg.sender,_id);
      stacks[stackid] = Stack(_slammerTime,_id,msg.sender);

      //the event is triggered to the frontend to display the stack
      //the frontend will check if they want it public or not
      SubmitStack(msg.sender,stackid,_id,_public);
    }
    event SubmitStack(address _sender,bytes32 _stackid,uint256 _token1,bool _public);

    //TODO: cancel stack (unapprove and send a new event so it is removed from frontend display)

    //tx 2: of a game, player two approves the SlammerTime contract to take their tokens
    //this triggers an event to broadcast to player one that this player wants to rumble
    function submitCounterStack(address _slammerTime, bytes32 _stack, uint256 _id) public returns (bool) {
      //the sender must own the token
      require(tokenIndexToOwner[_id]==msg.sender);
      //they approve the slammertime contract to take the token away from them
      require(approve(_slammerTime,_id));
      //the SlammerTimeAddresses need to line up
      require(_slammerTime==stacks[_stack].slammerTime);
      //stop playing with yourself
      require(msg.sender!=stacks[_stack].owner);

      bytes32 stackid = keccak256(nonce++,msg.sender,_id);
      stacks[stackid] = Stack(_slammerTime,_id,msg.sender);
      stackCounter[stackid] = _stack;

      //the event is triggered to the frontend to display the stack
      //the frontend will check if they want it public or not
      CounterStack(msg.sender,_stack,stackid,_id);
    }
    event CounterStack(address _sender,bytes32 _stack, bytes32 _counterStack, uint256 _token1);

    mapping (bytes32 => uint8) public mode;
    mapping (bytes32 => uint32) public lastBlock;
    mapping (bytes32 => address) public lastActor;
    uint256[10] public mixedStack;

    //tx 3: of a game, player one approves counter stack and transfers everything in
    function acceptCounterStack(address _slammerTime, bytes32 _stack, bytes32 _counterStack) public returns (bool) {
      //sender must be owner of stack 1
      require(msg.sender==stacks[_stack].owner);
      //the counter must be a counter of stack 1
      require(stackCounter[_counterStack]==_stack);
      //the SlammerTimeAddresses need to line up
      require(_slammerTime==stacks[_stack].slammerTime);

      //do the transfer
      SlammerTime slammerTimeContract = SlammerTime(_slammerTime);
      require( slammerTimeContract.startSlammerTime(msg.sender,stacks[_stack].id,stacks[_counterStack].owner,stacks[_counterStack].id) );

      //add in a little extra safe stuff just because it's late and my head is fuzzy
      require(tokenIndexToOwner[stacks[_stack].id]==_slammerTime);
      require(tokenIndexToOwner[stacks[_counterStack].id]==_slammerTime);

      //save the block for a timeout
      lastBlock[_stack]=uint32(block.number);
      lastActor[_stack]=stacks[_counterStack].owner;
      mode[_stack]=1;

      mixedStack[0] = stacks[_stack].id;
      mixedStack[1] = stacks[_counterStack].id;

      //let the front end know that the transfer is good and we are ready for the coin flip
      AcceptCounterStack(msg.sender,_stack,_counterStack);
    }
    event AcceptCounterStack(address _sender,bytes32 _stack, bytes32 _counterStack);

    mapping (bytes32 => bytes32) public commit;


    //tx 4: player one commits and flips coin up
    //at this point, the timeout goes into effect and if any transaction including
    //the coin flip don't come back in time, we need to allow the other party
    //to withdraw all tokens... this keeps either player from refusing to
    //reveal their commit. (every tx from here on out needs to update the lastBlock and lastActor)
    //and in the withdraw function you check currentblock-lastBlock > timeout = refund to lastActor
    //and by refund I mean let them withdraw if they want
    //we could even have a little timer on the front end that tells you how long your opponnet has
    //before they will forfet
    function startCoinFlip(bytes32 _stack, bytes32 _counterStack, bytes32 _commit) public returns (bool) {
      //make sure it's the owner of the first stack (player one) doing the flip
      require(stacks[_stack].owner==msg.sender);
      //the counter must be a counter of stack 1
      require(stackCounter[_counterStack]==_stack);
      //make sure that we are in mode 1
      require(mode[_stack]==1);
      //store the commit for the next tx
      commit[_stack]=_commit;
      //inc the mode to 2
      mode[_stack]=2;
      StartCoinFlip(_stack,_commit);
    }
    event StartCoinFlip(bytes32 stack, bytes32 commit);

    //tx5: player one ends coin flip with reveal
    function endCoinFlip(bytes32 _stack, bytes32 _counterStack, bytes32 _reveal) public returns (bool) {
      //make sure it's the owner of the first stack (player one) doing the flip
      require(stacks[_stack].owner==msg.sender);
      //the counter must be a counter of stack 1
      require(stackCounter[_counterStack]==_stack);
      //make sure that we are in mode 2
      require(mode[_stack]==2);

      //make sure hash of reveal == commit
      if(keccak256(_reveal)!=commit[_stack]){
        //commit/reveal failed.. this can happen if they
        //reload, so don't punish, just go back to the
        //start of the coin flip stage
        mode[_stack]==1;
        CoinFlipFail(_stack);
        return false;
      }else{
        //successful coin flip, ready to get random
        mode[_stack]=3;
        bytes32 pseudoRandomHash = keccak256(_reveal,block.blockhash(block.number-1));
        if(uint256(pseudoRandomHash)%2==0){
          //player1 goes first
          lastBlock[_stack]=uint32(block.number);
          lastActor[_stack]=stacks[_counterStack].owner;
          CoinFlipSuccess(_stack,stacks[_stack].owner,true);
        }else{
          //player2 goes first
          lastBlock[_stack]=uint32(block.number);
          lastActor[_stack]=stacks[_stack].owner;
          CoinFlipSuccess(_stack,stacks[_counterStack].owner,false);
        }
        return true;
      }

    }
    event CoinFlipSuccess(bytes32 stack,address whosTurn,bool heads);
    event CoinFlipFail(bytes32 stack);


    //tx6 next player raises slammer
    function raiseSlammer(bytes32 _stack, bytes32 _counterStack, bytes32 _commit) public returns (bool) {
      if(lastActor[_stack]==stacks[_stack].owner){
        //it is player2's turn
        require(stacks[_counterStack].owner==msg.sender);
      }else{
        //it is player1's turn
        require(stacks[_stack].owner==msg.sender);
      }
      //the counter must be a counter of stack 1
      require(stackCounter[_counterStack]==_stack);
      //make sure that we are in mode 3
      require(mode[_stack]==3);
      //store the commit for the next tx
      commit[_stack]=_commit;
      //inc the mode to 2
      mode[_stack]=4;
      RaiseSlammer(_stack,_commit);
    }
    event RaiseSlammer(bytes32 stack, bytes32 commit);


    //tx7 player throws slammer
    function throwSlammer(bytes32 _stack, bytes32 _counterStack, bytes32 _reveal) public returns (bool) {
      if(lastActor[_stack]==stacks[_stack].owner){
        //it is player2's turn
        require(stacks[_counterStack].owner==msg.sender);
      }else{
        //it is player1's turn
        require(stacks[_stack].owner==msg.sender);
      }
      //the counter must be a counter of stack 1
      require(stackCounter[_counterStack]==_stack);
      //make sure that we are in mode 4
      require(mode[_stack]==4);

      if(keccak256(_reveal)!=commit[_stack]){
        //commit/reveal failed.. this can happen if they
        //reload, so don't punish, just go back to the
        //start of the slammer raise
        mode[_stack]=3;
        ThrowSlammerFail(_stack);
        return false;
      }else{
        //successful slam!!!!!!!!!!!! At this point I have officially been awake for 24 hours !!!!!!!!!!
        mode[_stack]=3;
        bytes32 pseudoRandomHash = keccak256(_reveal,block.blockhash(block.number-1));
        if(lastActor[_stack]==stacks[_stack].owner){
          //player1 goes next
          lastBlock[_stack]=uint32(block.number);
          lastActor[_stack]=stacks[_counterStack].owner;
          ThrowSlammerSuccess(_stack,stacks[_stack].owner,pseudoRandomHash);
        }else{
          //player2 goes next
          lastBlock[_stack]=uint32(block.number);
          lastActor[_stack]=stacks[_stack].owner;
          ThrowSlammerSuccess(_stack,stacks[_counterStack].owner,pseudoRandomHash);
        }

        //look through the stack of remaining pogs and compare to byte to see if less than FLIPPINESS and transfer back to correct owner
        // oh man, that smells like reentrance --  I think the mode would actually break that right?
        for(uint8 i=0;i<10;i++){
          if(mixedStack[i]>0){
            //there is still a pog here, check for flip
            if(uint8(pseudoRandomHash[i])<FLIPPINESS){
              //ITS A FLIP!
               Flip(_stack,lastActor[_stack],mixedStack[i]);
               //mixedStack[i]=0;
               //XFER !!!
            }
          }
        }

        return true;
      }
    }

    event Flip(bytes32 stack,address toWhom,uint256 id);
    event ThrowSlammerFail(bytes32 stack);
    event ThrowSlammerSuccess(bytes32 stack, address whosTurn,bytes32 randDebug);

    //TODO make flip actually do transfer, but before that let's tear out SLAMMER TIME contract, I don't think we need it
    // we will just transfer the ownership directly to this contract... so weird.


    function totalSupply() public view returns (uint) {
        return items.length - 1;
    }

    function tokensOfOwner(address _owner) external view returns(uint256[]) {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 total = totalSupply();
            uint256 resultIndex = 0;
            uint256 id;
            for (id = 1; id <= total; id++) {
                if (tokenIndexToOwner[id] == _owner) {
                    result[resultIndex] = id;
                    resultIndex++;
                }
            }
            return result;
        }
    }
}


contract SlammerTime {
  function startSlammerTime(address _player1,uint256 _id1,address _player2,uint256 _id2) public returns (bool) { }
}
