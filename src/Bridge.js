import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Just, Nothing } from 'folktale/maybe';
import { IndigoApp } from 'indigo-react';

import Router from 'components/Router';

import Provider from 'store/Provider';

import { ROUTE_NAMES } from 'lib/routeNames';
import { ROUTES } from 'lib/router';
import { NETWORK_TYPES } from 'lib/network';
import { BITCOIN_NETWORK_TYPES } from 'lib/bitcoinNetwork';

import { walletFromMnemonic } from 'lib/wallet';
import { isDevelopment } from 'lib/flags';
import useImpliedTicket from 'lib/useImpliedTicket';
import useHasDisclaimed from 'lib/useHasDisclaimed';

import 'style/index.scss';
import WithErrorBoundary from 'components/WithErrorBoundary';
import GlobalErrorBoundary from 'components/GlobalErrorBoundary';

const INITIAL_NETWORK_TYPE = isDevelopment
  ? NETWORK_TYPES.LOCAL
  : NETWORK_TYPES.MAINNET;

const INITIAL_BITCOIN_NETWORK_TYPE = isDevelopment
  ? BITCOIN_NETWORK_TYPES.MAINNET
  : BITCOIN_NETWORK_TYPES.MAINNET;

// NB(shrugs): modify these variables to change the default local state.
const SHOULD_STUB_LOCAL = process.env.REACT_APP_STUB_LOCAL === 'true';
const IS_STUBBED = isDevelopment && SHOULD_STUB_LOCAL;

const INITIAL_WALLET = IS_STUBBED
  ? walletFromMnemonic(
      process.env.REACT_APP_DEV_MNEMONIC,
      process.env.REACT_APP_HD_PATH
    )
  : undefined;
const INITIAL_MNEMONIC = IS_STUBBED
  ? Just(process.env.REACT_APP_DEV_MNEMONIC)
  : Nothing();
const INITIAL_POINT_CURSOR = IS_STUBBED ? Just(99549440) : Nothing();

function useInitialRoutes() {
  const [hasDisclaimed] = useHasDisclaimed();
  const hasImpliedTicket = !!useImpliedTicket();

  if (IS_STUBBED) {
    return [
      { key: ROUTE_NAMES.LOGIN },
      { key: ROUTE_NAMES.POINTS },
      { key: ROUTE_NAMES.POINT },
      // { key: ROUTE_NAMES.ADMIN },
      // { key: ROUTE_NAMES.BITCOIN },
    ];
  }

  if (hasImpliedTicket) {
    return [{ key: ROUTE_NAMES.ACTIVATE }];
  }

  if (!hasDisclaimed) {
    return [{ key: ROUTE_NAMES.DISCLAIMER, data: { next: ROUTE_NAMES.LOGIN } }];
  }

  return [{ key: ROUTE_NAMES.LOGIN }];
}

function Bridge() {
  const initialRoutes = useInitialRoutes();

  return (
    <WithErrorBoundary render={error => <GlobalErrorBoundary error={error} />}>
      <Provider
        views={ROUTES}
        names={ROUTE_NAMES}
        initialRoutes={initialRoutes}
        initialNetworkType={INITIAL_NETWORK_TYPE}
        initialBitcoinNetworkType={INITIAL_BITCOIN_NETWORK_TYPE}
        initialWallet={INITIAL_WALLET}
        initialMnemonic={INITIAL_MNEMONIC}
        initialPointCursor={INITIAL_POINT_CURSOR}>
        <IndigoApp>
          <Router />
        </IndigoApp>
      </Provider>
    </WithErrorBoundary>
  );
}

export default process.env.NODE_ENV === 'development' ? hot(Bridge) : Bridge;
