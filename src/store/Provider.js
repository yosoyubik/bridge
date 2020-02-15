import nest from 'lib/nest';

import { HistoryProvider } from './history';
import { OnlineProvider } from './online';
import { NetworkProvider } from './network';
import { WalletProvider } from './wallet';
import { PointCursorProvider } from './pointCursor';
import { StarReleaseCacheProvider } from './starRelease';
import { PointCacheProvider } from './pointCache';
import { TxnCursorProvider } from './txnCursor';
import { MediaQueryProvider } from 'lib/MediaQuery';
import { BitcoinNodeProvider } from './bitcoinNode';

// nest all of the providers within each other to avoid hella depth
export default nest([
  HistoryProvider,
  OnlineProvider,
  NetworkProvider,
  WalletProvider,
  PointCursorProvider,
  PointCacheProvider,
  TxnCursorProvider,
  MediaQueryProvider,
  StarReleaseCacheProvider,
  BitcoinNodeProvider,
]);
