import React, { useState, useCallback } from 'react';
import { H1, Grid } from 'indigo-react';
import { Just } from 'folktale/maybe';

import * as need from 'lib/need';

import { useHistory } from 'store/history';
import { useWallet } from 'store/wallet';
import { usePointCursor } from 'store/pointCursor';

import View from 'components/View';
import Tabs from 'components/Tabs';
import Crumbs from 'components/Crumbs';
import CopiableAddress from 'components/CopiableAddress';

import Active from 'views/Release/Active';
import Locked from 'views/Release/Locked';

const NAMES = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
};

const VIEWS = {
  [NAMES.ACTIVE]: Active,
  [NAMES.LOCKED]: Locked,
};
const OPTIONS = [
  { text: 'Active', value: NAMES.ACTIVE },
  { text: 'Locked', value: NAMES.LOCKED },
];
export default function ReleaseView() {
  const { pop, push, names } = useHistory();
  const { wallet } = useWallet();

  const { setPointCursor } = usePointCursor();

  const goPoint = useCallback(
    point => {
      setPointCursor(Just(point));

      push(names.POINT);
    },
    [push, names, setPointCursor]
  );
  // inputs
  const [currentTab, setCurrentTab] = useState(NAMES.ACTIVE);

  const goActive = useCallback(() => {
    setCurrentTab(NAMES.ACTIVE);
  }, [setCurrentTab]);

  const address = need.addressFromWallet(wallet);

  return (
    <View pop={pop} inset>
      <Grid>
        <Grid.Item full as={Crumbs} />
        <Grid.Item full as={H1} className="f6 mono gray4 us-none pointer">
          <CopiableAddress text={address}>{address}</CopiableAddress>
        </Grid.Item>

        <Grid.Item
          full
          as={Tabs}
          className="mt1"
          // Tabs
          views={VIEWS}
          options={OPTIONS}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          // Tab extra
          goPoint={goPoint}
          goActive={goActive}
          //
          //
        />
      </Grid>
    </View>
  );
}
