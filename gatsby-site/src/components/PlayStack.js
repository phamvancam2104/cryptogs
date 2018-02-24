import React, { Component } from 'react';
import Stack from '../components/Stack.js'
import StackSelect from '../components/StackSelect.js'

let loadInterval
const GWEI = 1

class PlayStack extends Component {
  constructor(props) {
    super(props);
    this.state = {
      stack:props.match.params.stack,
      counterStacks:[]
    }
    this.loadStackData()
    loadInterval = setInterval(this.loadStackData.bind(this),707)
  }
  componentWillUnmount(){
    clearInterval(loadInterval)
  }
  async loadStackData(){
    let stack
    let {contracts,web3} = this.props.context
    //console.log("contracts",contracts)
    let update = {}

    update.stackData = await contracts['Cryptogs'].methods.getStack(this.state.stack).call()
    for(let t=1;t<=5;t++){
      let token = await contracts['Cryptogs'].methods.getToken(update.stackData["token"+t]).call()//this.state.allStacks[id]
      update.stackData["token"+t+"Image"] = web3.utils.toAscii(token.image).replace(/[^a-zA-Z\d\s.]+/g,"")
    }
    update.stackMode = await contracts['Cryptogs'].methods.mode(this.state.stack).call()


    if(update.stackMode==0){
      let counterStackEvents = await contracts['Cryptogs'].getPastEvents("CounterStack", {
        filter: {_stack: this.state.stack},
        fromBlock: contracts['Cryptogs'].blockNumber,
        toBlock: 'latest'
      });
      let counterStacks = []
      for(let e in counterStackEvents){
        let thisStackData = await contracts['Cryptogs'].methods.getStack(counterStackEvents[e].returnValues._counterStack).call()
        for(let t=1;t<=5;t++){
          let token = await contracts['Cryptogs'].methods.getToken(thisStackData["token"+t]).call()//this.state.allStacks[id]
          thisStackData["token"+t+"Image"] = web3.utils.toAscii(token.image).replace(/[^a-zA-Z\d\s.]+/g,"")
        }
        thisStackData._counterStack = counterStackEvents[e].returnValues._counterStack
        counterStacks.push(thisStackData)
      }

      update.counterStacks = counterStacks
    }else{
      update.lastBlock = await contracts['Cryptogs'].methods.lastBlock(this.state.stack).call()
      update.lastActor = await contracts['Cryptogs'].methods.lastActor(this.state.stack).call()
      update.TIMEOUTBLOCKS = await contracts['Cryptogs'].methods.TIMEOUTBLOCKS().call()
      let acceptCounterStackEvents = await contracts['Cryptogs'].getPastEvents("AcceptCounterStack", {
        filter: {_stack: this.state.stack},
        fromBlock: contracts['Cryptogs'].blockNumber,
        toBlock: 'latest'
      });
      for(let e in acceptCounterStackEvents){
        update.counterStack = acceptCounterStackEvents[e].returnValues._counterStack
      }
    }

    if(update.stackMode>2){
      //  event ThrowSlammer(bytes32 indexed stack, bool success, address whoDoneIt, uint32 blockNumber, bool token1Flipped, bool token2Flipped, bool token3Flipped, bool token4Flipped, bool token5Flipped, bool token6Flipped, bool token7Flipped, bool token8Flipped, bool token9Flipped, bool token10Flipped);

      let throwSlammerEvents = await contracts['Cryptogs'].getPastEvents("ThrowSlammer", {
        filter: {stack: this.state.stack},
        fromBlock: contracts['Cryptogs'].blockNumber,
        toBlock: 'latest'
      });
      update.throwSlammerEvents = []
      for(let e in throwSlammerEvents){
        update.throwSlammerEvents.push(throwSlammerEvents[e].returnValues)
      }
    }



    this.setState(update)
  }
  acceptStack(counterStack){
    console.log("ACCEPT",this.state.stack,counterStack)
    let {contracts,account} = this.props.context
    //acceptCounterStack(address _slammerTime, bytes32 _stack, bytes32 _counterStack)
    contracts["Cryptogs"].methods.acceptCounterStack(contracts["SlammerTime"]._address,this.state.stack,counterStack).send({
      from: account,
      gas:1000000,
      gasPrice:GWEI * 1000000000
    },(error,hash)=>{
      console.log("CALLBACK!",error,hash)
    }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
      console.log("RESULT:",receipt)
    })
    this.setState({counterStack:counterStack})
  }
  startCoinFlip(){
    console.log("START COIN FLIP",this.state.stack,this.state.counterStack)
    let {contracts,account,web3} = this.props.context

    let commit = web3.utils.sha3(Math.random()+this.state.account+"COINFLIP!")
    console.log("commit:",commit)
    let commitHash = web3.utils.sha3(commit)
    console.log("commitHash:",commitHash)

    this.setState({commit:commit})

    //startCoinFlip(bytes32 _stack, bytes32 _counterStack, bytes32 _commit)
    contracts["Cryptogs"].methods.startCoinFlip(this.state.stack,this.state.counterStack,commitHash).send({
        from: account,
        gas:150000,
        gasPrice:GWEI * 1000000000
      },(error,hash)=>{
        console.log("CALLBACK!",error,hash)
      }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
        console.log("RESULT:",receipt)
      })
  }
  endCoinFlip(){
    console.log("END COIN FLIP",this.state.stack,this.state.counterStack,this.state.commit)
    let {contracts,account,web3} = this.props.context

    let reveal = this.state.commit
    //if reveal isn't saved in the state, send 0's to start over with the coin flip
    if(!reveal) reveal = "0x0000000000000000000000000000000000000000000000000000000000000000"

    //endCoinFlip(bytes32 _stack, bytes32 _counterStack, bytes32 _reveal)
    contracts["Cryptogs"].methods.endCoinFlip(this.state.stack,this.state.counterStack,reveal).send({
        from: account,
        gas:150000,
        gasPrice:GWEI * 1000000000
      },(error,hash)=>{
        console.log("CALLBACK!",error,hash)
      }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
        console.log("RESULT:",receipt)
      })
  }
  raiseSlammer(){
    console.log("raiseSlammer",this.state.stack,this.state.counterStack)
    let {contracts,account,web3} = this.props.context

    let commit = web3.utils.sha3(Math.random()+this.state.account+"SLAMMERTIMEJABRONIES!")
    console.log("commit:",commit)
    let commitHash = web3.utils.sha3(commit)
    console.log("commitHash:",commitHash)

    this.setState({commit:commit})

    //raiseSlammer(bytes32 _stack, bytes32 _counterStack, bytes32 _commit)
    contracts["Cryptogs"].methods.raiseSlammer(this.state.stack,this.state.counterStack,commitHash).send({
        from: account,
        gas:150000,
        gasPrice:GWEI * 1000000000
      },(error,hash)=>{
        console.log("CALLBACK!",error,hash)
      }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
        console.log("RESULT:",receipt)
      })
  }
  throwSlammer(){
    console.log("throwSlammer",this.state.stack,this.state.counterStack,this.state.commit)
    let {contracts,account,web3} = this.props.context

    let reveal = this.state.commit
    //if reveal isn't saved in the state, send 0's to start over with the coin flip
    if(!reveal) reveal = "0x0000000000000000000000000000000000000000000000000000000000000000"

    //raiseSlammer(bytes32 _stack, bytes32 _counterStack, bytes32 _commit)
    contracts["Cryptogs"].methods.throwSlammer(this.state.stack,this.state.counterStack,reveal).send({
        from: account,
        gas:500000,
        gasPrice:GWEI * 1000000000
      },(error,hash)=>{
        console.log("CALLBACK!",error,hash)
      }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
        console.log("RESULT:",receipt)
      })
  }
  drainStack(){
    let {contracts,account} = this.props.context
    console.log("drainStack",this.state.stack,this.state.counterStack)
    contracts["Cryptogs"].methods.drainStack(this.state.stack,this.state.counterStack).send({
      from: account,
      gas:500000,
      gasPrice:GWEI * 1000000000
    },(error,hash)=>{
      console.log("CALLBACK!",error,hash)
    }).on('error',(a,b)=>{console.log("ERROR",a,b)}).then((receipt)=>{
      console.log("RESULT:",receipt)
    })
  }
  render(){
    let {account,blockNumber} = this.props.context
    let {stackMode,stackData,counterStacks,lastBlock,lastActor,TIMEOUTBLOCKS,flipEvents,throwSlammerEvents} = this.state;
    if(!stackData){
      return (
        <div style={{opacity:0.3}}>Loading...</div>
      )
    }

    let flipDisplay = ""

    if(throwSlammerEvents && throwSlammerEvents.length>0){
      flipDisplay = throwSlammerEvents.map((throwSlammerEvent)=>{
        let flipped = []
        for(let i=1;i<=10;i++){
          if(throwSlammerEvent['token'+i+'Flipped']){
            flipped.push(
              <span>
                #{i}
              </span>
            )
          }
        }
        let who = ""
        if(throwSlammerEvent.whoDoneIt.toLowerCase()==account.toLowerCase()){
          if(flipped.length>0){
            who = "You Flipped:"
          }else{
            if(throwSlammerEvent.success){
              who = "You Wiffed"
            }else{
              who = "Your throw failed, try again."
            }

          }

        }else{
          if(flipped.length>0){
            who = "They Flipped"
          }else{
            if(throwSlammerEvent.success){
              who = "They Wiffed"
            }else{
              who = "Their throw failed, trying again."
            }
          }
        }
       return (
         <div>
         <span>#{throwSlammerEvent.blockNumber}</span>
         <span style={{margin:5}}>{who}</span>
         {flipped}

         </div>
       )
     })
   }

    let display = ""
    if(stackMode==0){

      let stackDisplay = (
        <Stack key={"mainstack"} {...stackData}/>
      )


      let drawCounterStacks = counterStacks.map((counterstack)=>{
        let callToAction
        console.log("get id from ",counterstack)
        if(account.toLowerCase()==stackData.owner.toLowerCase()){
          callToAction=(
            <button onClick={this.acceptStack.bind(this,counterstack._counterStack)}>accept</button>
          )
        }
        return (
            <Stack key={"counterstack"+counterstack._counterStack} {...counterstack} callToAction={callToAction}/>
        )
      })

      let message
      let portInfo = ""
      if(window.location.port!="80"){
        portInfo=":"+window.location.port
      }
      if(account.toLowerCase()==stackData.owner.toLowerCase()){
        if(drawCounterStacks.length>0){
          message = ""
          message = (
            <div>
              <div style={{padding:10,paddingTop:20}}>Share game url:</div>
              <pre id="url" onClick={selectText}>{window.location.protocol+"//"+window.location.hostname+portInfo+"/join/"+this.state.stack}</pre>
              <div style={{padding:10,paddingTop:20}}>{"Accept an opponent's stack:"}</div>
            </div>
          )
        }else{
          message = (
            <div>
              <div style={{padding:10,paddingTop:20}}>Waiting for other players to join, share game url to challenge your friends:</div>
              <pre id="url" onClick={selectText}>{window.location.protocol+"//"+window.location.hostname+portInfo+"/join/"+this.state.stack}</pre>
            </div>
          )
        }
      }else{
        message = "Waiting for game creator to accept your stack..."
      }

      display = (
        <div>
          {stackDisplay}
          <div>{message}</div>
          {drawCounterStacks}
        </div>
      )
    }else if(stackMode==1){
      if(account.toLowerCase()==stackData.owner.toLowerCase()){
        display = (
          <div>
            <button onClick={this.startCoinFlip.bind(this)}>startCoinFlip</button>
          </div>
        )
      }else{
        display = (
          <div>
            Waiting for coin flip...
          </div>
        )
      }

    }else if(stackMode==2){
      if(account.toLowerCase()==stackData.owner.toLowerCase()){
        display = (
          <div>
            <button onClick={this.endCoinFlip.bind(this)}>endCoinFlip</button>
          </div>
        )
      }else{
        display = (
          <div>
            Waiting for coin flip to land...
          </div>
        )
      }
    }else if(stackMode==3){
      if(account.toLowerCase()==lastActor.toLowerCase()){
        display = (
          <div>
            Waiting for other player to raise slammer...
          </div>
        )
      }else{
        display = (
          <div>
            <button onClick={this.raiseSlammer.bind(this)}>raiseSlammer</button>
          </div>
        )

      }
    }else if(stackMode==4){
      if(account.toLowerCase()==lastActor.toLowerCase()){
        display = (
          <div>
            Waiting for other player to throw slammer...
          </div>
        )
      }else{
        display = (
          <div>
            <button onClick={this.throwSlammer.bind(this)}>throwSlammer</button>
          </div>
        )

      }
    }else if(stackMode==9){

        display = (
          <div>
            Game has finished
          </div>
        )

    }else{
      display = (
        <div>PLAY</div>
      )
    }

    let timerDisplay = ""
    if(lastBlock&&lastActor){

      let turn
      if(account.toLowerCase()==lastActor.toLowerCase()){
        turn = "Their Turn"
      }else{
        turn = "Your Turn"
      }

      let drainDisplay = ""
      drainDisplay = (
        <button onClick={this.drainStack.bind(this)}>drain</button>
      )

      timerDisplay = (
        <div style={{float:'right'}}>
          <div>{blockNumber-lastBlock}/{TIMEOUTBLOCKS}</div>
          <div>{drainDisplay}</div>
          <div>{turn}</div>
        </div>
      )
    }

    let modeDisplay = ""
    if(stackMode>0&&stackMode<9){
      modeDisplay = (
        <div style={{float:'right'}}>mode:{stackMode}</div>
      )
    }

    return (
      <div>
      {modeDisplay}
      {timerDisplay}
      <div style={{position:'fixed',bottom:20,right:20,backgroundColor:"#eeeeee",padding:20}}>
        {flipDisplay}
      </div>
      {display}
      </div>
    )

  }
}
export default PlayStack;


function selectText() {
    let containerid = "url"
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
}