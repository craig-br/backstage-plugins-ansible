import {
  OAuthAuthenticatorResult,
  PassportProfile,
} from '@backstage/plugin-auth-node';
import { AuthenticationError } from '@backstage/errors';
import { Agent, fetch } from 'undici';

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
};

export async function rhAAPAuthenticate(options: {
  host: string;
  checkSSL: boolean;
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  code?: string;
  refreshToken?: string;
}) {
  const url = `${options.host}/o/token/`;
  const proxyAgent = new Agent({
    connect: {
      rejectUnauthorized: options.checkSSL,
    },
  });
  const data = new URLSearchParams();
  if (options.code) {
    data.append('grant_type', 'authorization_code');
    data.append('code', options.code);
  } else if (options.refreshToken) {
    data.append('grant_type', 'refresh_token');
    data.append('refresh_token', options.refreshToken);
  } else {
    throw new AuthenticationError('You have to provide code or refreshToken');
  }
  data.append('client_id', options.clientId);
  data.append('client_secret', options.clientSecret);
  data.append('redirect_uri', options.callbackURL);
  let response;
  try {
    response = await fetch(url, {
      dispatcher: proxyAgent,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data,
    });
  } catch (e) {
    throw new AuthenticationError('Failed to obtain access token from RH AAP.');
  }

  if (!response.ok) {
    throw new AuthenticationError('Failed to obtain access token from RH AAP.');
  }

  const jsonResponse = (await response.json()) as TokenResponse;

  return {
    session: {
      accessToken: jsonResponse.access_token,
      tokenType: jsonResponse.token_type,
      scope: jsonResponse.scope,
      expiresInSeconds: jsonResponse.expires_in,
      refreshToken: jsonResponse.refresh_token,
    },
  } as OAuthAuthenticatorResult<PassportProfile>;
}

export async function fetchProfile(options: {
  host: string;
  checkSSL: boolean;
  accessToken: string;
  tokenType: string;
}): Promise<PassportProfile> {
  const { host, accessToken, tokenType, checkSSL } = options;
  const proxyAgent = new Agent({
    connect: {
      rejectUnauthorized: checkSSL,
    },
  });
  let response;
  try {
    response = await fetch(`${host}/api/gateway/v1/me/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${tokenType} ${accessToken}`,
      },
      dispatcher: proxyAgent,
    });
  } catch (e) {
    throw new AuthenticationError(
      'Failed to retrieve profile data from RH AAP.',
    );
  }
  if (!response.ok) {
    throw new AuthenticationError(
      'Failed to retrieve profile data from RH AAP.',
    );
  }
  const userDataJson = (await response.json()) as {
    results: {
      username: string;
      email: string;
      first_name: string;
      last_name: string;
    }[];
  };
  let userData;
  if (
    Object.hasOwn(userDataJson, 'results') &&
    Array.isArray(userDataJson.results) &&
    userDataJson.results?.length
  ) {
    userData = userDataJson.results[0];
  } else {
    throw new AuthenticationError(
      `Profile data from RH AAP is in an unexpected format. Please contact your system administrator`,
    );
  }
  return {
    provider: 'AAP oauth2',
    username: userData.username,
    email: userData.email,
    displayName: `${userData?.first_name ? userData.first_name : ''} ${userData?.last_name ? userData.last_name : ''}`,
  } as PassportProfile;
}
