import { BackendDynamicPluginInstaller } from "@backstage/backend-dynamic-feature-service";
import { createAnsibleContentAction } from "../actions/run";

export const dynamicPluginInstaller: BackendDynamicPluginInstaller = {
  kind: "legacy",
  scaffolder: (env) => {
    const config = env.config;
    return [createAnsibleContentAction(config)];
  },
};
