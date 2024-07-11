import { BackendDynamicPluginInstaller } from '@backstage/backend-dynamic-feature-service';

import { backstageRHAAPPlugin } from '../plugin';

export const dynamicPluginInstaller: BackendDynamicPluginInstaller = {
  kind: 'new',
  install: () => backstageRHAAPPlugin,
};
