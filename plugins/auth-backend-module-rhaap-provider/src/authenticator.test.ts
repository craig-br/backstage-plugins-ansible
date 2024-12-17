import { mockServices } from '@backstage/backend-test-utils';
import { aapAuthAuthenticator } from './authenticator';
import {
  CHECK_SSL,
  CLIENT_ID,
  CLIENT_SECRET,
  DEFAULT_HOST,
  ME_RESPONSE_DATA,
  MOCK_CONFIG,
  TOKEN_RESPONSE,
} from './mockData';

jest.mock('undici', () => ({
  ...jest.requireActual('undici'),
  fetch: jest.fn(async (input: any, init: any) => {
    const method = init?.method ?? 'GET';
    if (input === `${DEFAULT_HOST}/o/token/` && method === 'POST') {
      return Promise.resolve(TOKEN_RESPONSE);
    }
    if (input === `${DEFAULT_HOST}/api/gateway/v1/me/` && method === 'GET') {
      return Promise.resolve(ME_RESPONSE_DATA);
    }
    return null;
  }),
}));

describe('authenticator', () => {
  it('authenticator works', async () => {
    aapAuthAuthenticator.initialize({
      callbackUrl: '',
      config: mockServices.rootConfig({
        data: MOCK_CONFIG.data.auth.providers.rhaap.development,
      }),
    });

    const result = await aapAuthAuthenticator.refresh(
      // @ts-ignore
      { refreshToken: 'oldRefreshToken' },
      {
        host: DEFAULT_HOST,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: 'http://localhost',
        checkSSL: CHECK_SSL,
      },
    );
    expect(result).toEqual({
      session: {
        accessToken: 'accessToken',
        tokenType: 'Bearer',
        scope: 'scope',
        expiresInSeconds: 3600,
        refreshToken: 'refreshToken',
      },
      fullProfile: {
        provider: 'AAP oauth2',
        username: 'userName',
        email: 'someEmail@domain.com',
        displayName: 'userFirstName userLastName',
      },
    });
  });
});
