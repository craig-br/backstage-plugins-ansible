# Test plugins for ansible experience

To test plugins for ansible experience you need:

- container image with authentication plugin for Red Hat AAP
- built plugins for ansible experince

The container image and built plugins are tested using rhdh-local repo.

You also need to create token and OAuth2 app in AAP.
Instructions are in repo `ansible-rhdh-plugins`, in individual plugin Readme.

- AAP token, see `plugins/catalog-backend-module-rhaap/README.md` (fork `kcagran`, branch `rhaap-catalog-sync`)
- AAP OAuth2 app, see `plugins/auth-backend-module-rhaap-provider/README.md` (fork `kcagran`, branch `rhaap-oauth2`)

## Obtain container image

There are two options, choose one.

### Pull prebuild image

Ask Yuval Lahav (Red Hat) for access to this image.

```bash
docker pull quay.io/ylahav/backstage-showcase:latest
```

### Build locally

Note - we build using podman (Dockerfile has more that 127 layers, and overlay2 filesystem cannot be used).

```bash
git clone git@github.com:ansible/backstage-showcase.git
cd backstage-showcase
git checkout rh-plugins-auth-only

./docker/build-container-image.sh rhaap-auth-1
```

## Build plugins

```bash
git clone git@github.com:ansible/ansible-rhdh-plugins.git
cd ansible-rhdh-plugins

cat <<EOF >pack_all_ansible_experience.sh
#!/bin/bash
git status
read -p "Check status, Ctrl+C to stop, Enter to continue..." blabla
echo -e '\n\n\n========================================= catalog-backend-module-rhaap'
./.github/actions/pack/pack_one.sh plugins/catalog-backend-module-rhaap
echo -e '\n\n\n========================================= scaffolder-backend-module-backstage-rhaap'
./.github/actions/pack/pack_one.sh plugins/scaffolder-backend-module-backstage-rhaap
echo -e '\n\n\n========================================= self-service'
./.github/actions/pack/pack_one.sh plugins/self-service
EOF

bash pack_all_ansible_experience.sh
ls -al dynamic-plugins-archives
```

## Start application with rhdh-local

```bash
git clone https://github.com/justinc1/rhdh-local.git
cd rhdh-local
git checkout deploy-rh-plugins
cp env.sample .env

# setup AAP URL, token, OAuth2 app
# change image if needed
nano .env

cp ../ansible-rhdh-plugins/dynamic-plugins-archives/* local-plugins/

docker compose up
```
