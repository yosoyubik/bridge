import { useCallback, useEffect, useState } from 'react';
import { Just } from 'folktale/maybe';
import { toWei, toBN } from 'web3-utils';

import { useNetwork } from 'store/network';
import { useWallet } from 'store/wallet';
import { usePointCursor } from 'store/pointCursor';

import {
  GAS_LIMITS,
  DEFAULT_GAS_PRICE_GWEI,
  PROGRESS_ANIMATION_DELAY_MS,
} from './constants';
import {
  signTransaction,
  sendSignedTransaction,
  waitForTransactionConfirm,
  hexify,
} from './txn';
import * as need from 'lib/need';
import { ensureFundsFor } from 'lib/tank';
import useDeepEqualReference from 'lib/useDeepEqualReference';
import useGasPrice from 'lib/useGasPrice';
import timeout from 'lib/timeout';

const STATE = {
  NONE: 'NONE',
  SIGNED: 'SIGNED',
  BROADCASTED: 'BROADCASTED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
};

/**
 * manage the state around sending and confirming an ethereum transaction
 * @param {Transaction Function()} transactionBuilder
 * @param {Promise<any> Function()} refetch async function called after completion
 * @param {number} initialGasLimit gas limit
 * @param {number} initialGasPrice gas price in gwei
 */
export default function useEthereumTransaction(
  transactionBuilder,
  refetch,
  initialGasLimit = GAS_LIMITS.DEFAULT,
  initialGasPrice = DEFAULT_GAS_PRICE_GWEI
) {
  const { wallet, walletType, walletHdPath } = useWallet();
  const { web3, networkType } = useNetwork();
  const { pointCursor } = usePointCursor();

  const _web3 = need.web3(web3);
  const _wallet = need.wallet(wallet);

  const [error, _setError] = useState();
  const setError = useCallback(
    error => {
      _setError(error);
      if (error) {
        console.error(error);
      }
    },
    [_setError]
  );
  const [state, setState] = useState(STATE.NONE);
  const [chainId, setChainId] = useState();
  const [nonce, setNonce] = useState();
  const { gasPrice, setGasPrice, resetGasPrice } = useGasPrice(initialGasPrice);
  const [gasLimit] = useState(initialGasLimit);
  const [unsignedTransaction, setUnsignedTransaction] = useState();
  const [signedTransaction, setSignedTransaction] = useState();
  const [txHash, setTxHash] = useState();
  const [needFunds, setNeedFunds] = useState();
  const [confirmationProgress, setConfirmationProgress] = useState(0.0);

  const initializing = nonce === undefined || chainId === undefined;
  const constructed = !!unsignedTransaction;
  const isDefaultState = state === STATE.NONE;
  const signed = state === STATE.SIGNED;
  const broadcasted = state === STATE.BROADCASTED;
  const confirmed = state === STATE.CONFIRMED;
  const completed = state === STATE.COMPLETED;

  // lock inputs once we're out of the default state
  const inputsLocked = !isDefaultState;

  // we can sign when:
  const canSign = !initializing && constructed && isDefaultState;

  const construct = useCallback(
    async (...args) =>
      setUnsignedTransaction(await transactionBuilder(...args)),
    [transactionBuilder]
  );

  const unconstruct = useCallback(() => setUnsignedTransaction(undefined), [
    setUnsignedTransaction,
  ]);

  const generateAndSign = useCallback(async () => {
    try {
      setError(undefined);

      const txn = await signTransaction({
        wallet: _wallet,
        walletType,
        walletHdPath,
        networkType,
        txn: unsignedTransaction,
        nonce,
        chainId,
        gasPrice: gasPrice.toFixed(0),
        gasLimit,
      });

      setSignedTransaction(txn);
      setState(STATE.SIGNED);
    } catch (error) {
      setError(error);
    }
  }, [
    _wallet,
    chainId,
    gasLimit,
    gasPrice,
    networkType,
    nonce,
    setError,
    unsignedTransaction,
    walletHdPath,
    walletType,
  ]);

  const broadcast = useCallback(async () => {
    try {
      setConfirmationProgress(0.0);
      setError(undefined);

      const rawTx = hexify(signedTransaction.serialize());
      const costGwei = toBN(gasLimit).mul(toBN(gasPrice));
      const cost = toWei(costGwei.toString(), 'gwei');

      let usedTank = false;
      // if this ethereum transaction is being executed by a specific point
      // see if we can use the tank
      if (Just.hasInstance(pointCursor)) {
        usedTank = await ensureFundsFor(
          _web3,
          pointCursor.value,
          _wallet.address,
          cost,
          [rawTx],
          (address, minBalance, balance) =>
            setNeedFunds({ address, minBalance, balance }),
          () => setNeedFunds(undefined)
        );
      }

      const txHash = await sendSignedTransaction(
        _web3,
        signedTransaction,
        /* doubtNonceError */ usedTank
      );

      setState(STATE.BROADCASTED);
      setTxHash(txHash);

      await timeout(PROGRESS_ANIMATION_DELAY_MS);

      setConfirmationProgress(0.2);

      await waitForTransactionConfirm(_web3, txHash);

      setConfirmationProgress(0.9);

      setState(STATE.CONFIRMED);
    } catch (error) {
      setError(error);
    }
  }, [
    _wallet.address,
    _web3,
    gasLimit,
    gasPrice,
    pointCursor,
    setError,
    signedTransaction,
  ]);

  const reset = useCallback(() => {
    setTxHash(undefined);
    setSignedTransaction(undefined);
    setNonce(undefined);
    setChainId(undefined);
    resetGasPrice();
    setState(STATE.NONE);
    setError(undefined);
    setNeedFunds(undefined);
    setConfirmationProgress(0.0);
  }, [resetGasPrice, setError]);

  useEffect(() => {
    let mounted = true;
    // if nonce or chainId is undefined, re-fetch on-chain info
    if (!(nonce === undefined || chainId === undefined)) {
      return;
    }

    (async () => {
      try {
        setError(undefined);
        const [nonce, chainId] = await Promise.all([
          _web3.eth.getTransactionCount(_wallet.address),
          _web3.eth.net.getId(),
        ]);

        if (!mounted) {
          return;
        }

        setNonce(nonce);
        setChainId(chainId);
      } catch (error) {
        setError(error);
      }
    })();

    return () => (mounted = false);
  }, [_wallet, _web3, setError, nonce, chainId, networkType, initialGasPrice]);

  useEffect(() => {
    let mounted = true;

    if (confirmed) {
      (async () => {
        if (refetch) {
          try {
            await refetch();
          } catch (error) {
            // log the original
            console.error(error);
            // track a user-friendly error
            setError(
              new Error(
                'The transaction succeeded but we were unable to refresh chain state. Refresh to continue.'
              )
            );
          }
        }

        if (!mounted) {
          return;
        }

        setConfirmationProgress(1.0);

        await timeout(PROGRESS_ANIMATION_DELAY_MS);

        if (!mounted) {
          return;
        }

        setState(STATE.COMPLETED);
      })();
    }

    return () => (mounted = false);
  }, [confirmed, refetch, completed, setError]);

  const values = useDeepEqualReference({
    isDefaultState,
    initializing,
    construct,
    unconstruct,
    constructed,
    canSign,
    generateAndSign,
    signed,
    broadcast,
    broadcasted,
    confirmed,
    completed,
    reset,
    error,
    inputsLocked,
    confirmationProgress,
    txHash,
    signedTransaction,
    gasPrice,
    setGasPrice,
    resetGasPrice,
    nonce,
    chainId,
    needFunds,
  });

  return { ...values, bind: values };
}
