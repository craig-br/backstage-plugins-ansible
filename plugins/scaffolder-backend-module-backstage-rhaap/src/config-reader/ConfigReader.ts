import { Config } from '@backstage/config';
import { AnsibleConfig } from '../types';
import { ScmIntegrations } from '@backstage/integration';

export const getAnsibleConfig = (config: Config): AnsibleConfig => {
  const integrations = ScmIntegrations.fromConfig(config);
  const baseUrl = config.getString('ansible.rhaap.baseUrl');
  const githubIntegration = integrations.github.list()[0].config;
  const gitlabIntegration = integrations.gitlab.list()[0].config;
  const ansibleConfig = {
    baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
    checkSSL: config.getOptionalBoolean('ansible.rhaap.checkSSL') ?? true,
    showCaseLocation: {
      type: config.getString('ansible.rhaap.showCaseLocation.type'),
      target: config.getString('ansible.rhaap.showCaseLocation.target'),
    },
    githubIntegration: githubIntegration,
    gitlabIntegration: gitlabIntegration,
  } as AnsibleConfig;

  if (ansibleConfig.showCaseLocation.type === 'url') {
    if (!githubIntegration.token && !gitlabIntegration.token) {
      throw new Error('No Integration token found');
    }
    ansibleConfig.showCaseLocation.gitUser = config.getString(
      'ansible.rhaap.showCaseLocation.gitUser',
    );
    ansibleConfig.showCaseLocation.gitBranch = config.getString(
      'ansible.rhaap.showCaseLocation.gitBranch',
    );
    ansibleConfig.showCaseLocation.gitEmail = config.getString(
      'ansible.rhaap.showCaseLocation.gitEmail',
    );
  } else if (ansibleConfig.showCaseLocation.type !== 'file') {
    throw new Error(
      "Missing required config value at 'ansible.rhaap.showCaseLocation.type'",
    );
  }
  return ansibleConfig;
};
