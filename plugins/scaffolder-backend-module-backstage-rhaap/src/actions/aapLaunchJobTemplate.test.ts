import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { MOCK_TOKEN } from '../mock';
import { LaunchJobTemplate } from '@ansible/backstage-rhaap-common';
import { launchJobTemplate } from './aapLaunchJobTemplate';
import { mockAnsibleService } from './mockIAAPService';

describe('ansible-aap:jobTemplate:launch', () => {
  const action = launchJobTemplate(mockAnsibleService);

  const projectData: LaunchJobTemplate = {
    template: {
      id: 1,
      name: 'Test job template',
    },
    jobType: 'run',
  };

  const mockContext = createMockActionContext({
    input: {
      token: MOCK_TOKEN,
      deleteIfExist: true,
      values: projectData,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should launch job template', async () => {
    const expectedResponse = {
      id: 1,
      status: 'success',
      events: [],
      url: `https//test.com/execution/jobs/playbook/1/output`,
    };

    mockAnsibleService.launchJobTemplate.mockResolvedValue(expectedResponse);

    // @ts-ignore
    await action.handler({ ...mockContext });
    expect(mockContext.output).toHaveBeenCalledWith('data', expectedResponse);
  });

  it('should fail with message', async () => {
    mockAnsibleService.launchJobTemplate.mockRejectedValue(
      new Error('Test error message.'),
    );

    let error;
    try {
      // @ts-ignore
      await action.handler({ ...mockContext });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Test error message.');
  });

  it('should fail without message', async () => {
    mockAnsibleService.launchJobTemplate.mockRejectedValue(
      new Error('Something went wrong.'),
    );
    let error;
    try {
      // @ts-ignore
      await action.handler({ ...mockContext });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Something went wrong.');
  });
});
