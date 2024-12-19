import { Config } from '@backstage/config';
import { AnsibleConfig } from '../types';
import { ScmIntegrations } from '@backstage/integration';

export const getAnsibleConfig = (config: Config): AnsibleConfig => {
  const integrations = ScmIntegrations.fromConfig(config);
  const baseUrl = config.getString('ansible.rhaap.baseUrl');
  const gitHubIntegration = integrations.github.list()[0].config;
  const ansibleConfig = {
    baseUrl: baseUrl.slice(-1) === '/' ? baseUrl.slice(0, -1) : baseUrl,
    checkSSL: config.getOptionalBoolean('ansible.rhaap.checkSSL') ?? true,
    showCaseLocation: {
      type: config.getString('ansible.rhaap.showCaseLocation.type'),
      target: config.getString('ansible.rhaap.showCaseLocation.target'),
    },
    gitHubIntegration: gitHubIntegration,
  } as AnsibleConfig;

  if (ansibleConfig.showCaseLocation.type === 'url') {
    if (!gitHubIntegration.token) {
      throw new Error('Missing GitHub token');
    }
    ansibleConfig.showCaseLocation.githubUser = config.getString(
      'ansible.rhaap.showCaseLocation.githubUser',
    );
    ansibleConfig.showCaseLocation.githubBranch = config.getString(
      'ansible.rhaap.showCaseLocation.githubBranch',
    );
    ansibleConfig.showCaseLocation.githubEmail = config.getString(
      'ansible.rhaap.showCaseLocation.githubEmail',
    );
  } else {
    if (ansibleConfig.showCaseLocation.type !== 'file') {
      throw new Error(
        "Missing required config value at 'ansible.rhaap.showCaseLocation.type'",
      );
    }
  }
  return ansibleConfig;
};
