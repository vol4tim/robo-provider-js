#!/usr/bin/env node
import commander from 'commander'
import Web3 from 'web3'
import IPFS from 'ipfs-api'
import Robonomics, { MessageProviderIpfsApi } from 'robonomics-js'
import app from './app'

// npm run local:cli -- --account 0x7543C2418d6b3A475A750022cCd01f378d60Fa95 --ens 0xc5b93d119726fe76141d5db975d1e9a655a735b7 --lighthouse test.lighthouse.0.robonomics.eth

commander
  .option('-a, --account <account>', 'account')
  .option('-e, --ens [ens]', 'ens', null)
  .option('-l, --lighthouse [lighthouse]', 'lighthouse', null)
  .parse(process.argv);

if (commander.account) {
  const robonomics = new Robonomics({
    web3: new Web3(new Web3.providers.HttpProvider('http://localhost:8545')),
    provider: new MessageProviderIpfsApi(new IPFS('localhost', 5001)),
    account: commander.account,
    ens: commander.ens,
    lighthouse: commander.lighthouse,
  })

  robonomics.ready().then(() => {
    app(robonomics);
  })
} else {
  console.error('error: option require -account');
}
