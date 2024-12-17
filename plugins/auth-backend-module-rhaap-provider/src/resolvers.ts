import {
  AuthResolverContext,
  createSignInResolverFactory,
  OAuthAuthenticatorResult,
  PassportProfile,
  SignInInfo,
} from '@backstage/plugin-auth-node';
import { AuthenticationError } from '@backstage/errors';
import { ConfigSources } from '@backstage/config-loader';
import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';

export namespace AAPAuthSignInResolvers {
  export const usernameMatchingUser = createSignInResolverFactory({
    create() {
      return async (
        info: SignInInfo<OAuthAuthenticatorResult<PassportProfile>>,
        ctx: AuthResolverContext,
      ) => {
        const { result } = info;
        const username = result.fullProfile.username;
        if (!username) {
          throw new AuthenticationError(
            `Oauth2 user profile does not contain a username`,
          );
        }
        try {
          const signedInUser = await ctx.signInWithCatalogUser({
            entityRef: { name: username },
          });
          return Promise.resolve(signedInUser);
        } catch (e) {
          const config = await ConfigSources.toConfig(
            ConfigSources.default({}),
          );
          const dangerouslyAllowSignInWithoutUserInCatalog =
            config.getOptionalBoolean(
              'dangerouslyAllowSignInWithoutUserInCatalog',
            ) || false;
          if (!dangerouslyAllowSignInWithoutUserInCatalog) {
            throw new AuthenticationError(
              `Sign in failed: User not found in the RH AAP software catalog. Verify that users/groups are synchronized to the software catalog. For non-production environments, manually provision the user or disable the user provisioning requirement. Refer to the RH AAP Authentication documentation for further details.`,
            );
          }
          const userEntity = stringifyEntityRef({
            kind: 'User',
            name: username,
            namespace: DEFAULT_NAMESPACE,
          });

          return ctx.issueToken({
            claims: {
              sub: userEntity,
              ent: [userEntity],
            },
          });
        }
      };
    },
  });
}
