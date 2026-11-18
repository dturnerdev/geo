import {
  BUNDLED_CONTENT_PACK,
  BUNDLED_DATA_FORMAT,
  BUNDLED_PACK_SIGNING_KEYS,
  StaticContentSource,
  StaticPackHost,
  UpdateScheduler,
  type ContentSource,
  type NetworkConditions,
} from '@geo/content';

interface ConnectionLike {
  readonly saveData?: boolean;
  readonly type?: string;
}

function browserOrigin(): string {
  return globalThis.location.origin;
}

// Web checks on open, if online (D111). The only network peer is the static
// pack host on this origin (FE02 behaviour 2, AC-02.8).
export function createWebContentSource(): ContentSource {
  return new StaticContentSource({
    host: new StaticPackHost({ baseUrl: browserOrigin() }),
    keys: BUNDLED_PACK_SIGNING_KEYS,
    dataFormat: BUNDLED_DATA_FORMAT,
    bundledPack: BUNDLED_CONTENT_PACK,
    scheduler: new UpdateScheduler(),
    network: webNetworkConditions,
  });
}

export function webNetworkConditions(): NetworkConditions {
  const connection = (globalThis.navigator as { readonly connection?: ConnectionLike }).connection;
  const type = connection?.type;
  const metered = type !== undefined && type !== 'wifi' && type !== 'ethernet' && type !== 'none';
  return {
    online: globalThis.navigator.onLine,
    metered,
    dataSaver: connection?.saveData === true,
    batteryLow: false,
    // The web app has no mobile-data setting; respect the browser's own signals.
    mobileDataAllowed: !metered,
  };
}
