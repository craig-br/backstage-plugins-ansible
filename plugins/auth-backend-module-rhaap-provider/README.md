# auth-backend-module-rhaap-provider

The auth-backend-module-rhaap-provider is authentication plugin for Red Hat Ansible Automation Platform.

Note: the auth-backend-module-rhaap-provider is used only for authentication.
For AAP user to be able to login into RHDH, also plugin catalog-backend-module-rhaap is needed.
The catalog-backend-module-rhaap plugin synchronizes users from AAP into RHDH.

## Installation

Currently (Nov. 2024) the plugin must be a static plugin,
as there is no support for dynamic authentication plugin in Red Hat Developer Hub.
Support for dynamic authentication plugin is expected in 2025.

Installation requires building a new container image.
Plugin code was added to [private backstage-showcase](https://github.com/kcagran/backstage-showcase) git repo, branch `rh-plugins-auth-only`.
To build new container image follow instructions from main [backstage-showcase](https://github.com/janus-idp/backstage-showcase) repo.

```shell
git clone https://github.com/kcagran/backstage-showcase backstage-showcase-auth-rhaap
cd backstage-showcase-auth-rhaap
git checkout rh-plugins-auth-only

IMAGE_TAG=backstage-showcase:auth-rhaap-1
podman build -f docker/Dockerfile -t $IMAGE_TAG .
```

The image needs to be started with environ `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Configuration

### AAP, Create OAuth2 application

OAuth2 application needs to be created in the AAP.
Required properties:

- Organization: Default
- Authorization grant type: Authorization code
- Client type: confidential
- Redirect URIs: "https://RHDH_IP_OR_DNS_NAME/api/auth/rhaap/handler/frame"

### RHDH,

Fragment for `app-config.local.yaml`:

```yaml
enableExperimentalRedirectFlow: true
signInPage: rhaap
auth:
  environment: development
  providers:
    rhaap:
      host: { $AAP_URL }
      checkSSL: false
      clientId: { $AAP_OAUTH_CLIENT_ID }
      clientSecret: { $AAP_OAUTH_CLIENT_SECRET }
      signIn:
        resolvers:
          - resolver: usernameMatchingUser
```
