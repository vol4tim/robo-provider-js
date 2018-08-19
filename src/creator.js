import abi from 'web3-eth-abi'
import base58 from 'base-58'
import { utils } from 'robonomics-js'
import sendTx from './sendTx'

function encodeAsk(ask) {
  return abi.encodeParameters(
    [ "bytes"
    , "bytes"
    , "address"
    , "uint256"
    , "address"
    , "uint256"
    , "uint256"
    , "bytes32"
    , "bytes"
    ],
    [ utils.web3Beta.utils.bytesToHex(base58.decode(ask.model))
    , utils.web3Beta.utils.bytesToHex(base58.decode(ask.objective))
    , ask.token
    , ask.cost
    , ask.validator
    , ask.validatorFee
    , ask.deadline
    , ask.nonce
    , ask.signature
    ]
  );
}

function encodeBid(bid) {
  return abi.encodeParameters(
    [ "bytes"
    , "bytes"
    , "address"
    , "uint256"
    , "uint256"
    , "uint256"
    , "bytes32"
    , "bytes"
    ],
    [ utils.web3Beta.utils.bytesToHex(base58.decode(bid.model))
    , utils.web3Beta.utils.bytesToHex(base58.decode(bid.objective))
    , bid.token
    , bid.cost
    , bid.lighthouseFee
    , bid.deadline
    , bid.nonce
    , bid.signature
    ]
  );
}

export default async function createLiability(robonomics, ask, bid) {
  sendTx(robonomics, robonomics.lighthouse, 'createLiability', [encodeAsk(ask), encodeBid(bid)], { from: robonomics.account })
    .then((r) => {
      console.log('createLiability tx', r);
    })
    .catch((e) => {
      console.log('createLiability e', e);
    })
}
export function sendResult(robonomics, msg) {
  const finalizeAbi = {"constant":false,"inputs":[{"name":"_result","type":"bytes"},{"name":"_signature","type":"bytes"},{"name":"_agree","type":"bool"}],"name":"finalize","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"};
  const data = abi.encodeFunctionCall(finalizeAbi, [utils.web3Beta.utils.bytesToHex(base58.decode(msg.result)), msg.signature]);
  sendTx(robonomics, robonomics.lighthouse, 'to', [msg.liability, data], { from: robonomics.account })
    .then((r) => {
      console.log('send result', r);
    })
    .catch((e) => {
      console.log('result e', e);
    })
}
