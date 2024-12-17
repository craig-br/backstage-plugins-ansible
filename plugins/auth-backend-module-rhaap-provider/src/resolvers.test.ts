import {
  AuthResolverContext,
  OAuthAuthenticatorResult,
  PassportProfile,
  SignInInfo,
} from '@backstage/plugin-auth-node';
import { AAPAuthSignInResolvers } from './resolvers';

describe('resolvers', () => {
  it('usernameMatchingUser works', async () => {
    const resolver = AAPAuthSignInResolvers.usernameMatchingUser();

    const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
      profile: {
        email: 'test_emai@test.com',
        picture: undefined,
        displayName: 'Test User',
      },
      result: {
        session: {
          accessToken: 'accessToken',
          tokenType: 'Bearer',
          scope: 'read',
          expiresInSeconds: 31536000000,
          refreshToken: 'refreshToken',
        },
        fullProfile: {
          id: 'tUser',
          provider: 'AAP oauth2',
          username: 'tUser',
          email: 'test_emai@test.com',
          displayName: 'Test User',
        },
      },
    };

    const context = {
      signInWithCatalogUser: jest.fn().mockResolvedValue(undefined),
    } satisfies Partial<AuthResolverContext>;

    await resolver(info, context as any);
    expect(context.signInWithCatalogUser).toHaveBeenCalledWith({
      entityRef: { name: 'tUser' },
    });
  });

  it('usernameMatchingUser should fail', async () => {
    const resolver = AAPAuthSignInResolvers.usernameMatchingUser();

    const info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>> = {
      profile: {
        email: 'test_emai@test.com',
        picture: undefined,
        displayName: 'Test User',
      },
      result: {
        session: {
          accessToken: 'accessToken',
          tokenType: 'Bearer',
          scope: 'read',
          expiresInSeconds: 31536000000,
          refreshToken: 'refreshToken',
        },
        fullProfile: {
          id: 'tUser',
          provider: 'AAP oauth2',
          email: 'test_emai@test.com',
          displayName: 'Test User',
        },
      },
    };

    const context = {
      signInWithCatalogUser: jest.fn().mockResolvedValue(undefined),
    } satisfies Partial<AuthResolverContext>;
    let error;
    try {
      await resolver(info, context as any);
    } catch (e: any) {
      error = e;
    }
    expect(error?.message).toBe(
      'Oauth2 user profile does not contain a username',
    );
  });
});
