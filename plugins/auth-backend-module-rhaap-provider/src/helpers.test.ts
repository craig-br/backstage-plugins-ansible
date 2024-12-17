import { rhAAPAuthenticate, fetchProfile } from './helpers';
import {
  ACCESS_TOKEN,
  CHECK_SSL,
  DEFAULT_HOST,
  ME_RESPONSE_DATA,
  REFRESH_TOKEN,
  TOKEN_RESPONSE,
  TOKEN_TYPE,
} from './mockData';
import { fetch } from 'undici';

jest.mock('undici');

describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticate', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const clientId = 'mocked_client_id';
    const clientSecret = 'clientSecret';
    const callbackURL = 'callbackURL';
    const code = 'code';
    // @ts-ignore
    fetch.mockReturnValue(Promise.resolve(TOKEN_RESPONSE));
    const result = await rhAAPAuthenticate({
      host,
      checkSSL,
      clientId,
      clientSecret,
      callbackURL,
      code,
    });
    expect(result).toEqual({
      session: {
        accessToken: 'accessToken',
        expiresInSeconds: 3600,
        refreshToken: 'refreshToken',
        scope: 'scope',
        tokenType: 'Bearer',
      },
    });
  });

  it('authenticate no code', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const clientId = 'mocked_client_id';
    const clientSecret = 'clientSecret';
    const callbackURL = 'callbackURL';
    let error;
    try {
      await rhAAPAuthenticate({
        host,
        checkSSL,
        clientId,
        clientSecret,
        callbackURL,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('You have to provide code or refreshToken');
  });

  it('authenticate false response', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const clientId = 'mocked_client_id';
    const clientSecret = 'clientSecret';
    const callbackURL = 'callbackURL';
    const code = 'code';
    let error;
    // @ts-ignore
    fetch.mockReturnValue(Promise.resolve({}));
    try {
      await rhAAPAuthenticate({
        host,
        checkSSL,
        clientId,
        clientSecret,
        callbackURL,
        code,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Failed to obtain access token from RH AAP.');
  });

  it('authenticate no response', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const clientId = 'mocked_client_id';
    const clientSecret = 'clientSecret';
    const callbackURL = 'callbackURL';
    const code = 'code';
    let error;
    // @ts-ignore
    fetch.mockReturnValue(Promise.reject());
    try {
      await rhAAPAuthenticate({
        host,
        checkSSL,
        clientId,
        clientSecret,
        callbackURL,
        code,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Failed to obtain access token from RH AAP.');
  });

  it('refreshToken', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const clientId = 'mocked_client_id';
    const clientSecret = 'clientSecret';
    const callbackURL = 'callbackURL';
    const refreshToken = REFRESH_TOKEN;
    // @ts-ignore
    fetch.mockReturnValue(Promise.resolve(TOKEN_RESPONSE));
    const result = await rhAAPAuthenticate({
      host,
      checkSSL,
      clientId,
      clientSecret,
      callbackURL,
      refreshToken,
    });
    expect(result).toEqual({
      session: {
        accessToken: 'accessToken',
        expiresInSeconds: 3600,
        refreshToken: 'refreshToken',
        scope: 'scope',
        tokenType: 'Bearer',
      },
    });
  });

  it('fetchProfile', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const accessToken = ACCESS_TOKEN;
    const tokenType = TOKEN_TYPE;
    // @ts-ignore
    fetch.mockReturnValue(Promise.resolve(ME_RESPONSE_DATA));
    const result = await fetchProfile({
      host,
      checkSSL,
      accessToken,
      tokenType,
    });
    expect(result).toEqual({
      provider: 'AAP oauth2',
      username: 'userName',
      email: 'someEmail@domain.com',
      displayName: 'userFirstName userLastName',
    });
  });

  it('fetchProfile no response code', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const accessToken = ACCESS_TOKEN;
    const tokenType = TOKEN_TYPE;
    let error;
    // @ts-ignore
    fetch.mockReturnValue(Promise.resolve({}));
    try {
      await fetchProfile({
        host,
        checkSSL,
        accessToken,
        tokenType,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Failed to retrieve profile data from RH AAP.');
  });
  it('fetchProfile no response', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const accessToken = ACCESS_TOKEN;
    const tokenType = TOKEN_TYPE;
    let error;
    // @ts-ignore
    fetch.mockReturnValue(Promise.reject());
    try {
      await fetchProfile({
        host,
        checkSSL,
        accessToken,
        tokenType,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe('Failed to retrieve profile data from RH AAP.');
  });

  it('fetchProfile not valid response', async () => {
    const host = DEFAULT_HOST;
    const checkSSL = CHECK_SSL;
    const accessToken = ACCESS_TOKEN;
    const tokenType = TOKEN_TYPE;
    let error;
    // @ts-ignore
    fetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            email: 'someEmail@domain.com',
            username: 'userName',
            first_name: 'userFirstName',
            last_name: 'userLastName',
          }),
      }),
    );
    try {
      await fetchProfile({
        host,
        checkSSL,
        accessToken,
        tokenType,
      });
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe(
      'Profile data from RH AAP is in an unexpected format. Please contact your system administrator',
    );
  });
});
