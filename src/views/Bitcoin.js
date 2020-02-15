import React from 'react';
import { Grid } from 'indigo-react';

import { useHistory } from 'store/history';

import useCurrentPointName from 'lib/useCurrentPointName';
import useRouter from 'lib/useRouter';
import { LocalRouterProvider } from 'lib/LocalRouter';

import View from 'components/View';
import Crumbs from 'components/Crumbs';

import BitcoinHome from './Bitcoin/Home';
import BitcoinTransaction from './Bitcoin/Transaction';
import BitcoinAddresses from './Bitcoin/Addresses';
import BitcoinBalance from './Bitcoin/Balance';

const NAMES = {
  HOME: 'HOME',
  TRANSACTION: 'TRANSACTION',
  ADDRESSES: 'ADDRESSES',
  BALANCE: 'BALANCE',
};

const VIEWS = {
  [NAMES.HOME]: BitcoinHome,
  [NAMES.TRANSACTION]: BitcoinTransaction,
  [NAMES.ADDRESSES]: BitcoinAddresses,
  [NAMES.BALANCE]: BitcoinBalance,
};

export default function Bitcoin() {
  const history = useHistory();
  const name = useCurrentPointName();

  const { Route, ...router } = useRouter({
    names: NAMES,
    views: VIEWS,
    initialRoutes: [{ key: NAMES.HOME }],
  });

  return (
    <View pop={router.pop} inset>
      <LocalRouterProvider value={router}>
        <Grid className="mb4">
          <Grid.Item
            full
            as={Crumbs}
            routes={[
              { text: name, action: () => history.pop() },
              { text: 'Bitcoin' },
            ]}
          />
        </Grid>
        <Route />
      </LocalRouterProvider>
    </View>
  );
}
