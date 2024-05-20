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
import { CatalogClient } from '@backstage/catalog-client';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ConfigReader } from '@backstage/config';

import {
  createAnsibleContentAction,
} from './ansible';



// const server = setupServer();
// // Enable sane handlers for network requests
// setupRequestMockHandlers(server);

// // setup mock response
// beforeEach(() => {
//   server.use(
//     rest.get('/*', (_, res, ctx) => res(ctx.status(200), ctx.json({}))),
//   );
// });
const LOCAL_ADDR = 'http://localhost:5000';

const CREATOR_SERVICE_CONFIG = {
  baseUrl: "localhost",
  port: '8000',
}

const ANSIBLE_CONFIG = {
  creatorService: CREATOR_SERVICE_CONFIG,
  devSpacesBaseUrl: 'https://devspaces.testurl.rhdh.testing.test.com/', // NOSONAR
} as const

export const handlers = [
  rest.get(
    `${LOCAL_ADDR}/v1/creator/collection`,
    (_, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          items: [
            require(
              `${__dirname}/cluster1.json`,
            ),
          ],
        }),
      );
    },
  ),
];


const server = setupServer(...handlers);

describe('ansible:content:create', () => {

    const action = createAnsibleContentAction({
      config: new ConfigReader({
        ansible: { ...ANSIBLE_CONFIG }, // NOSONAR
      }),
    });

    const mockContext = createMockActionContext();

    beforeAll(() => server.listen());

    beforeEach(() => {
      jest.resetAllMocks();
    });

    afterEach(() => {
      server.restoreHandlers();
    });

    afterAll(() => server.close());

    it('should download and extract the tarball', async () => {
      const input ={
        repoOwner: 'my-org',
        repoName: 'my-repo',
        description: 'My description',
        collectionGroup: 'my-group',
        collectionName: 'my-collection',
        config: new ConfigReader({
          ansible: { ...ANSIBLE_CONFIG }, // NOSONAR
        }),
      };

      const context = {
        ...mockContext,
        input,
      };

      await action.handler(context);

      // Assert that the tarball was downloaded and extracted
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Running ansible collection create for my-group.my-collection',
      );
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Out of file download operation',
      );
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[ansible-creator] Completed ansible-creator service invocation',
      );
    });

    it('should handle errors during download', async () => {
      const action = createAnsibleContentAction({} as any); // Replace with your actual config

      server.use(
        rest.fetch('/download/tarball', (req, res, ctx) => {
          return res(ctx.status(500));
        }),
      );

      await expect(
        action.handler({
          ...mockContext,
          input: {
            repoOwner: 'my-org',
            repoName: 'my-repo',
            description: 'My description',
            collectionGroup: 'my-group',
            collectionName: 'my-collection',
          },
        }),
      ).rejects.toThrow('Failed to download file');
    });
  });
