# Self-Service Automation Portal Installer

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Table of Contents

* [Overview](#overview)
  * [Deployment Architecture](#deployment-architecture)
* [Requirements](#requirements)
  * [Build Host Requirements](#build-host-requirements)
  * [Portal VM Requirements](#portal-vm-requirements)
  * [Ansible Automation Platform Requirements](#ansible-automation-platform-requirements)
* [Preparing the Host System](#preparing-the-host-system)
  * [Update RHEL System](#update-rhel-system-recommended)
  * [Install Required Packages](#install-required-packages)
  * [Cloud-based build systems only: Repository Configuration](#cloud-based-build-systems-only-repository-configuration)
* [Installation](#installation)
  * [Step 1: Extract the Installer](#step-1-extract-the-installer)
  * [Step 2: Understand Configuration Requirements](#step-2-understand-configuration-requirements)
  * [Step 3: Configure Inventory](#step-3-configure-inventory)
  * [Step 4: Run the Installer](#step-4-run-the-installer)
* [Configuration](#configuration)
  * [Optional Variables](#optional-variables)
  * [Bootc Image Customization](#bootc-image-customization)
  * [Portal Sync Configuration](#portal-sync-configuration-with-aap)
  * [SSL/TLS Configuration](#ssltls-configuration)
  * [External Database Configuration](#external-database-configuration)
* [Usage Examples](#usage-examples)
  * [Quick Start Installation](#quick-start-installation)
  * [Build Bootc Image Only](#build-bootc-image-only)
  * [Convert to Multiple Formats](#convert-to-multiple-formats)
  * [Skip Preflight Checks](#skip-preflight-checks)
* [Day 2 Operations](#day-2-operations)
  * [Upgrade](#upgrade)
  * [Backup](#backup)
  * [Restore](#restore)
  * [Rollback](#rollback)
* [Offline Installation](#offline-installation)
* [Runtime Configuration](#runtime-configuration)
* [Full Inventory Example](#full-inventory-example)
* [Troubleshooting](#troubleshooting)

## Overview

This installer deploys self-service automation portal that provides non-technical users access to Ansible Automation Platform job templates. The installer uses Ansible to build bootable container (bootc) images that can be deployed as VMs or cloud instances.

**Key Features:**
- Self-service access to Ansible Automation Platform automation
- Automated synchronization of AAP job templates
- Bootable VM images (QCOW2, VMDK, RAW, ISO formats)
- Integrated authentication with Ansible Automation Platform
- Offline/disconnected installation support

### Deployment Architecture

This deployment uses Podman Quadlet and RHEL Image mode to manage containerized services as native systemd units:

- **Portal Container**: Self-service automation portal application providing the web interface (port 7007)
- **PostgreSQL Container (default)**: PostgreSQL 15 database for catalog and state persistence (port 5432, internal only)
- **Bootc Images**: Container images automatically managed by bootc for atomic updates

**Build Process:**
1. The installer runs on your RHEL build host
2. Creates a bootc container image with embedded portal configuration
3. Converts the bootc image to your chosen disk format (QCOW2, ISO, etc.)
4. You deploy the resulting image to your target environment

**Target Platforms:**

The installer provides the following disk image formats:
- QCOW2
- VMDK
- RAW
- ISO

## Requirements

### Build Host Requirements

The build host is where you run the installer to create portal images.

**Operating System:**
- Red Hat Enterprise Linux 9.6 or later

**Hardware:**
- **CPU:** 4 cores minimum, 8 cores recommended
- **RAM:** 8 GB minimum, 16 GB recommended
- **Disk:**
  - **Minimum:** 30 GB free space
  - **Recommended:** 60 GB free space for multiple builds and image formats
  - **Note:** Each image format requires approximately 10-15 GB of temporary space during conversion
  - Automatic cleanup removes intermediate artifacts after successful builds

**Software:**
- ansible-core 2.16 or 2.17 (compatible with AAP 2.5 and 2.6)
- Podman 4.6 or later
- Active Red Hat subscription

**Network:**
- Administrator access to Ansible Automation Platform instance
- Access to registry.redhat.io (or local mirror for offline installation)

### Portal VM Requirements

The portal VM is the deployed virtual machine running the self-service automation portal.

**Hardware:**
- **CPU:** 4 cores minimum, 8 cores recommended
- **RAM:** 8 GB minimum, 16 GB recommended
- **Disk:** 60 GB minimum

**Network:**
- TCP 7007 accessible to end users (port is customizable, SSL termination at load balancer/proxy)
- HTTPS access to Ansible Automation Platform
- SSH (TCP 22) for administrative access

### Ansible Automation Platform Requirements

**AAP Version:**
- Ansible Automation Platform 2.5 or later

**AAP Configuration:**

For detailed instructions on creating API tokens and OAuth applications, see the [Ansible Automation Platform Administration Guide](https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/).

**Required:**
- **API Token** with Administrator privileges (scope: read for syncing data from AAP)
- **OAuth2 Application** for portal authentication
  - Authorization grant type: Authorization code
  - Redirect URI: `https://<portal-hostname>:7007/api/auth/rhaap/handler/frame`

## Preparing the Host System

Before running the installer, prepare your Red Hat Enterprise Linux 9 build host with required packages and authentication.

### Update RHEL System (Recommended)

Update your Red Hat Enterprise Linux 9.6 or later system to the latest packages:

```shell
sudo dnf update -y
sudo reboot  # Reboot if the kernel was updated
```

For complete instructions, see the [RHEL 9 System Update Guide](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_updating-software-packages_managing-software-with-the-dnf-tool).

### Install Required Packages

Install Ansible Core and Podman:

```shell
sudo dnf install -y ansible-core podman
```

**Verify installations:**

```shell
ansible --version  # Should show 2.16 or 2.17
podman --version   # Should show 4.6 or later
```

### Cloud-based build systems only: Repository Configuration

**This configuration is required for cloud-based systems only (AWS, GCP, Azure).** If you are running on-premises, skip this section.

This step configures your system to use Content Delivery Network (CDN) repositories instead of the Cloud Red Hat Update Infrastructure (RHUI) repositories.

**To check if you have RHUI repositories:**

```shell
dnf repolist | grep -i rhui
```

If the command returns repositories with "rhui" in the name, such as `rhel-9-appstream-rhui-rpms`, complete the following steps:

```shell
# Enable subscription-manager
sudo subscription-manager config --rhsm.manage_repos=1 --rhsm.auto_enable_yum_plugins=1

# Disable RHUI repos
sudo dnf config-manager --set-disabled rhel-9-appstream-rhui-rpms rhel-9-baseos-rhui-rpms rhui-client-config-server-9

# Enable CDN repos
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms --enable=rhel-9-for-x86_64-appstream-rpms
```

## Installation

### Step 1: Extract the Installer

Extract the installer tarball and navigate to the directory:

```bash
# Extract the installer
tar xzf self-service-portal-installer-latest.tar.gz
cd self-service-portal-installer-latest

# View contents
ls -la
```

The installer contains:
- `collections/` - Ansible collection with all installation roles and playbooks
- `inventory` - Inventory file with required and optional configuration
- `README.md` - This documentation
- `OFFLINE-INSTALL.md` - Offline installation guide
- `ansible.cfg` - Ansible configuration
- `vars.yml.example` - Example encrypted variables file
- `app-config.override.example.yaml` - Runtime configuration example

### Step 2: Understand Configuration Requirements

Before editing the inventory, understand what configuration is needed.

#### Required Variables

These variables **must** be configured in your inventory file:

| Name | Description | Example |
| ---- | ----------- | ------- |
| aap_host_url | Ansible Automation Platform controller URL | `https://aap.example.com` |
| aap_token | AAP API token with Administrator privileges | Generate in AAP web UI |
| oauth_client_id | OAuth application client ID from AAP | From AAP Applications |
| oauth_client_secret | OAuth application client secret from AAP | From AAP Applications |
| backend_secret | Portal backend authentication secret (32+ chars) | `openssl rand -base64 32` |
| postgres_password | PostgreSQL database password (16+ chars) | `openssl rand -base64 32` |
| admin_password | Admin user password for VM access (16+ chars) | `openssl rand -base64 32` |
| ssh_public_key_file | Path to SSH public key file | `~/.ssh/id_ed25519.pub` |
| registry_username | Red Hat Customer Portal username | Your Red Hat account |
| registry_password | Red Hat Customer Portal password | Your Red Hat account |

**Registry Authentication:**

The installer uses your Red Hat Registry credentials (`registry_username` and `registry_password`) to:
1. **Build-time authentication**: Pull the RHEL bootc base image during the build process on your build host
2. **Upgrade-time authentication**: Enable bootc system upgrades on deployed VMs (credentials are injected temporarily during upgrade operations)

During installation, these credentials are:
- Used by the build host to authenticate and pull container images
- Stored in the inventory file for future upgrade operations
- **NOT embedded in the bootc image** for improved security

During upgrades, these credentials are:
- Temporarily injected to `/etc/containers/auth.json` on the target VM
- Used by `bootc upgrade` to pull updated base images from the registry
- Automatically removed after the upgrade completes

**Security Note:** 
- Registry credentials are never embedded in the bootc image layers
- Credentials only exist on the deployed VM during upgrade operations (temporary)
- Image can be safely shared or pushed to registries without exposing credentials
- The generated `files/auth.json` file (if created during development) is automatically excluded from version control via `.gitignore`

### Security Considerations

This installer creates environment-specific deployment artifacts that contain embedded secrets. Both the bootc container image and output disk images contain credentials configured in the inventory file.

**What is embedded:**
- Portal backend secret
- Database passwords
- AAP connection credentials (URL, token, OAuth secrets)
- Optional: GitHub/GitLab tokens

**Where secrets are embedded:**
- Bootc container image (created by podman build)
- Output disk images (qcow2, vmdk, raw, iso files)

**Security requirements:**
- Do not push bootc container images to public registries
- Do not share output disk image files between environments
- Store artifacts in private, access-controlled locations
- Each environment (dev/staging/prod) requires its own image build

**Why secrets are embedded:**

Image-mode deployments are pre-configured, immutable artifacts designed for immediate deployment. Each portal instance is environment-specific and connects to a specific AAP controller with unique credentials.

**Rotating secrets:**

To rotate secrets, rebuild the image:
1. Update credentials in inventory file
2. Run: `ansible-playbook -i inventory ansible.portal_setup.install`
3. Deploy new image
4. Remove old image files

**Registry credentials:**

Registry credentials are NOT embedded. They are used only on the build host during image creation and temporarily during bootc system upgrades.

#### SSH Access Configuration

The installer configures SSH access for the admin user account. Choose the security mode appropriate for your environment:

| Mode | Security | SSH Key Required | Password SSH | Production Use |
|------|----------|------------------|--------------|----------------|
| keys-only | Most Secure | Yes | Disabled | Recommended |
| keys-and-password | Balanced | Optional | Enabled | Acceptable |
| password-only | Least Secure | No | Enabled | Not Recommended |

**Important Notes:**
- Console/serial access is always available with password, regardless of SSH mode
- If using keys-only (default), you must provide an SSH public key
- The warning "Password SSH disabled" is expected and correct for keys-only mode
- The `admin_password` (configured in Required Variables) is used for console and SSH access

**Example - Production (most secure):**

```ini
ssh_public_key_file=~/.ssh/portal_vm_key.pub
vm_ssh_mode=keys-only

# Note: admin_password from Required Variables section is used for console access
```

**Example - Production with flexibility:**

```ini
ssh_public_key_file=~/.ssh/portal_vm_key.pub
vm_ssh_mode=keys-and-password

# Note: admin_password from Required Variables section is used for console and SSH access
```

**Generating an SSH Key:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/portal_vm_key -C "portal-admin"
```

#### Optional: Using Ansible Vault for Sensitive Information

Use an external Ansible variable file secured with `ansible-vault` for sensitive information:

```bash
# Create encrypted vars file
ansible-vault create vars.yml
```

Example `vars.yml` content:

```yaml
backend_secret: "your-generated-backend-secret"
postgres_password: "your-generated-postgres-password"
admin_password: "your-generated-admin-password"
aap_token: "your-aap-token"
oauth_client_secret: "your-oauth-secret"
registry_password: "your-rh-password"
```

### Step 3: Configure Inventory

Now that you understand the requirements, edit the inventory file with your configuration.

The installer uses an Ansible inventory file for all configuration. The inventory file contains:
- **Required Configuration** - Variables you must set (marked with `<set your own>`)
- **Optional Configuration** - Variables with sensible defaults (can be customized)
- **Advanced Options** - Rarely used options (commented out, uncomment as needed)

**Edit the inventory:**

```bash
vi inventory
```

**Example Basic Inventory:**

```ini
[portal_build_host]
localhost ansible_connection=local

[all:vars]
# AAP Connection
aap_host_url=https://aap.example.com
aap_token=your-aap-api-token
oauth_client_id=your-oauth-client-id
oauth_client_secret=your-oauth-client-secret

# Security Secrets
backend_secret=your-backend-secret
postgres_password=your-postgres-password
admin_password=your-admin-password

# SSH Access
ssh_public_key_file=~/.ssh/id_ed25519.pub

# Red Hat Registry Credentials
registry_username=your-rh-username
registry_password=your-rh-password
```

For advanced configuration options, see [Configuration](#configuration).

For a complete inventory example with all available options, see [Full Inventory Example](#full-inventory-example).

### Step 4: Run the Installer

**Using ansible-playbook:**

```bash
# Full installation (preflight checks + build + convert)
ansible-playbook -i inventory ansible.portal_setup.install

# With encrypted vars file
ansible-playbook -i inventory -e @vars.yml --ask-vault-pass ansible.portal_setup.install
```

**Using ansible-navigator (recommended for execution environments):**

```bash
# Full installation
ansible-navigator run ansible.portal_setup.install -i inventory -m stdout

# With encrypted vars file
ansible-navigator run ansible.portal_setup.install -i inventory -e @vars.yml --ask-vault-pass -m stdout
```

**Note:** If using absolute paths for SSH keys outside the project directory with `ansible-navigator`, configure volume mounts in `~/.ansible-navigator.yml`:

```yaml
ansible-navigator:
  execution-environment:
    volume-mounts:
      - src: "{{ lookup('env', 'HOME') }}/.ssh"
        dest: "{{ lookup('env', 'HOME') }}/.ssh"
        options: "ro"
```

**Output:**

The installer creates disk images in the `output/` directory organized by format:
- `output/qcow2/<image-name>-<image-tag>.qcow2` - QCOW2 format (default: `rhaap-portal-image-latest.qcow2`)
- `output/vmdk/<image-name>-<image-tag>.vmdk` - VMware format (if configured)
- `output/raw/<image-name>-<image-tag>.raw` - RAW format (if configured)
- `output/iso/<image-name>-<image-tag>.iso` - ISO format (if configured)

## Configuration

This section provides detailed information about all available configuration options. For required configuration needed during installation, see [Step 2: Understand Configuration Requirements](#step-2-understand-configuration-requirements).

### Optional Variables

| Name | Description | Default |
| ---- | ----------- | ------- |
| portal_http_port | Portal HTTPS listen port | 7007 |
| portal_image_formats | Disk image formats to create | `['qcow2']` |
| base_url | Portal base URL (auto-detected if omitted) | Auto-detected |
| log_level | Application logging level | `info` |
| github_url | GitHub URL for template imports | `https://github.com` |
| github_token | GitHub personal access token | Not set |
| gitlab_url | GitLab URL for template imports | `https://gitlab.com` |
| gitlab_token | GitLab personal access token | Not set |

### Bootc Image Customization

Customize the bootc image for corporate compliance and specific requirements:

| Name | Description | Default |
| ---- | ----------- | ------- |
| image_name | Bootc image name (use full path for private registries) | `rhaap-portal-image` |
| image_tag | Bootc image tag | `latest` |
| admin_user | Admin username for VM access | `admin` |
| vm_ssh_mode | SSH security mode (keys-only, keys-and-password, password-only) | `keys-only` |
| portal_extra_packages | Additional packages to install (array) | `[]` |
| portal_registry_url | Custom container registry URL | `registry.redhat.io` |
| rhel_bootc_image | RHEL bootc base image (full path with tag) | `rhel9/rhel-bootc:9.6` |
| portal_user_uid | Portal service user ID | 1001 |
| portal_admin_uid | Admin user ID | 1000 |

#### Custom Image Naming and Registry Tagging

By default, the installer builds images tagged as `localhost/rhaap-portal-image:latest`. You can customize this for private registries or specific naming conventions.

**For private registries:**

```ini
# Tag for pushing to your private registry
image_name=quay.io/mycompany/portal
image_tag=v1.0.0
```

**For local builds with custom names:**

```ini
# Custom name for local environment
image_name=my-portal
image_tag=production
# Results in: localhost/my-portal:production
```

**Note:** If you specify a registry path in `image_name`, you'll need to push the image manually after building:

```bash
sudo podman push <your-registry>/<your-image>:<tag>
```

#### Changing the Default Port

By default, the portal listens on port 7007. To configure the portal to use a different port, set the `portal_http_port` variable in your inventory before building the image:

```ini
# Change portal listen port (default: 7007)
portal_http_port=8080
```

**Important:** The portal's base URL is automatically detected at VM startup based on the VM's IP address and configured port. The portal runs HTTP internally - for production deployments, configure SSL/TLS termination at your load balancer or reverse proxy. No manual BASE_URL configuration is needed - it will automatically become `http://<vm-ip>:8080` (internal) when the VM starts.

**Example - Custom port configuration:**

```ini
# Portal will listen on port 8080
portal_http_port=8080

# Ensure firewall rules allow the custom port
# Note: BASE_URL auto-detects - no manual configuration needed
```

**Example - Production configuration:**

```ini
# Custom admin username per security policy
admin_user=operator

# Require SSH keys only (most secure)
vm_ssh_mode=keys-only

# Install security and monitoring tools
portal_extra_packages=['aide','audit','rsyslog-gnutls','vim-enhanced']

# Use specific RHEL 9.6 version for compliance
rhel_bootc_image=rhel9/rhel-bootc:9.6

# Use corporate registry for disconnected environment
portal_registry_url=registry.corp.example.com

# Match corporate UID standards
portal_admin_uid=5000
```

### Portal Sync Configuration with AAP

Configure how portal synchronizes data from Ansible Automation Platform:

| Name | Description | Default |
| ---- | ----------- | ------- |
| portal_orgs_filter | AAP organization to synchronize (single org only) | Default |
| portal_job_template_sync_enabled | Enable job template synchronization | `true` |
| portal_job_template_sync_minutes | Job template sync frequency (minutes) | 60 |
| portal_job_template_survey_enabled | Filter by survey status (true/false/omit) | All templates |
| portal_job_template_labels | Filter by AAP labels (array) | All templates |
| portal_users_teams_sync_minutes | Users/teams sync frequency (minutes) | 60 |
| portal_sync_timeout_minutes | Sync operation timeout (minutes) | 15 |

**Example - Sync Production organization with only templates that have surveys:**

```ini
portal_orgs_filter=Production
portal_job_template_survey_enabled=true
portal_job_template_labels=['production','approved']
```

### SSL/TLS Configuration

The portal application runs on HTTP port 7007 internally. SSL/TLS termination should be handled at the infrastructure layer using one of the following approaches:

**Load Balancer (Recommended for Production):**
- Configure your load balancer (AWS ALB, Azure Application Gateway, GCP Load Balancer, etc.) to handle SSL termination
- Point the load balancer to the portal VM on port 7007
- Upload your SSL certificates to the load balancer

**Reverse Proxy (On-Premise):**
- Deploy nginx, HAProxy, or Apache as a reverse proxy
- Configure SSL termination on the proxy
- Proxy requests to the portal VM on port 7007

**Ingress Controller (Kubernetes/OpenShift):**
- Use an Ingress or Route with TLS configuration
- The ingress controller handles SSL termination
- Routes traffic to the portal service

This cloud-native approach offers enhanced security, simplified certificate management, and adheres to Red Hat best practices.

### External Database Configuration

By default, the portal deploys a local PostgreSQL container. For production deployments, use an external PostgreSQL database.

| Name | Description | Default |
| ---- | ----------- | ------- |
| postgres_host | PostgreSQL host (leave blank for local container) | `portal-postgres` |
| postgres_port | PostgreSQL port | 5432 |
| postgres_user | PostgreSQL username | `postgres` |
| postgres_db | PostgreSQL database name | `portal` |
| backend_database_connection_ssl | Enable SSL for database connections | `false` |

**Example - External database:**

```ini
postgres_host=db.example.com
postgres_port=5432
postgres_user=portal_user
postgres_db=portal
postgres_password=<your-database-password>
backend_database_connection_ssl=true
```

## Usage Examples

### Quick Start Installation

Build and deploy the portal with default settings:

```bash
# Edit inventory with your configuration
vi inventory

# Run the installer
ansible-playbook -i inventory ansible.portal_setup.install
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.install -i inventory -m stdout
```

### Build Bootc Image Only

Build the bootc container image without converting to disk formats:

```bash
ansible-playbook -i inventory ansible.portal_setup.build_bootc
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.build_bootc -i inventory -m stdout
```

### Convert to Multiple Formats

Create QCOW2, VMDK, and RAW disk images:

```ini
# In inventory file
portal_image_formats=['qcow2','vmdk','raw']
```

```bash
ansible-playbook -i inventory ansible.portal_setup.install
```

Or convert an existing bootc image:

```bash
ansible-playbook -i inventory ansible.portal_setup.create_image
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.create_image -i inventory -m stdout
```

### Skip Preflight Checks

Skip preflight validation checks (useful for re-runs or testing):

```bash
ansible-playbook -i inventory ansible.portal_setup.install --skip-tags preflight
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.install -i inventory --skip-tags preflight -m stdout
```

## Day 2 Operations

### Upgrade

Upgrade the portal to a newer version using one of two methods:

#### Method 1: Image Rebuild (Default)

Rebuilds the bootc image with updated components:

```bash
# Update image tag in inventory
vi inventory
# Set: portal_image_tag=v2.0.0

# Run upgrade playbook (defaults to image_rebuild method)
ansible-playbook -i inventory ansible.portal_setup.upgrade
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.upgrade -i inventory -m stdout
```

#### Method 2: Bootc System Upgrade (On-VM)

Performs a bootc system upgrade on a deployed VM. This method:
- Connects to the deployed VM via SSH
- Temporarily injects registry credentials for authentication
- Runs `bootc upgrade` to pull the latest base image
- Removes credentials after upgrade completes
- Requires a reboot to apply the upgrade

```bash
# Configure upgrade method and target in inventory
vi inventory
# Add or uncomment:
# portal_upgrade_method=bootc
# portal_target_host=portal-vm.example.com

# Run upgrade playbook
ansible-playbook -i inventory ansible.portal_setup.upgrade
```

**Note on Credentials:**
- Registry credentials are temporarily injected only during the upgrade process
- Credentials are automatically removed after the upgrade completes
- No credentials are embedded in the bootc image layers

### Backup

Create a backup of the portal database:

```bash
ansible-playbook -i inventory ansible.portal_setup.backup
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.backup -i inventory -m stdout
```

Backups are stored in `output/backups/` with timestamp.

### Restore

Restore the portal database from a backup:

```bash
ansible-playbook -i inventory ansible.portal_setup.restore -e backup_file=output/backups/portal-backup-20250101-120000.sql.gz
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.restore -i inventory -e backup_file=output/backups/portal-backup-20250101-120000.sql.gz -m stdout
```

### Rollback

Roll back to a previous portal image version:

```bash
ansible-playbook -i inventory ansible.portal_setup.rollback
```

Or with ansible-navigator:

```bash
ansible-navigator run ansible.portal_setup.rollback -i inventory -m stdout
```

## Offline Installation

For disconnected or air-gapped environments, see [OFFLINE-INSTALL.md](OFFLINE-INSTALL.md) for complete instructions.

**Quick Overview:**

1. **Create bundle on connected system:**
   ```bash
   ansible-playbook -i inventory ansible.portal_setup.bundle
   ```

2. **Transfer bundle to disconnected system**

3. **Load images on disconnected system:**
   ```bash
   podman load -i portal-bundle/images/*.tar
   ```

4. **Configure inventory for local registry:**
   ```ini
   registry_url=registry.local.example.com
   registry_username=<internal-registry-user>
   registry_password=<internal-registry-password>
   ```

5. **Run installer on disconnected system**

## Runtime Configuration

After deployment, you can modify portal behavior without needing to rebuild the image.

**Edit and copy runtime override file to portal VM:**

1. Edit the example configuration file:
   ```bash
   vi app-config.override.example.yaml
   ```

2. Copy the edited file to portal VM:
   ```bash
   scp app-config.override.example.yaml admin@portal-vm:/etc/portal/app-config.override.yaml
   ```

3. Restart portal service:
   ```bash
   ssh admin@portal-vm
   sudo systemctl restart portal.service
   ```

See `app-config.override.example.yaml` for available runtime options.

## Full Inventory Example

This is a complete inventory file with all available configuration options. Copy and customize as needed:

```ini
[portal_build_host]
localhost ansible_connection=local

[all:vars]
# ==================================================================
# REQUIRED CONFIGURATION (must set these)
# ==================================================================

# AAP Connection
aap_host_url=https://aap.example.com
aap_token=<your-aap-api-token>
oauth_client_id=<your-oauth-client-id>
oauth_client_secret=<your-oauth-client-secret>

# Security Secrets
backend_secret=<generate-with-openssl-rand-base64-32>
postgres_password=<generate-with-openssl-rand-base64-32>
admin_password=<generate-with-openssl-rand-base64-32>

# SSH Access
ssh_public_key_file=~/.ssh/id_ed25519.pub

# Registry Credentials
registry_username=<your-rh-username>
registry_password=<your-rh-password>

# ==================================================================
# OPTIONAL CONFIGURATION (defaults provided)
# ==================================================================

# Image Build Options
portal_image_name=rhaap-portal-image
portal_image_tag=latest
portal_image_formats=['qcow2']
portal_cleanup_after_build=true

# Bootc Image Customization
admin_user=admin
vm_ssh_mode=keys-only
rhel_bootc_image=rhel9/rhel-bootc:9.6
portal_user_uid=1001
portal_admin_uid=1000

# Portal Sync Configuration
portal_orgs_filter=Default
portal_job_template_sync_enabled=true
portal_job_template_sync_minutes=60
portal_users_teams_sync_minutes=60
portal_sync_timeout_minutes=15

# Registry Configuration
registry_url=registry.redhat.io
registry_auth=true
registry_tls_verify=true

# ==================================================================
# ADVANCED OPTIONS (commented - uncomment and customize as needed)
# ==================================================================

# Additional packages to install in bootc image
# portal_extra_packages=['vim-enhanced','aide','audit','rsyslog-gnutls']

# Filter templates by survey status
# portal_job_template_survey_enabled=true

# Filter templates by AAP labels
# portal_job_template_labels=['production','approved']

# External database (if set, local container will NOT be deployed)
# postgres_host=db.example.com
# postgres_port=5432
# postgres_user=postgres
# postgres_db=portal
# backend_database_connection_ssl=true

# Portal HTTPS listen port
# portal_http_port=7007

# Portal base URL (auto-detected from VM IP and port at startup)
# base_url=https://portal.example.com

# Application logging level
# log_level=info

# GitHub integration
# github_url=https://github.com
# github_token=<your-github-token>

# GitLab integration
# gitlab_url=https://gitlab.com
# gitlab_token=<your-gitlab-token>
```

## Troubleshooting

### Insufficient Disk Space During Build

**Symptom:**
- Build fails with "input/output error" or "no space left on device"
- Error message: `PermissionError` or `TimeoutError` during image conversion
- `/var/lib/containers/storage` fills up

**Check available space:**
```bash
df -h /var/lib/containers/storage
```

**Solution - Clean up container storage:**
```bash
# Remove all unused images, containers, and build cache
sudo podman system prune -af --volumes

# Verify space freed
df -h /var/lib/containers/storage
```

**Prevention:**
- Ensure at least 60 GB free space before starting builds
- Enable automatic cleanup (enabled by default): `portal_cleanup_after_build=true`
- Build one image format at a time if space is limited
- Monitor disk usage during builds: `watch df -h /var/lib/containers/storage`

**Note:** The installer automatically cleans up intermediate build artifacts after successful builds. If builds fail, manual cleanup may be required.

### Build Failures

**Check preflight requirements:**
```bash
ansible-playbook -i inventory ansible.portal_setup.install --tags preflight
```

**View detailed logs:**
```bash
ansible-playbook -i inventory ansible.portal_setup.install -vvv
```

### Connection Issues

**Test AAP connectivity:**
```bash
curl -k -H "Authorization: Bearer ${AAP_TOKEN}" https://aap.example.com/api/v2/ping/
```

**Verify OAuth configuration:**
- Check redirect URI matches: `https://<portal-hostname>:7007/api/auth/rhaap/handler/frame`
- Verify OAuth application is enabled in AAP

### Portal VM Issues

**Check portal service status:**
```bash
ssh admin@portal-vm
sudo systemctl status portal.service
```

**View portal logs:**
```bash
ssh admin@portal-vm
sudo journalctl -u portal.service -f
```

**Verify network connectivity:**
```bash
ssh admin@portal-vm
curl -k https://aap.example.com/api/v2/ping/
```

### Database Issues

**For local PostgreSQL container:**
```bash
ssh admin@portal-vm
podman ps | grep postgres
podman logs portal-postgres
```

**For external database:**
```bash
# Test connection from portal VM
psql -h db.example.com -U portal_user -d portal
```
