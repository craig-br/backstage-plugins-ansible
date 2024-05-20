/*
 * Copyright 2024 The Ansible plugin Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Logger } from 'winston';
import { executeShellCommand } from '@backstage/plugin-scaffolder-node';
import { BackendServiceAPI } from '../utils/api';
import { ansibleCreatorRun } from './ansibleContentCreate';

jest.mock('@backstage/plugin-scaffolder-node');
jest.mock('../utils/api');

describe('ansibleContentCreate', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;

  const mockExecuteShellCommand = executeShellCommand as jest.MockedFunction<
    typeof executeShellCommand
  >;

  const mockBackendServiceAPI = BackendServiceAPI as jest.MockedClass<
    typeof BackendServiceAPI
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run ansible-creator for playbook project', async () => {
    const workspacePath = '/tmp/workspace';
    const applicationType = 'playbook-project';
    const collectionGroup = 'my-group';
    const collectionName = 'my-collection';
    const creatorServiceUrl = 'http://localhost:8000';

    await ansibleCreatorRun(
      workspacePath,
      applicationType,
      mockLogger,
      'My description',
      collectionGroup,
      collectionName,
      creatorServiceUrl,
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Running ansible collection create for ${collectionGroup}.${collectionName}`,
    );

    expect(mockBackendServiceAPI).toHaveBeenCalledWith(creatorServiceUrl);
    expect(mockBackendServiceAPI.prototype.downloadPlaybookProject).toHaveBeenCalledWith(
      workspacePath,
      mockLogger,
      creatorServiceUrl,
      collectionGroup,
      collectionName,
      'my-group-playbook-project.tar.gz',
    );

    expect(mockExecuteShellCommand).toHaveBeenCalledWith({
      command: 'tar',
      args: ['-xvf', 'my-group-playbook-project.tar.gz'],
      options: {
        cwd: '/tmp/workspace/.ansible/collections/ansible_collections',
      },
      logStream: mockLogger,
    });

    expect(mockExecuteShellCommand).toHaveBeenCalledWith({
      command: 'rm',
      args: ['my-group-playbook-project.tar.gz'],
      options: {
        cwd: '/tmp/workspace/.ansible/collections/ansible_collections',
      },
      logStream: mockLogger,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      `[ansible-creator] Completed ansible-creator service invocation`,
    );
  });

  it('should run ansible-creator for collection project', async () => {
    const workspacePath = '/tmp/workspace';
    const applicationType = 'collection-project';
    const collectionGroup = 'my-group';
    const collectionName = 'my-collection';
    const creatorServiceUrl = 'http://localhost:8000';

    await ansibleCreatorRun(
      workspacePath,
      applicationType,
      mockLogger,
      'My description',
      collectionGroup,
      collectionName,
      creatorServiceUrl,
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      `Running ansible collection create for ${collectionGroup}.${collectionName}`,
    );

    expect(mockBackendServiceAPI).toHaveBeenCalledWith(creatorServiceUrl);
    expect(mockBackendServiceAPI.prototype.downloadCollectionProject).toHaveBeenCalledWith(
      workspacePath,
      mockLogger,
      creatorServiceUrl,
      collectionGroup,
      collectionName,
      'my-group-collection-project.tar.gz',
    );

    expect(mockExecuteShellCommand).toHaveBeenCalledWith({
      command: 'tar',
      args: ['-xvf', 'my-group-collection-project.tar.gz'],
      options: {
        cwd: '/tmp/workspace/.ansible/collections/ansible_collections',
      },
      logStream: mockLogger,
    });

    expect(mockExecuteShellCommand).toHaveBeenCalledWith({
      command: 'rm',
      args: ['my-group-collection-project.tar.gz'],
      options: {
        cwd: '/tmp/workspace/.ansible/collections/ansible_collections',
      },
      logStream: mockLogger,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      `[ansible-creator] Completed ansible-creator service invocation`,
    );
  });
});
