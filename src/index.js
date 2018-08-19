import Web3 from 'web3'
import IPFS from 'ipfs-api'
import Robonomics, { MessageProviderIpfsApi } from 'robonomics-js'
import app from './app'
import config from '../config.json'

const robonomics = new Robonomics({
  web3: new Web3(new Web3.providers.HttpProvider(config.web3)),
  provider: new MessageProviderIpfsApi(new IPFS('localhost', 5001)),
  account: config.account,
  ens: config.ens,
  lighthouse: config.lighthouse,
  version: 1
})

robonomics.ready().then(() => {
  app(robonomics);
})
