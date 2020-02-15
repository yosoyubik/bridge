import React, { useCallback, useState } from 'react';
import cn from 'classnames';
import { Just } from 'folktale/maybe';
import { Grid, Flex, Button, Text } from 'indigo-react';
import { azimuth } from 'azimuth-js';

import { usePointCursor } from 'store/pointCursor';
import { useWallet } from 'store/wallet';
import { useNode } from 'store/bitcoinNode';

import View from 'components/View';
import { ForwardButton } from 'components/Buttons';
import Blinky, { matchBlinky } from 'components/Blinky';
import BarGraph from 'components/BarGraph';
import Chip from 'components/Chip';
import { GenerateButton } from 'components/Buttons';
import LoadingBar from 'components/LoadingBar';

import { useLocalRouter } from 'lib/LocalRouter';

import Inviter from 'views/Invite/Inviter';

export const SYNC_PROGRESS = {
  CONNECTING: 0.3,
  DONE: 1.0,
};

export default function BitcoinHome() {
  const { pop, push, names } = useLocalRouter();

  const { node } = useNode();
  const [progress, setProgress] = useState(0);
  const isDone = progress >= 1.0;

  function printInfo() {
    getInfo(node);
  }

  function getPeers(node) {
    const peers = [];

    for (let peer = node.pool.peers.head(); peer; peer = peer.next) {
      peer.getName();

      peers.push({
        addr: peer.hostname(),
        subver: peer.agent,
        bytessent: peer.socket.bytesWritten,
        bytesrecv: peer.socket.bytesRead
      });
    }

    console.log(peers);
  }

  function getInfo(node) {
    const totalTX = node.mempool ? node.mempool.map.size : 0;
    const size = node.mempool ? node.mempool.getSize() : 0;

    let addr = node.pool.hosts.getLocal();
    if (!addr)
      addr = node.pool.hosts.address;

    const info =
    {
      network: node.network.type,
      chain: {
        height: node.chain.height,
        tip: node.chain.tip.rhash(),
        progress: node.chain.getProgress()
      },
      pool: {
        host: addr.host,
        port: addr.port,
        agent: node.pool.options.agent,
        services: node.pool.options.services.toString(2),
        outbound: node.pool.peers.outbound,
        inbound: node.pool.peers.inbound
      },
      mempool: {
        tx: totalTX,
        size: size
      }
    };
    setProgress(info.chain.progress);
    console.log(info);
  }

  const connectToNode = () => {
    console.log('connecting', node);
    node.chain.on('block connect', function (item, entry) {
      console.log('block', entry);
    });

    node.chain.on('checkpoint', function (hash, height) {
      console.log(hash, height);
    });

    node.chain.on('full', function () {
      console.log('full sync');
      setProgress(1.0);
    });

    (async () => {
      await node.ensure();
      await node.open();
      await node.connect();
      node.startSync();

      node.on('connect', () => {getInfo(node)});

      node.pool.on('peer connect', () => {getPeers(node)});
      // node.pool.on('peer close', () => {getPeers()});
      // node.pool.on('peer open', () => {getPeers()});
      // node.pool.on('packet', () => {getPeers()});
    })().catch((err) => {
      console.log(err);
      throw err;
    });
  };

  return (
    <>
      {isDone ? (
        <>
          <Grid.Item
            full
            as={Text}
            className={cn('f5 wrap', {
              green3: isDone,
            })}>
            Your browser SPV Node is fully sync with the Bitcoin Blockchain.
            <div>{node.chain.height}</div>
            <div>{node.chain.tip.rhash()}</div>
          </Grid.Item>
        </>
      ) : (
        <>
          <Grid.Item full as={Grid} className="mt4" gap={3}>
            <Grid.Item
              full
              as={GenerateButton}
              onClick={connectToNode}
              disabled={isDone}
              loading={!isDone && progress > 0}
              detail="Connects an SPV node to the Bitcoin Network.">
              Sync SPV
            </Grid.Item>
            <Grid.Item full as={LoadingBar} progress={progress} />
          </Grid.Item>

        </>
      )}


      <Grid.Divider />
      <Grid.Item
        as={ForwardButton}
        disabled={!isDone}
        full
        detail="Bitcoin balance as individual UTXOs">
        Display balance
      </Grid.Item>
      <Grid.Divider />
      <Grid.Item
        full
        as={ForwardButton}
        disabled={!isDone}
        detail="Generate new addresses to receive Bitcoin">
        New addresses
      </Grid.Item>
      <Grid.Divider />
      <Grid.Item
        full
        as={ForwardButton}
        disabled={!isDone}
        detail="Signs and broadcasts transactions to the network">
        New Transaction
      </Grid.Item>
      <Grid.Divider />
      <Grid.Item
        full
        as={GenerateButton}
        onClick={printInfo}
        detail="Display network info">
        Blockchain info
      </Grid.Item>
      </>
    );
}
