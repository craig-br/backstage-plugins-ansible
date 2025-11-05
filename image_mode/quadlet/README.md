# TECH PREVIEW Installing and Configuring Ansible Self-Service Automation Portal on RHEL 9

**Target Platform**: Red Hat Enterprise Linux 9.6 or later (x86\_64 architecture)

## Overview

The [Ansible self-service automation portal](https://www.redhat.com/en/technologies/management/ansible/self-service-automation) extends Red Hat Ansible Automation Platform with a simple interface that allows users to launch pre-approved automation through guided workflows—without requiring technical expertise. The portal maintains full control and compliance by integrating directly with your existing Ansible Automation Platform setup, using the same security controls, user logins, and automation logic.

This guide covers the installation and configuration for deploying self-service automation portal on Red Hat Enterprise Linux (RHEL) 9 using RHEL image mode with Podman Quadlet.

### Deployment Architecture

This deployment uses Podman Quadlet to manage containerized services as native systemd units:

- **Portal Container**: Self-service automation portal application providing the self-service portal interface (port 7007\)  
- **PostgreSQL Container (default)**: PostgreSQL 15 database for catalog and state persistence (port 5432, internal only)  
- **Bound Images**: Container images automatically managed by bootc for atomic updates

## Prerequisites

**System Requirements:**
- Red Hat Enterprise Linux (RHEL) 9.6 or later (x86_64 architecture)
- Minimum 8 GB RAM for building container images
- Minimum 30 GB free disk space for builds and output images
- 4 CPU cores (recommended)
- Active Red Hat Enterprise Linux and Ansible Automation Platform subscription
- Root or sudo access

**Required Access:**
- Red Hat registry credentials for `registry.redhat.io`
- Ansible Automation Platform 2.5 or later instance access
- User with Ansible Automation Platform administrator privileges

**Network:**
- Internet connectivity for downloading container images and packages
- Port 7007 for the portal web interface (can be changed, see [Optional Configurations](#optional-configurations))
- Port 5432 for PostgreSQL (internal container network only)
- Port 22 for SSH access to the virtual machine

> **Note for Cloud Deployments:** If running on AWS, GCP, or Azure, you must configure repository access before building. See [Cloud Systems: Repository Configuration](#cloud-systems-repository-configuration) for details.

## Step 1: Obtain the Installation Files

Download and extract the installation files to a directory with 20+ GB free space.

```shell
tar -xzf self-service-portal-rhel-installer.tar.gz
cd self-service-portal-rhel-installer
```

All commands in this guide assume you are in the installation directory.

## Step 2: Update RHEL System (Recommended)

Update your Red Hat Enterprise Linux 9.6 or later system to the latest packages:

```shell
sudo dnf update -y
sudo reboot  # Reboot if the kernel was updated
```

For complete instructions, see the [RHEL 9 System Update Guide](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_updating-software-packages_managing-software-with-the-dnf-tool).

## Step 3: Install Packages and Authenticate

Install required build tools and authenticate to the Red Hat container registry.

```shell
sudo dnf install -y podman container-tools make
```

Authenticate to the Red Hat container registry:

```shell
podman login --authfile files/auth.json registry.redhat.io
```

The `podman login` command stores your Red Hat credentials in `files/auth.json`, which will be embedded into the bootc image for pulling container images during deployment.

## Step 4: Configure Environment

Copy the example environment files and customize them for your deployment. These files configure the portal connection to Ansible Automation Platform, database settings, and virtual machine access credentials. The example files include all available options with descriptions.

```shell
cp portal.env.example .portal.env
cp credentials.env.example .credentials.env
```

Both files are hidden files (prefixed with a period) and are automatically excluded from Git version control to protect sensitive information.

### A. Configure Portal (.portal.env)

Edit the `.portal.env` file to configure build settings, Ansible Automation Platform integration, database settings, and optional integrations.

**Build Configuration:**

The `.portal.env` file includes build configuration options that control the image name and VM settings. Most users can keep the default values:

```shell
# Build Configuration (optional - defaults are suitable for most deployments)
IMAGE_NAME=rhaap-portal-image
IMAGE_TAG=latest
VM_NAME=rhaap-portal-vm
VM_MEMORY=4096
VM_VCPUS=2
```

These settings control:
- `IMAGE_NAME`: The name of the container image created during the build
- `IMAGE_TAG`: The version tag for the container image
- `VM_NAME`: The name assigned to test virtual machines
- `VM_MEMORY`: Memory allocated to virtual machines (in MB)
- `VM_VCPUS`: Number of CPU cores for virtual machines

**Base URL Configuration:**

The portal's `BASE_URL` is automatically detected when the VM starts up based on the VM's IP address. You can keep the default value (`http://localhost:7007`) during the build - it will be updated automatically at deployment time. Manual configuration is only needed if using a specific hostname or proxy.

**Required - Ansible Automation Platform Integration:**

```shell
AAP_HOST_URL=https://<your-aap-instance.example.com>
AAP_TOKEN=<your-aap-api-token-here>
OAUTH_CLIENT_ID=<your-oauth-client-id-here>
OAUTH_CLIENT_SECRET=<your-oauth-client-secret-here>
```

To obtain these credentials from Ansible Automation Platform:
1. **OAuth Application**: Navigate to **Administration** → **Applications** and create a new OAuth2 application. Copy the Client ID and Client Secret.
2. **API Token**: Navigate to **Users** → **Tokens** and create a new token with Platform Administrator privileges.

**Required - Backend Secret:**

```shell
BACKEND_SECRET=<your-secure-backend-secret-here>
```

This value must be a secure random string. You can generate a secure string by running the command: `openssl rand -base64 32`

**Database Configuration:**

By default, the deployment includes a PostgreSQL 15 database container. You can optionally connect to an existing external PostgreSQL database instead.

**Option 1: Local PostgreSQL Container (Default)**

The default configuration deploys a PostgreSQL 15 container alongside the portal. This is suitable for testing, development, or single-node deployments:

```shell
USE_EXTERNAL_POSTGRES=false
POSTGRES_PASSWORD=<your-secure-database-password-here>
```

**Option 2: External PostgreSQL Database**

Use an existing PostgreSQL database for production or high-availability deployments:

```shell
USE_EXTERNAL_POSTGRES=true
POSTGRES_HOST=<your-database-host.example.com>
POSTGRES_PORT=5432
POSTGRES_USER=<your-database-username>
POSTGRES_PASSWORD=<your-secure-database-password-here>
POSTGRES_DB=portal
BACKEND_DATABASE_CONNECTION_SSL=true
```

You can generate a secure password for either option by running the command: `openssl rand -base64 32`

For optional integrations (GitHub/GitLab, custom ports), see [Optional Configurations](#optional-configurations).

### B. Configure Virtual Machine Credentials (.credentials.env)

Configure secure access credentials for the virtual machine. These credentials are embedded at build time and cannot be changed without rebuilding the image. SSH key authentication is strongly recommended for production deployments.

Generate secure passwords using the following command:
```shell
openssl rand -base64 32
```

Edit `.credentials.env` with your values:
```shell
ADMIN_USER=prodadmin
ADMIN_PASSWORD=<your-secure-admin-password-here>
ROOT_PASSWORD=<your-secure-root-password-here>
SSH_PUBLIC_KEY_FILE=files/<your-ssh-key-name>.pub
SSH_SECURITY_MODE=keys-only
```

**SSH Key Setup:**

You can use an existing SSH key pair or generate a new one. Only the SSH public key (`.pub` file) will be embedded in the image. Never copy the private key to the build directory.

If you need to generate a new SSH key:

```shell
ssh-keygen -t ed25519 -f ~/.ssh/portal_vm_key
```

Copy your SSH public key to the files directory:

```shell
cp ~/.ssh/<your-ssh-key>.pub files/
```

Update the `SSH_PUBLIC_KEY_FILE` variable in the configuration above to match your key filename.

**SSH Security Modes:**
- `keys-only` - SSH key authentication only (recommended for production)
- `keys-and-password` - Both SSH key and password authentication enabled
- `password-only` - Password authentication only (not recommended for production)

## Step 5: Build Images

Build the bootc container image and convert it to a bootable disk format for deployment.

```shell
# Build bootc image (10-15 minutes)
sudo make build-local

# Create disk image (choose one):
sudo make qcow2-local  # For VMs: output/qcow2/disk.qcow2
sudo make iso-local    # For bare metal: output/image/install.iso
```

## Upgrading

Upgrade to a new version of the portal by building updated images and deploying them to your environment.

### Step 1: Backup Database

Create a backup of your database before upgrading:

```shell
ssh admin@<vm-ip> "sudo podman exec portal-postgres pg_dump -U postgres portal" > backup-$(date +%Y%m%d).sql
```

### Step 2: Extract New Version

Extract the new version to a temporary location:

```shell
tar -xzf ansible-self-service-portal-<new-version>.tar.gz
cd ansible-self-service-portal
```

### Step 3: Update Configuration

Copy your existing configuration files:

```shell
# Copy your existing configuration (update path to your current installation)
cp /path/to/old-installation/.portal.env .
cp /path/to/old-installation/.credentials.env .

# Review for any new configuration options
diff portal.env.example .portal.env
```

### Step 4: Build Updated Images

Build the new bootc image and create the disk image:

```shell
sudo make build-local
sudo make qcow2-local
```

The upgraded QCOW2 image is now available in `output/qcow2/disk.qcow2`. Deploy this image using your preferred deployment method.

### Step 5: Deploy and Migrate Data

Deploy the new image to your target environment. The deployment process depends on your infrastructure:

**For virtual machines:**
- Deploy a new VM using the updated `output/qcow2/disk.qcow2` image
- If using a local PostgreSQL container, restore your database backup

**For bare metal:**
- Build an ISO image: `sudo make iso-local`
- Deploy the ISO to your target system

**Database migration (local PostgreSQL only):**

If using a local PostgreSQL container, restore your backup after deploying the new image:

```shell
# Copy backup to new system
scp backup-<date>.sql admin@<new-system-ip>:~/

# SSH into new system
ssh admin@<new-system-ip>

# Restore database
cat backup-<date>.sql | sudo podman exec -i portal-postgres psql -U postgres -d portal
```

If using an external database, no migration is needed—the new deployment will connect to the existing database.

## Optional Configurations

### GitHub/GitLab Integration

Required for importing custom templates from private repositories or accessing self-hosted instances.

To create tokens:
- **GitHub**: Navigate to [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) and create a token with `repo` scope (for private repos) or `public_repo` scope (for public repos only).
- **GitLab**: Navigate to [User Settings → Access Tokens](https://gitlab.com/-/profile/personal_access_tokens) and create a token with `read_api` scope.

Add these to your `.portal.env` file:

```shell
# GitHub (for private repositories or GitHub Enterprise)
GITHUB_URL=https://github.com  # Change for GitHub Enterprise
GITHUB_TOKEN=ghp_<your-github-token-here>  # Scope: repo or public_repo

# GitLab (for private repositories or self-hosted GitLab)
GITLAB_URL=https://gitlab.com  # Change for self-hosted GitLab
GITLAB_TOKEN=glpat-<your-gitlab-token-here>  # Scope: read_api
```

### Changing the Default Port

By default, the portal listens on port 7007. To configure the portal to use a different port, complete the following steps before building the image:

**1. Edit the Quadlet service file:**

```shell
vi portal.container
```

Change the `PublishPort` line:
```
PublishPort=8080:7007
```

**2. Update the base URL in `.portal.env`:**

The `BASE_URL` is automatically detected at VM startup. If you change the port, update the port number in `.portal.env`:

```shell
BASE_URL=http://localhost:8080
```

After deployment, this will automatically become `http://<vm-ip>:8080` when the VM starts.

## Cloud Systems: Repository Configuration

**This configuration is required for cloud systems only (AWS, GCP, Azure).** If you are running on-premises, skip this section.

Cloud Red Hat Update Infrastructure (RHUI) repositories do not work inside containers. This step configures your system to use Content Delivery Network (CDN) repositories instead.

**To check if you have RHUI repositories:**

```shell
dnf repolist | grep -i rhui
```

If the command returns repositories with "rhui" in the name, such as `rhel-9-appstream-rhui-rpms`, complete the following steps before building:

```shell
# Enable subscription-manager
sudo subscription-manager config --rhsm.manage_repos=1 --rhsm.auto_enable_yum_plugins=1

# Disable RHUI repos
sudo dnf config-manager --set-disabled rhel-9-appstream-rhui-rpms rhel-9-baseos-rhui-rpms rhui-client-config-server-9

# Enable CDN repos
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms --enable=rhel-9-for-x86_64-appstream-rpms
```

## Appendix: Configurable Fields

Reference guide for all configurable environment variables and settings.

### Portal Environment Variables (.portal.env)

**Build Configuration:**

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAGE_NAME` | Container image name | `rhaap-portal-image` |
| `IMAGE_TAG` | Container image version tag | `latest` |
| `VM_NAME` | Virtual machine name | `rhaap-portal-vm` |
| `VM_MEMORY` | VM memory allocation (MB) | `4096` |
| `VM_VCPUS` | VM CPU cores | `2` |
| `REGISTRY` | Container registry for pushing images | `localhost` |
| `NAMESPACE` | Registry namespace (if required) | - |

**Required Configuration:**

| Variable | Description | Example |
|----------|-------------|---------|
| `AAP_HOST_URL` | Ansible Automation Platform URL | `https://aap.example.com` |
| `AAP_TOKEN` | AAP API authentication token | Generated from AAP |
| `OAUTH_CLIENT_ID` | OAuth application client ID | From AAP Applications |
| `OAUTH_CLIENT_SECRET` | OAuth application secret | From AAP Applications |
| `BACKEND_SECRET` | Backend authentication secret | Generate with `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | PostgreSQL database password | Generate with `openssl rand -base64 32` |

**Optional Configuration:**

| Variable | Description | Default |
|----------|-------------|---------|
| `PORTAL_ENVIRONMENT` | Environment mode | `production` |
| `BASE_URL` | Portal base URL (auto-detected at VM startup) | `http://localhost:7007` |
| `LOG_LEVEL` | Logging level | `info` |
| `GITHUB_URL` | GitHub server URL | `https://github.com` |
| `GITHUB_TOKEN` | GitHub access token (private repos) | - |
| `GITLAB_URL` | GitLab server URL | `https://gitlab.com` |
| `GITLAB_TOKEN` | GitLab access token (private repos) | - |

**Database Configuration:**

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_EXTERNAL_POSTGRES` | Use external database | `false` |
| `POSTGRES_HOST` | Database hostname | `portal-postgres` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_USER` | Database username | `postgres` |
| `POSTGRES_DB` | Database name | `portal` |
| `BACKEND_DATABASE_CONNECTION_SSL` | Enable SSL for database | `false` |

### VM Credentials (.credentials.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_USER` | VM admin username | `prodadmin` |
| `ADMIN_PASSWORD` | Admin user password | `<your-secure-password>` |
| `ROOT_PASSWORD` | Root user password | `<your-secure-password>` |
| `SSH_PUBLIC_KEY_FILE` | Path to SSH public key | `files/<your-ssh-key>.pub` |
| `SSH_SECURITY_MODE` | SSH authentication mode | `keys-only` (recommended) |

**Note:** Generate secure passwords using: `openssl rand -base64 32`

**SSH Security Modes:**
- `keys-only` - SSH key authentication only (recommended for production)
- `keys-and-password` - Both SSH key and password authentication enabled
- `password-only` - Password authentication only (not recommended)

### Network Ports

| Port | Service | Exposure | Description |
|------|---------|----------|-------------|
| 7007 | HTTP | Host | Portal web interface (customizable) |
| 5432 | PostgreSQL | Internal | Database (container network only) |
| 22 | SSH | Host | VM remote access |  
