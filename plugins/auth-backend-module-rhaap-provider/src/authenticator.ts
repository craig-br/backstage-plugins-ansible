import { Strategy as Oauth2Strategy } from 'passport-oauth2';
import {
  createOAuthAuthenticator,
  PassportOAuthAuthenticatorHelper,
  PassportOAuthDoneCallback,
  PassportProfile,
} from '@backstage/plugin-auth-node';
import { fetchProfile, rhAAPAuthenticate } from './helpers';

/** @public */
export const aapAuthAuthenticator = createOAuthAuthenticator({
  scopes: {
    persist: true,
  },
  defaultProfileTransform:
    PassportOAuthAuthenticatorHelper.defaultProfileTransform,
  initialize({ callbackUrl, config }) {
    const clientId = config.getString('clientId');
    const clientSecret = config.getString('clientSecret');
    let host = config.getString('host');
    host = host.slice(-1) === '/' ? host.slice(0, -1) : host;
    const callbackURL = config.getOptionalString('callbackUrl') ?? callbackUrl;
    const checkSSL = config.getBoolean('checkSSL') ?? true;

    const helper = PassportOAuthAuthenticatorHelper.from(
      new Oauth2Strategy(
        {
          clientID: clientId,
          clientSecret: clientSecret,
          callbackURL: callbackURL,
          authorizationURL: `${host}/o/authorize/`,
          tokenURL: `${host}/o/token/`,
          skipUserProfile: true,
          passReqToCallback: false,
        },
        (
          accessToken: any,
          refreshToken: any,
          params: any,
          fullProfile: PassportProfile,
          done: PassportOAuthDoneCallback,
        ) => {
          done(
            undefined,
            { fullProfile, params, accessToken },
            { refreshToken },
          );
        },
      ),
    );
    return { helper, host, clientId, clientSecret, callbackURL, checkSSL };
  },
  async start(input, { helper }) {
    const start = await helper.start(input, {
      accessType: 'offline',
      prompt: 'auto',
      approval_prompt: 'auto',
    });
    start.url += '&approval_prompt=auto';
    return start;
  },

  async authenticate(
    input,
    { host, clientId, clientSecret, callbackURL, checkSSL },
  ) {
    const result = await rhAAPAuthenticate({
      host: host,
      checkSSL: checkSSL,
      clientId: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackURL,
      code: input.req.query.code as string,
    });
    const fullProfile = await fetchProfile({
      host,
      checkSSL: checkSSL,
      accessToken: result.session.accessToken,
      tokenType: result.session.tokenType,
    });
    return { ...result, fullProfile };
  },

  async refresh(
    input,
    { host, clientId, clientSecret, callbackURL, checkSSL },
  ) {
    const result = await rhAAPAuthenticate({
      host: host,
      checkSSL: checkSSL,
      clientId: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackURL,
      refreshToken: input.refreshToken,
    });

    const fullProfile = await fetchProfile({
      host,
      checkSSL: checkSSL,
      accessToken: result.session.accessToken,
      tokenType: result.session.tokenType,
    });
    return { ...result, fullProfile };
  },
});
