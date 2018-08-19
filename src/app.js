import Promise from 'bluebird'
import _ from 'lodash'
import md5 from 'md5'
import createLiability, { sendResult } from './creator'

let members = []
let timeoutBlocks = 0
let keepaliveBlock = 0
let marker = 0
let quota = 0
let currentBlock = 0
let providerEnable = false
let providerStatus = 0
let lastUpd = 0
let balance = 0

let asks = {}
let bids = {}
const match = (ask = null, bid = null) => {
  let h
  if (bid) {
    h = md5([bid.model, bid.objective, bid.token, bid.cost])
    if (!_.has(bids, h)) {
      bids[h] = bid
    }
  } else {
    h = md5([ask.model, ask.objective, ask.token, ask.cost])
    if (!_.has(asks, h)) {
      asks[h] = ask
    }
  }
  if (_.has(asks, h) && _.has(bids, h)) {
    const ask = asks[h]
    const bid = bids[h]
    asks = _.omit(asks, h);
    bids = _.omit(bids, h);
    console.log('match', {
      promisee: ask.account,
      promisor: bid.account,
      model: ask.model,
      objective: ask.objective,
      token: ask.token,
      cost: ask.cost,
    });
    return [ask, bid]
  }
  return false
}

const wathBalance = (robonomics) => {
  balance = Number(robonomics.web3.fromWei(robonomics.web3.eth.getBalance(robonomics.account)))
  if (balance < 0.001) {
    providerEnable = false
    providerStatus = 2
  }
  setTimeout(() => {
    wathBalance(robonomics)
  }, 10000);
}

const showInfo = () => {
  console.log('===================');
  if (providerStatus === 0) {
    console.log('load app');
  } else if (providerStatus === 2) {
    console.log('balance', balance + ' ETH');
  } else if (providerStatus === 3) {
    console.log('timeoutBlocks', timeoutBlocks);
    console.log('keepaliveBlock', keepaliveBlock);
    console.log('marker', marker);
    console.log('quota', quota);
  } else if (providerStatus === 4) {
    console.log('not found member');
    console.log('members', members);
  }
}

const watchBlock = (robonomics) => {
  const getStatusEnable = () => {
    const member = _.find(members, { address: robonomics.account })
    // я есть в работниках
    if (member) {
      if (balance < 0.001) {
        providerEnable = false
        providerStatus = 2
      } else if (timeoutBlocks < currentBlock - keepaliveBlock) { // если истек таймаут
        providerEnable = true
        providerStatus = 1
      } else if (member.i === marker && quota > 0) { // у меня маркер и есть квота
        providerEnable = true
        providerStatus = 1
      } else {
        providerEnable = false
        providerStatus = 3
      }
    } else {
      providerEnable = false
      providerStatus = 4
    }
  }

  const fetchData = () => {
    return Promise.join(
      robonomics.lighthouse.call('quota'),
      robonomics.lighthouse.call('marker'),
      robonomics.lighthouse.call('keepaliveBlock'),
      robonomics.lighthouse.call('timeoutBlocks'),
      (...info) => {
        quota = Number(info[0])
        marker = Number(info[1])
        keepaliveBlock = Number(info[2])
        timeoutBlocks = Number(info[3])
      }
    )
      .then(() => robonomics.lighthouse.getMembers())
      .then((result) => {
        members = []
        const quotas = []
        result.forEach((member, i) => {
          members.push({
            i,
            address: member,
            quota: 0
          })
          quotas.push(robonomics.lighthouse.call('quotaOf', [member]))
        })
        return Promise.all(quotas)
      })
      .then((res) => {
        res.forEach((quota, i) => {
          members[i].quota = Number(quota)
        })
        members = _.sortBy(members, 'i')
      })
  }

  const setCurrentBlock = () => {
    robonomics.web3.eth.getBlockNumber((e, r) => {
      currentBlock = r
      if (currentBlock !== lastUpd) {
        fetchData().then(() => getStatusEnable())
        lastUpd = currentBlock
      }
      setTimeout(setCurrentBlock, 10000)
    })
  }
  setCurrentBlock()
}

export default async (robonomics) => {
  console.log('account', robonomics.account);
  console.log('xrt', robonomics.xrt.address);
  console.log('factory', robonomics.factory.address);
  console.log('lighthouse', robonomics.lighthouse.address);

  wathBalance(robonomics)
  watchBlock(robonomics)

  const market = null

  robonomics.getBid(market, (msg) => {
    console.log('bid', {
      account: msg.account,
      model: msg.model,
      objective: msg.objective,
      token: msg.token,
      cost: msg.cost,
    });
    const askbid = match(null, msg)
    if (askbid) {
      if (providerEnable) {
        createLiability(robonomics, askbid[0], askbid[1])
      } else {
        showInfo()
      }
    }
  })
  robonomics.getAsk(market, (msg) => {
    console.log('ask', {
      account: msg.account,
      model: msg.model,
      objective: msg.objective,
      token: msg.token,
      cost: msg.cost,
    });
    const askbid = match(msg)
    if (askbid) {
      if (providerEnable) {
        createLiability(robonomics, askbid[0], askbid[1])
      } else {
        showInfo()
      }
    }
  })
  robonomics.getResult((msg) => {
    console.log('result', {
      account: msg.account,
      liability: msg.liability,
    });
    if (providerEnable) {
      sendResult(robonomics, msg)
    } else {
      showInfo()
    }
  })
}
