import BN from 'bn.js';
import { Just, Nothing } from 'folktale/maybe';

import * as noun from '../nockjs/noun';
import * as serial from '../nockjs/serial';
import * as kg from 'urbit-key-generation/dist';

import { eqAddr, addHexPrefix } from './wallet';

// the curve param for the network keys
export const NETWORK_KEY_CURVE_PARAMETER = '42';
// the current crypto suite version
export const CRYPTO_SUITE_VERSION = 1;

export const CURVE_ZERO_ADDR =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// ctsy joemfb
const b64 = buf => {
  let hex = buf.reverse().toString('hex');
  let n = new BN(hex, 'hex');
  let c = [];
  while (1 === n.cmpn(0)) {
    c.push(n.andln(0x3f));
    n = n.shrn(6);
  }

  // prettier-ignore
  const trans = j =>
    10 > j
    ? j + 48
    : 36 > j
    ? j + 87
    : 62 > j
    ? j + 29
    : 62 === j
    ? 45
    : 126;

  return (
    '0w' +
    c.reduce(
      (a, b, i) =>
        String.fromCharCode(trans(b)) + (i && 0 === i % 5 ? '.' : '') + a,
      ''
    )
  );
};

const jam = seed => {
  const hex = serial
    .jam(seed)
    .toString()
    .slice(2);
  const pad = hex.length % 2 === 0 ? hex : '0' + hex;
  return Buffer.from(pad, 'hex').reverse();
};

// simple alias to avoid importing kg into component scope
export const deriveNetworkKeys = seed => kg.deriveNetworkKeys(seed);

/**
 * @param {object} pair
 * @param {number} point
 * @param {number} revision
 * @return {string}
 */
export const compileNetworkingKey = (pair, point, revision) => {
  const bnsec = new BN(
    pair.crypt.private + pair.auth.private + NETWORK_KEY_CURVE_PARAMETER,
    'hex'
  );

  const sed = noun.dwim(
    noun.Atom.fromInt(point),
    noun.Atom.fromInt(revision),
    noun.Atom.fromString(bnsec.toString()),
    noun.Atom.yes
  );

  return b64(jam(sed));
};

/**
 * @param {object} urbitWallet
 * @param {number} revision
 * @return {Promise<Maybe<string>>}
 */
export const deriveNetworkSeedFromUrbitWallet = async (
  urbitWallet,
  revision = 1
) => {
  return await deriveNetworkSeedFromSeed(urbitWallet.management.seed, revision);
};

/**
 * @param {Maybe<any>} wallet
 * @param {string} authMnemonic
 * @param {object} details
 * @param {number} revision
 * @return {Promise<Maybe<string>>}
 */
export const deriveNetworkSeedFromMnemonic = async (
  wallet,
  authMnemonic,
  details,
  revision = 1
) => {
  const isManagementProxy = eqAddr(wallet.address, details.managementProxy);

  // the network seed is derivable from mnemonic iff the management proxy
  // is this mnemonic
  if (isManagementProxy) {
    return await deriveNetworkSeedFromSeed(authMnemonic, revision);
  }

  return Nothing();
};

/**
 * @param {string} seed
 * @param {number} revision
 * @return {Promise<Maybe<string>>}
 */
const deriveNetworkSeedFromSeed = async (seed, revision) => {
  return Just(await kg.deriveNetworkSeed(seed, '', revision));
};

/**
 * @return {Promise<Maybe<string>>}
 */
export const attemptNetworkSeedDerivation = async ({
  urbitWallet,
  wallet,
  authMnemonic,
  details,
  revision,
}) => {
  if (Just.hasInstance(urbitWallet)) {
    return await deriveNetworkSeedFromUrbitWallet(urbitWallet.value, revision);
  }

  if (Just.hasInstance(wallet) && Just.hasInstance(authMnemonic)) {
    return await deriveNetworkSeedFromMnemonic(
      wallet.value,
      authMnemonic.value,
      details,
      revision
    );
  }

  return Nothing();
};

/**
 *
 * @param {object} pair
 * @param {object} details
 * @return {boolean}
 */
export const keysMatchChain = (pair, details) => {
  const { crypt, auth } = pair;
  const { encryptionKey, authenticationKey } = details;

  return (
    encryptionKey === addHexPrefix(crypt.public) &&
    authenticationKey === addHexPrefix(auth.public)
  );
};

export const segmentNetworkKey = hex => {
  if (hex === CURVE_ZERO_ADDR) {
    return null;
  }

  const sl = i => hex.slice(i, i + 4);
  const rowFrom = i => `${sl(i)}.${sl(i + 4)}.${sl(i + 8)}.${sl(i + 12)}`;

  return [rowFrom(2), rowFrom(18), rowFrom(34), rowFrom(50)];
};
