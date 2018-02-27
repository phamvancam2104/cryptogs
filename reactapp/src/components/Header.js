import React from 'react'
import createClass from 'create-react-class';
import PropTypes from 'prop-types';
import Metamask from '../components/MetaMask.js'
import {Motion, spring, presets} from 'react-motion';

export default createClass({
	render(){
		let {metamaskHint,account,metaMaskHintFn} = this.props
		return (
      <div style={{background: '#F9F9F9',marginBottom: '1.45rem'}}>
				<Motion
				defaultStyle={{
					marginLeft:10
				}}
				style={{
					marginLeft:spring(metamaskHint,{ stiffness: 100, damping: 6 })
				}}
				>
					{currentStyles => {
						return <Metamask {...this.props} currentStyles={currentStyles}/>
					}}
				</Motion>
				<h1 style={{ float:"right",padding:10 ,letterSpacing:-1.8}}>
					<a href="/" style={{color: '#333333',textDecoration: 'none'}}>
						CryptoPogs
					</a>
				</h1>
        <div style={{margin: '0 auto',maxWidth: 960,height: 70,padding:10,textAlign:'right'}}>
					<h4 style={{marginTop:20,letterSpacing:-0.8}}>
						<a onClick={()=>{
							if(account){
								window.location = "/address/"+account
							}else{
								metaMaskHintFn()
							}
						}} style={{color: '#666666',padding:10, cursor:"pointer"}}>
							My Pogs
						</a>
						<a href="/stacks" style={{color: '#666666',padding:10}}>
							Play Pogs
						</a>
						<a href="/" style={{color: '#666666',padding:10}}>
							Buy Pogs
						</a>
					</h4>
        </div>
      </div>
    )
	}
});
