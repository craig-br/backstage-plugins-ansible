import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { IAAPService, getAnsibleConfig } from '@ansible/backstage-rhaap-common';

export async function handleAutocompleteRequest({
  resource,
  token,
  config,
  logger,
  ansibleService,
}: {
  resource: string;
  token: string;
  config: Config;
  logger: LoggerService;
  ansibleService: IAAPService;
}): Promise<{ results: any[] }> {
  const ansibleConfig = getAnsibleConfig(config);
  if (resource === 'verbosity') {
    const data = [
      '0 (Normal)',
      '1 (Verbose)',
      '2 (More Verbose)',
      '3 (Debug)',
      '4 (Connection Debug)',
      '5 (WinRM Debug)',
    ];
    return {
      results: data.map((value, index) => {
        return { id: index, name: value };
      }),
    };
  }
  if (resource === 'aaphostname') {
    return {
      results: [{ id: 1, name: ansibleConfig.rhaap?.baseUrl }],
    };
  }

  await ansibleService.setLogger(logger);
  const data = await ansibleService.getResourceData(resource, token);
  return { results: data.results };
}
