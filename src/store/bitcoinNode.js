import React, {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Just, Nothing } from 'folktale/maybe';

import { includes } from 'lodash';

import * as kg from 'urbit-key-generation';

import ProxySocket from 'bcoin/browser/src/proxysocket';
import * as BCoin from 'bcoin/lib/bcoin-browser';
import Logger from 'blgr';

import { BITCOIN_NETWORK_TYPES } from '../lib/bitcoinNetwork';
import { isDevelopment } from '../lib/flags';
import { BRIDGE_ERROR } from '../lib/error';

function _useNode(initialNetworkType = null) {
  const [networkType, _setNetworkType] = useState(initialNetworkType);

  const setNetworkType = networkType => {
    if (!includes(BITCOIN_NETWORK_TYPES, networkType)) {
      throw new Error(BRIDGE_ERROR.INVALID_NETWORK_TYPE);
    }
    _setNetworkType(networkType);
  };

  const { node } = useMemo(() => {
    // https://github.com/bcoin-org/bcoin/issues/823#issuecomment-522115984
    // It's currently necessary to include the accountKey to
    // create the wallet as there isn't a way to specify the
    // derivation strategy for wallets yet. The account key
    // is at the derivation path m'/44'/0'/0'.
    // const mnemonic = BCoin.Mnemonic.fromPhrase(phrase);
    // const hdpriv = BCoin.HDPrivateKey.fromMnemonic(mnemonic);
    // const accountPriv = hdpriv.derive(44, true).derive(0, true).derive(0, true);
    // const accountKey = accountPriv.xpubkey(network.type);

    const initBitcoin = (network) => {
      console.log(network);
      const node = new BCoin.SPVNode({
        hash: true,
        query: true,
        prune: true,
        network: network,
        memory: false,
        coinCache: 30,
        logConsole: true,
        workers: true,
        selfish: true,
        workerFile: 'bcoin/lib/workers/worker.js',
        createSocket: (port, host) => {
          const proto = process.env.REACT_APP_BITCOIN_PROXY_PROTO === 'https:' ? 'wss' : 'ws';
          const proxy = process.env.REACT_APP_BITCOIN_PROXY_HOST;
          const proxyPort = process.env.REACT_APP_BITCOIN_PROXY_PORT;
          return ProxySocket.connect(`${proto}://${proxy}:${proxyPort}`, port, host);
        },
        logger:  new Logger({
          level: 'info',
          console: true
        }),
        plugins: [BCoin.wallet.plugin]
      });

      return {
        node: node
      };
    };

    switch (networkType) {
      case BITCOIN_NETWORK_TYPES.REGTEST: {
        BCoin.set('regtest');
        return initBitcoin('regtest');
      }
      case BITCOIN_NETWORK_TYPES.TESNTNET: {
        BCoin.set('testnet');
        return initBitcoin('testnet');
      }
      case BITCOIN_NETWORK_TYPES.MAINNET: {
        BCoin.set('main');
        return initBitcoin('main');
      }
      default: {
        BCoin.set('testnet');
        return initBitcoin('testnet');
      }
    }
  }, [networkType]);

  return { networkType, setNetworkType, node};
}

const BitcoinNodeContext = createContext(null);

// provider
export function BitcoinNodeProvider({ initialBitcoinNetworkType, children }) {
  const value = _useNode(initialBitcoinNetworkType);
  return (
    <BitcoinNodeContext.Provider value={value}>{children}</BitcoinNodeContext.Provider>
  );
}

// hook consumer
export function useNode() {
  return useContext(BitcoinNodeContext);
}

// hoc consumer
export const withBitcoinNode = Component =>
  forwardRef((props, ref) => {
    return (
      <BitcoinNodeContext.Consumer>
        {value => <Component ref={ref} {...value} {...props} />}
      </BitcoinNodeContext.Consumer>
    );
  });
