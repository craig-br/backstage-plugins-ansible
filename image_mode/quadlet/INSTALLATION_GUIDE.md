# Installing and Configuring Ansible Self-Service Automation Portal on RHEL 9

**Target Platform**: Red Hat Enterprise Linux 9.6 or later (x86_64 architecture)

## Overview

The Ansible self-service automation portal is a solution that integrates with Red Hat Ansible Automation Platform to provide a comprehensive self-service automation experience. This guide covers the installation, configuration, and upgrade procedures for deploying the portal on Red Hat Enterprise Linux (RHEL) 9 systems with x86_64 architecture using RHEL image mode with Podman Quadlet.

This deployment method leverages RHEL 9 image mode (bootc) with Podman Quadlet to provide an immutable, container-based infrastructure with native systemd integration. This approach ensures consistent deployments, simplified management, and reliable upgrades through atomic updates.

### Product Information

- **Product Name**: Ansible self-service automation portal
- **Version**: Based on self-service automation portal 1.6
- **Supported Architecture**: x86_64 only
- **Base Operating System**: Red Hat Enterprise Linux 9.6 or later
- **Deployment Method**: RHEL image mode with Podman Quadlet

### Key Features

- Integration with self-service automation portal 1.6 for catalog and workflow management
- Direct connectivity to Red Hat Ansible Automation Platform for automation execution
- PostgreSQL 15 database for persistent data storage
- Podman Quadlet for native systemd integration
- Logically bound container images with automatic image management via bootc
- Atomic updates for both system and application components
- Dynamic plugin support for extensibility

### Deployment Architecture

This deployment uses Podman Quadlet to manage containerized services as native systemd units:

- **Portal Container**: self-service automation portal application providing the self-service portal interface (port 7007)
- **PostgreSQL Container**: PostgreSQL 15 database for catalog and state persistence (port 5432, internal only)
- **Container Network**: Isolated bridge network (`rhdh-network`) for secure service communication
- **Logically Bound Images**: Container images automatically managed by bootc for atomic updates

The deployment automatically creates the following systemd services:
- `rhdh.service` - self-service automation portal application service
- `postgres.service` - PostgreSQL database service
- `rhdh-network-network.service` - Container network service

## Prerequisites

### Starting Environment

This guide assumes you are starting with:

- A freshly installed Red Hat Enterprise Linux 9.6 or later system
- x86_64 architecture (64-bit Intel or AMD processor)
- A registered system with an active Red Hat subscription
- Root or sudo access to the system

### System Requirements

Before installing the Ansible self-service automation portal, ensure your system meets the following requirements:

#### Hardware Requirements

- **Architecture**: x86_64 (64-bit Intel or AMD processor)
- **Memory**: Minimum 4 GB RAM for building images
- **Disk Space**: Minimum 20 GB available storage for container images and disk image output
- **CPU**: 2 or more CPU cores recommended
- **Network Interface**: Active network interface with internet connectivity

#### Software Requirements

- **Operating System**: Red Hat Enterprise Linux 9.6 or later (x86_64)
- **Container Runtime**: Podman 5.4.1 or later with rootful access
- **Build Tools**: GNU Make 4.x or later
- **Network**: Active internet connection for downloading container images and packages

#### Access Requirements

- **Red Hat Subscription**: Active Red Hat subscription for accessing RHEL repositories and container images
- **Red Hat Registry Authentication**: Credentials for `registry.redhat.io`
- **Ansible Automation Platform**: Access to an Ansible Automation Platform instance with valid credentials
- **Administrative Privileges**: Root or sudo access on the target system (required for Podman Quadlet and bootc operations)

#### Integration Requirements

The self-service automation portal requires integration with the following services:

- **Ansible Automation Platform**: Version 2.4 or later
  - Valid AAP token for API access
  - OAuth client credentials for authentication
- **PostgreSQL**: Version 15 (provided via container)
- **DNS Resolution**: Proper DNS configuration for accessing external services

### Why Superuser Access is Required

This deployment uses Podman and bootc, which operate at the system level:

- **bootc-image-builder**: Requires privileged access for disk image creation, loop device management, and filesystem operations
- **Podman (rootful)**: System-level container operations and image management
- **Container Storage**: Accesses rootful container storage at `/var/lib/containers/storage`
- **Registry Authentication**: System-level registry authentication for pulling base images

### Network Requirements

Ensure the following ports are available and accessible:

- **Port 7007**: self-service automation portal web interface
- **Port 5432**: PostgreSQL database (internal container network only)
- **Port 22**: SSH access to VM

Outbound connectivity is required for:

- Red Hat Container Catalog: `registry.redhat.io`
- Ansible Automation Platform instance
- Red Hat package repositories

## Initial RHEL 9 System Setup

Start with a freshly installed RHEL 9.6 or later system.

For installation guidance, see: [RHEL 9 Installation Guide](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/performing_a_standard_rhel_installation)

Update the system:

```bash
sudo dnf update -y
sudo reboot  # if kernel was updated
```

### Configuring Repository Access for Cloud Systems

**⚠️ IMPORTANT FOR CLOUD SYSTEMS (AWS/GCP/Azure/etc.):**

If you are running on a cloud-deployed RHEL system, you must configure your system to use CDN repositories instead of RHUI repositories before building. RHUI repositories use region-specific URLs that do not work inside containers during the build process.

**Note**: Your system is likely already registered to your Red Hat account with Simple Content Access, which gives you full access to RHEL content. The issue is just that cloud systems default to using RHUI repositories. These steps switch your system to use CDN repositories instead.

**Check if you are on a cloud system:**

```bash
dnf repolist | grep -i rhui
```

If you see repositories with "rhui" in the name (e.g., `rhel-9-appstream-rhui-rpms`), follow these steps:

#### Step 1: Enable Subscription Manager Repository Management

Cloud systems have subscription-manager repo management disabled by default. Enable it:

```bash
# Enable subscription-manager to manage repositories and auto-enable yum plugins
sudo subscription-manager config --rhsm.manage_repos=1 --rhsm.auto_enable_yum_plugins=1

# Verify configuration
sudo subscription-manager config --list | grep -E "manage_repos|auto_enable"
```

You should see:
- `manage_repos = [1]`
- `auto_enable_yum_plugins = [1]`

#### Step 2: Disable RHUI Repositories

```bash
# Disable RHUI repositories
sudo dnf config-manager --set-disabled \
    rhel-9-appstream-rhui-rpms \
    rhel-9-baseos-rhui-rpms \
    rhui-client-config-server-9 2>/dev/null || true
```

#### Step 3: Enable CDN Repositories

```bash
# Enable RHEL 9 CDN repositories
sudo subscription-manager repos \
    --enable=rhel-9-for-x86_64-baseos-rpms \
    --enable=rhel-9-for-x86_64-appstream-rpms

# Verify CDN repos are enabled
dnf repolist
```

You should now see:
- `rhel-9-for-x86_64-appstream-rpms`
- `rhel-9-for-x86_64-baseos-rpms`

#### Step 4: Test Repository Access

```bash
# This should work without errors
sudo dnf makecache
```

If you see metadata downloading successfully, your cloud system is now configured for building!

#### Step 5: Disable Third-Party Repositories (if present)

```bash
# Check for third-party repos
dnf repolist

# Disable them if found (examples - adjust based on what you see)
sudo dnf config-manager --set-disabled google-cloud-cli
sudo dnf config-manager --set-disabled packages-microsoft-com-prod
```

**Your cloud system is now ready to build the bootc image using CDN repositories.**

**For Standard On-Premises RHEL Systems:**

If `dnf repolist` already shows CDN repositories (`rhel-9-for-x86_64-appstream-rpms`, `rhel-9-for-x86_64-baseos-rpms`), you can skip this section entirely. Your system is already configured correctly.

## Checking System Readiness

Verify your system meets the requirements:

```bash
# Check RHEL version and architecture
cat /etc/redhat-release  # Should show RHEL 9.6 or later
uname -m                  # Should show x86_64

# Verify subscription
sudo subscription-manager status  # Should show "Overall Status: Current"

# Verify required tools
sudo podman --version  # Should show 5.4.1 or later
make --version         # Should show GNU Make 4.x or later

# Check disk space
df -h /var/lib/containers  # Should have at least 20 GB free
```

If subscription is not active:

```bash
sudo subscription-manager register
sudo subscription-manager attach --auto
```

**Important:** The build process requires an active RHEL subscription to install packages from RHEL repositories. Ensure your system is properly registered before building.

### Red Hat Registry Authentication

Authenticate to `registry.redhat.io` and save the credentials directly to the build directory. This authentication file will be embedded in the bootc image to allow automatic pulling of RHDH container images during deployment.

```bash
# Navigate to your quadlet directory
cd <your-installation-path>/image_mode/quadlet

# Authenticate and save credentials to the files directory
podman login --authfile files/auth.json registry.redhat.io
```

Enter your Red Hat account credentials when prompted.

**Note**: 
- The auth.json file contains your registry credentials and will be embedded in the bootc image
- This file is automatically git-ignored and should not be committed to version control
- Rootless podman authentication is sufficient - the file will be read during the build process

### Installing Required RHEL 9 Packages

Install the required packages for building bootc images:

```bash
sudo dnf install -y podman container-tools make
```

## Installation

This section provides detailed instructions for installing the Red Hat Ansible Automation Platform Self-Service Portal using the Podman Quadlet deployment method on your RHEL 9 system.

### Production Deployment Best Practices

**Before you begin**, understand the security considerations for production deployments:

**Required for Production:**
- ✅ Custom VM credentials (not default `admin/admin123`)
- ✅ SSH key authentication with `SSH_SECURITY_MODE=keys-only`
- ✅ Strong, randomly generated passwords for all services
- ✅ Unique `BACKEND_SECRET` and `POSTGRES_PASSWORD`
- ✅ TLS certificate validation enabled (`NODE_TLS_REJECT_UNAUTHORIZED=1`)
- ✅ Valid AAP OAuth credentials
- ✅ Secure network configuration and firewall rules

**Testing/Development Shortcuts:**
- Default credentials (`admin/admin123`) are provided for quick testing only
- Password-based SSH authentication is available but not recommended
- These shortcuts must **never** be used for production deployments

**This guide assumes you are deploying for production** unless explicitly noted otherwise.

### Obtaining the Installation Files

1. Download or extract the Self-Service Portal installation files to your RHEL 9 system. The files may be provided as:
   - A compressed archive (tar.gz or zip file)
   - A git repository
   - From Red Hat delivery mechanisms

**Choose a working directory** where you want to install the portal files. This can be:
- Your home directory: `~/projects/`
- Any location where you have read/write access
- Ensure at least 20 GB of free disk space

Example using a compressed archive:

```bash
# Choose your installation directory
INSTALL_DIR=~/projects

cd $INSTALL_DIR
tar -xzf ansible-self-service-portal-<version>.tar.gz
cd ansible-self-service-portal/image_mode/quadlet
```

Or using git:

```bash
# Choose your installation directory
INSTALL_DIR=~/projects

cd $INSTALL_DIR
git clone <repository-url> ansible-self-service-portal
cd ansible-self-service-portal/image_mode/quadlet
```

2. Ensure you have read/write access to the directory (no ownership changes needed if using your home directory).

### Preparing the Installation Environment

**Prerequisites**: Before continuing, ensure you have completed the following from the "Initial RHEL 9 System Setup" section:
- ✅ System is registered with subscription-manager (if using CDN repos)
- ✅ Authenticated to registry.redhat.io
- ✅ Installed required packages (podman, container-tools, make)

**Note**: You will also need to copy your SSH public key to the `quadlet/files/` directory during the credential configuration step below.

1. Navigate to the quadlet directory:

```bash
cd <your-installation-path>/image_mode/quadlet
```

Replace `<your-installation-path>` with wherever you extracted the files.

All commands in this guide assume you are in the `quadlet/` directory.

2. Verify the installation files are present:

```bash
ls -la
```

You should see the following key files:
- `Containerfile.rhdh-bootc-quadlet` - Container image definition
- `Makefile` - Build and deployment automation
- `rhdh.container` - portal Quadlet service definition
- `postgres.container` - PostgreSQL Quadlet service definition
- `rhdh-network.network` - Network Quadlet definition
- `portal.env.example` - Portal and database configuration template
- `credentials.env.example` - VM credentials template
- `validate-quadlet.sh` - Configuration validation script
- `build-quadlet.sh` - Image build script
- `INSTALLATION_GUIDE.md` - This installation guide

### Configuring Environment Variables

Before building and deploying, you must configure environment variables. This deployment uses two configuration files:

1. **`.portal.env`** - Portal application and database settings (REQUIRED)
2. **`.credentials.env`** - VM access credentials and SSH keys (OPTIONAL, but recommended for production)

#### Step 1: Copy Configuration Files

```bash
# Navigate to your quadlet directory
cd <your-installation-path>/image_mode/quadlet

# Copy portal configuration (creates hidden file)
cp portal.env.example .portal.env

# Copy VM credentials (creates hidden file)
cp credentials.env.example .credentials.env
```

Both files are hidden (start with `.`) and automatically git-ignored for security.

#### Step 2: Configure Portal Environment (REQUIRED)

Edit `.portal.env` in your editor. This file contains all configuration for the portal application and PostgreSQL database.

**Minimum Required Configuration:**

```bash
# Ansible Automation Platform Configuration
AAP_HOST_URL=https://your-aap-instance.example.com
AAP_TOKEN=your-aap-api-token

# OAuth Configuration for AAP Authentication
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Backend Authentication (generate a secure random key)
BACKEND_SECRET=your-backend-secret-key-here-must-be-set

# Database Password (used by both portal and PostgreSQL)
POSTGRES_PASSWORD=secure_admin_password_123
```

**Generate Secure Secrets:**

```bash
# Backend secret
openssl rand -base64 32

# Database password
openssl rand -base64 32
```

Copy the generated values into `.portal.env`.

**Obtain AAP Credentials:**

1. Log in to your Ansible Automation Platform instance
2. Navigate to **Administration** > **Applications**
3. Create a new OAuth2 application or use an existing one
4. Copy the Client ID and Client Secret
5. Navigate to **Users** > **Tokens** and create an API token

**Database Configuration:**

The `.portal.env` file uses a simple flag to choose between local and external PostgreSQL:

**Option 1: Local PostgreSQL Container (DEFAULT)**
- Set `USE_EXTERNAL_POSTGRES=false` (default)
- Uses included `postgres.container` for automatic PostgreSQL deployment
- Recommended for testing, development, or single-node deployments
- Update `POSTGRES_PASSWORD` to a secure value
- No other changes needed

**Option 2: External PostgreSQL Server (Production)**
- Set `USE_EXTERNAL_POSTGRES=true`
- Update the database connection settings:
  ```bash
  USE_EXTERNAL_POSTGRES=true
  
  # Comment out the local container settings and uncomment these:
  POSTGRES_HOST=db.prod.example.com
  POSTGRES_USER=rhdh_user
  POSTGRES_PASSWORD=<your-secure-password>
  BACKEND_DATABASE_CONNECTION_SSL=true
  ```
- The `postgres.container` file will automatically be skipped (no need to delete it)
- See `EXTERNAL-POSTGRES-SETUP.md` for complete external database setup

**Optional Configuration:**

The `.portal.env` file also supports:
- **GitHub/GitLab Integration**: Only required for private repositories or GitHub Enterprise/self-hosted GitLab. Add `GITHUB_TOKEN`/`GITLAB_TOKEN` and update URLs if needed. Public repositories work without tokens.
- **Custom Ports**: Change `BASE_URL` if modifying the default port (see below)
- **Environment Mode**: Set `PORTAL_ENVIRONMENT=development` for development mode
- **Logging**: Adjust `LOG_LEVEL` for debugging

See `ENV_SETUP.md` for complete variable reference.

#### Step 3: Configure VM Credentials (REQUIRED for Production)

**⚠️ IMPORTANT**: The default VM credentials (`admin/admin123`) are **insecure** and must **never** be used in production. Configure custom credentials before building.

Edit `.credentials.env` in your editor to set secure access credentials.

**Default Configuration: SSH Key Authentication (Production-Ready)**

**Step 1: Generate or prepare your SSH key**

If you don't have an SSH key yet:

```bash
# Generate a new SSH key in your .ssh directory
ssh-keygen -t ed25519 -f ~/.ssh/portal_vm_key -C "vm-access-$(date +%Y%m%d)"

# Set secure permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/portal_vm_key
chmod 644 ~/.ssh/portal_vm_key.pub
```

**Step 2: Copy the public key to the files directory**

The SSH key must be in the `quadlet/files/` directory for the image build to access it:

```bash
# Navigate to your quadlet directory
cd <your-installation-path>/image_mode/quadlet

# Copy your public key to the files directory
cp ~/.ssh/portal_vm_key.pub files/

# Or if using an existing key:
cp ~/.ssh/id_ed25519.pub files/portal_vm_key.pub

# Verify the key is in place
ls -la files/*.pub
```

**Step 3: Configure .credentials.env**

Edit `.credentials.env` and specify the path relative to the build context:

```bash
# Custom username
ADMIN_USER=prodadmin

# Strong passwords (generate with: openssl rand -base64 32)
ADMIN_PASSWORD=<your-generated-password>
ROOT_PASSWORD=<your-generated-password>

# SSH public key path (relative to build context - use quadlet/files/ prefix)
SSH_PUBLIC_KEY_FILE=quadlet/files/portal_vm_key.pub

# Require SSH keys only (disables password authentication)
SSH_SECURITY_MODE=keys-only
```

**Security Notes:**
- Keep private keys in `~/.ssh/` directory only (never copy private keys to the build context)
- Only the public key (.pub) should be copied to the build context
- Public keys are automatically git-ignored
- Use specific key names (e.g., `portal_vm_key`) instead of default `id_ed25519`

**Apply the configuration:**

```bash
# Verify your credentials are set (passwords will not be shown)
grep -E "ADMIN_USER|SSH_SECURITY_MODE|SSH_PUBLIC_KEY_FILE" .credentials.env
```

**Important Security Notes:**
- SSH key authentication is **strongly recommended** for production
- Credentials are embedded at **build time** and cannot be changed without rebuilding
- The `.credentials.env` file is automatically git-ignored
- Never commit credentials to version control

**For detailed SSH security options**, see `CUSTOM_CREDENTIALS.md` and `SSH_SECURITY_GUIDE.md`.

---

**Alternative Configuration for Testing/Development Only**

**⚠️ WARNING**: The following options are **NOT SECURE** for production use.

<details>
<summary><strong>Option: Password-Only Authentication (Development/Testing Only)</strong></summary>

```bash
# Custom username
ADMIN_USER=testadmin

# Change from defaults (still use strong passwords)
ADMIN_PASSWORD=$(openssl rand -base64 24)
ROOT_PASSWORD=$(openssl rand -base64 24)

# No SSH key
SSH_PUBLIC_KEY_FILE=

# Allow password authentication
SSH_SECURITY_MODE=password-only
```

**Use this only for**:
- Local development environments
- Temporary testing VMs
- Non-sensitive demonstrations

</details>

<details>
<summary><strong>Option: Use Default Credentials (Quick Testing Only)</strong></summary>

**🚨 DANGER**: Skip editing `.credentials.env` only for **immediate local testing**. Default credentials:
- Username: `admin`
- Password: `admin123`
- Root password: `root123`
- SSH: Password authentication enabled

**These credentials are publicly documented and completely insecure.**

**Acceptable use cases**:
- Quick functionality verification on isolated networks
- Throwaway VMs that will be destroyed immediately
- Initial proof-of-concept testing

**Never use for**:
- Any system accessible from a network
- Systems containing any data
- Systems that will exist longer than a single test session

</details>

#### Step 4: Review and Verify Configuration

Before building, verify your configuration is production-ready:

```bash
# Verify portal configuration
grep -E "AAP_HOST_URL|OAUTH_CLIENT_ID|BASE_URL|BACKEND_SECRET" .portal.env

# Verify VM credentials are customized
grep -E "ADMIN_USER|SSH_SECURITY_MODE|SSH_PUBLIC_KEY_FILE" .credentials.env
```

**Production Readiness Checklist:**

- [ ] `.portal.env` has unique `BACKEND_SECRET` (not the example value)
- [ ] `.portal.env` has unique `POSTGRES_PASSWORD` (not the example value)
- [ ] `.portal.env` has valid AAP credentials (`AAP_HOST_URL`, `AAP_TOKEN`)
- [ ] `.portal.env` has valid OAuth credentials (`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`)
- [ ] Database configured: Local container OR external database setup complete
- [ ] `.credentials.env` has custom `ADMIN_USER` (not "admin")
- [ ] `.credentials.env` has custom `ADMIN_PASSWORD` (not "admin123")
- [ ] `.credentials.env` has `SSH_PUBLIC_KEY_FILE` configured with your public key path
- [ ] `.credentials.env` has `SSH_SECURITY_MODE=keys-only` for production
- [ ] `NODE_TLS_REJECT_UNAUTHORIZED=1` in `.portal.env` (secure by default)

**⚠️ For Production**: All checklist items must be completed before deploying.

### Changing the Default Port (Optional)

The portal listens on port 7007 by default. To change this:

**⚠️ Note**: Podman Quadlet does not support environment variables for port configuration. You must edit both the `.container` file and `.portal.env`.

1. Edit `rhdh.container` in your editor.

2. Locate the `PublishPort=` line and change it (format is `HostPort:ContainerPort`):

```
PublishPort=8080:7007
```

This maps host port 8080 to container port 7007.

3. Edit `.portal.env` in your editor and update the `BASE_URL` to match:

```bash
BASE_URL=http://localhost:8080
```

4. Rebuild and redeploy for changes to take effect (after completing initial setup).

### Validating Configuration

Validate the configuration:

```bash
make validate
```

Expected: `✅ All Quadlet configuration checks passed`

Fix any errors before proceeding.

### Verifying Repository Configuration

Before building, verify your repositories are configured correctly.

**⚠️ If you are on a cloud system (AWS/GCP/Azure), ensure you completed the "Configuring Repository Access for Cloud Systems" section in the Initial RHEL 9 System Setup above.**

**Verify your repository configuration:**

```bash
dnf repolist
```

You should see:
- `rhel-9-for-x86_64-appstream-rpms`
- `rhel-9-for-x86_64-baseos-rpms`

**If you see RHUI repositories** (e.g., `rhel-9-appstream-rhui-rpms`), go back to the "Configuring Repository Access for Cloud Systems" section in Initial RHEL 9 System Setup and follow those steps.

**Test repository access:**

```bash
sudo dnf makecache
```

This should complete successfully without errors.

**System Requirements Summary:**
- ✅ **Standard RHEL with CDN repos**: Ready to build
- ✅ **Cloud RHEL configured with CDN repos**: Ready to build (after completing cloud configuration steps)
- ❌ **Cloud RHEL with RHUI only**: Must configure CDN repos first (see Initial Setup section)

### Building the Bootc Image

Build the bootc image (takes 10-15 minutes):

```bash
sudo make build-local
```

This builds a RHEL 9 bootc image with embedded Quadlet services for the portal and PostgreSQL.

Expected: `✅ Local build completed: rhdh-bootc-quadlet:latest`

### Creating Disk Images

The bootc image can be converted to various disk formats for deployment.

**QCOW2 format (for virtualization):**

```bash
sudo make qcow2-local
```

Output: `output/qcow2/disk.qcow2`

**ISO format (for bare metal installation):**

```bash
sudo make iso-local
```

Output: `output/image/install.iso`

The image creation process takes 10-15 minutes.

**Your bootc image is now ready for deployment.**

You can:
- Deploy to a VM (see next section)
- Install on bare metal using the ISO
- Deploy to cloud infrastructure
- Push to a container registry for bootc upgrades

## Deploying to Virtual Machine (Optional)

This section describes how to deploy the bootc image to a local virtual machine for testing or development.

### Prerequisites for VM Deployment

**Additional hardware requirements:**
- Memory: Minimum 8 GB RAM total (4 GB for host, 4 GB for VM)
- Disk: Additional 20 GB for VM disk

**Install virtualization tools:**

```bash
sudo dnf install -y libvirt virt-install qemu-kvm
sudo systemctl enable --now libvirtd
```

### Creating the Virtual Machine

Create and start a VM from the QCOW2 image:

```bash
make vm-create-local
```

The VM will start automatically. First boot takes 3-5 minutes for services to initialize.

### Getting VM IP Address

```bash
make vm-ip
```

### Accessing the Portal

After the VM is running and services have started (3-5 minutes):

1. **Web Interface**: Open a web browser and navigate to:

```
http://<vm-ip-address>:7007
```

Replace `<vm-ip-address>` with the IP address from `make vm-status`.

2. **SSH Access**: Connect to the VM via SSH:

**For production deployments (SSH keys configured):**

```bash
ssh <your-admin-user>@<vm-ip-address>
```

Your SSH key will authenticate automatically.

**For testing deployments (default credentials):**

```bash
ssh admin@<vm-ip-address>
```

Default credentials (if `.credentials.env` not customized):
- Username: `admin`
- Password: `admin123`

**🚨 STOP**: If you're using default credentials, this deployment is **NOT SECURE** for production. You must:
1. Destroy this VM: `make vm-destroy-local`
2. Configure `.credentials.env` with SSH keys (see Step 3)
3. Rebuild and redeploy: `make clean && make deploy-vm-local`

**Note**: If you configured SSH keys with `SSH_SECURITY_MODE=keys-only`, password authentication is disabled and you must use your SSH key.

### Verifying the VM Deployment

Test the portal:

```bash
make test-vm
```

Expected: `✅ Portal is responding on http://<vm-ip>:7007`

Check services:

```bash
ssh <your-admin-user>@<vm-ip-address>
sudo systemctl status rhdh.service postgres.service
```

Both should show `Active: active (running)`.

## Post-Installation Verification

### Security Verification (Production Deployments)

Verify SSH key authentication:

```bash
ssh <your-admin-user>@<vm-ip-address> whoami
```

Should show your custom username without password prompt.

### Service Health Check

Run the health check:

```bash
ssh <your-admin-user>@<vm-ip-address> sudo /usr/local/bin/health-check.sh
```

Expected: All services healthy.

### Access the Portal

1. Navigate to `http://<vm-ip-address>:7007`
2. Authenticate with your Ansible Automation Platform OAuth credentials
3. Verify portal dashboard loads and AAP resources are accessible

## Configuration

This section provides detailed information about configuring the self-service automation portal.

### Configuration Files Overview

The quadlet deployment uses the following configuration files:

| File | Purpose | Location |
|------|---------|----------|
| `.portal.env` | Portal and database environment variables (consolidated) | `quadlet/.portal.env` |
| `rhdh.container` | portal Quadlet service definition | `quadlet/rhdh.container` |
| `postgres.container` | PostgreSQL Quadlet service definition | `quadlet/postgres.container` |
| `rhdh-network.network` | Container network definition | `quadlet/rhdh-network.network` |
| `config.toml` | Disk configuration for bootc-image-builder | `quadlet/config.toml` |

### Environment Variable Configuration

#### Portal Configuration (.portal.env)

The `.portal.env` file contains all environment variables for both the portal application and PostgreSQL database. This consolidated approach eliminates password duplication and ensures configuration consistency. The file is hidden (starts with `.`) for security.

**Core Configuration:**

```bash
# Environment mode (production or development)
PORTAL_ENVIRONMENT=production

# Base URL - Auto-detected at startup based on VM IP
BASE_URL=http://localhost:7007

# TLS Configuration
NODE_TLS_REJECT_UNAUTHORIZED=1  # TLS certificate validation enabled by default
# Set to 0 only for development with self-signed certificates
```

**Important Security Note:** TLS certificate validation is enabled by default (`NODE_TLS_REJECT_UNAUTHORIZED=1`) to ensure secure connections. Only disable this for development environments with self-signed certificates.

**Port Configuration Note:** The port is configured in `rhdh.container` using the `PublishPort=` directive. Podman Quadlet does not support environment variable substitution for this directive, so port changes require editing the `.container` file directly. After changing the port in `rhdh.container`, you must also update `BASE_URL` in `.portal.env` to match.

**Ansible Automation Platform Integration:**

```bash
# AAP Server Configuration
AAP_HOST_URL=https://your-aap-instance.example.com
AAP_TOKEN=your-aap-api-token

# OAuth Configuration
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
```

**Database Configuration:**

```bash
# PostgreSQL Connection (connects to rhdh-postgres container)
POSTGRES_HOST=rhdh-postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_admin_password_123
POSTGRES_DB=rhdh_backstage

# Database Client Configuration
BACKEND_DATABASE_CLIENT=pg
BACKEND_DATABASE_CONNECTION_HOST=${POSTGRES_HOST}
BACKEND_DATABASE_CONNECTION_PORT=${POSTGRES_PORT}
BACKEND_DATABASE_CONNECTION_USER=${POSTGRES_USER}
BACKEND_DATABASE_CONNECTION_PASSWORD=${POSTGRES_PASSWORD}
BACKEND_DATABASE_CONNECTION_DATABASE=${POSTGRES_DB}
BACKEND_DATABASE_CONNECTION_SSL=false
```

**Authentication:**

```bash
# Backend Authentication Secret
BACKEND_SECRET=your-backend-secret-key-here-must-be-set

# Authentication Provider Override
ENABLE_AUTH_PROVIDER_MODULE_OVERRIDE=true
```

**Logging:**

```bash
# Logging Level (error, warn, info, debug)
LOG_LEVEL=info

# Node.js Options
NODE_OPTIONS=--no-node-snapshot
```

**GitHub Integration (Optional):**

Only required for:
- Private GitHub repositories
- GitHub Enterprise (custom URL)

```bash
GITHUB_URL=https://github.com  # Change for GitHub Enterprise
GITHUB_TOKEN=<GITHUB_TOKEN>
```

To generate a GitHub token:
1. Navigate to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`, `read:user`, `user:email`
4. Generate and copy the token

**GitLab Integration (Optional):**

Only required for:
- Private GitLab repositories
- Self-hosted GitLab (custom URL)

```bash
GITLAB_URL=https://gitlab.com  # Change for self-hosted GitLab
GITLAB_TOKEN=<GITLAB_TOKEN>
```

To generate a GitLab token:
1. Navigate to https://gitlab.com/-/profile/personal_access_tokens
2. Create new token with name "Portal Integration"
3. Select scopes: `read_api`, `read_repository`, `read_user`
4. Generate and copy the token

**Note**: Public repositories work without authentication tokens.

**Optional Integrations:**

```bash
# Analytics (Segment)
SEGMENT_WRITE_KEY=your-segment-write-key
```

**PostgreSQL Configuration (in .portal.env):**

All PostgreSQL configuration is in the same `.portal.env` file:

```bash
# PostgreSQL Container Configuration
POSTGRESQL_DATABASE=${POSTGRES_DB}
POSTGRESQL_USER=rhdh_user
POSTGRESQL_PASSWORD=secure_rhdh_password_123
POSTGRESQL_ADMIN_PASSWORD=${POSTGRES_PASSWORD}  # Automatically synced

# PostgreSQL Performance Tuning
POSTGRESQL_MAX_CONNECTIONS=100
POSTGRESQL_SHARED_BUFFERS=256MB
POSTGRESQL_EFFECTIVE_CACHE_SIZE=1GB
```

**Key Point**: `POSTGRES_PASSWORD` is defined once and automatically used for `POSTGRESQL_ADMIN_PASSWORD` via variable reference. This eliminates password duplication and sync errors.

### Changing Network Ports

#### Changing the Portal Port

The self-service automation portal listens on port 7007 by default. To change the exposed port:

**Important:** Podman Quadlet does not support environment variable substitution for the `PublishPort=` directive. Port changes require editing both the `.container` file and `.portal.env`.

1. Edit `rhdh.container` in your editor to change the published port.

Modify the `PublishPort=` line (format is `HostPort:ContainerPort`):

```
PublishPort=8080:7007
```

This maps host port 8080 to container port 7007. The container always listens on port 7007 internally; only the host port is changed.

2. Edit `.portal.env` in your editor to update the BASE_URL.

Update the BASE_URL to match your new port:

```bash
BASE_URL=http://localhost:8080
```

3. Rebuild and redeploy:

```bash
make clean
make deploy-vm-local
```

**Why can't this be in .portal.env only?** Podman Quadlet's `.container` files don't support variable substitution for directives like `PublishPort=`. The `EnvironmentFile=` directive only passes variables into the running container, not for use in the Quadlet file itself.

#### Changing the PostgreSQL Port

The PostgreSQL port is only accessible within the container network and generally should not be changed. If needed:

1. Edit `postgres.container`:

Edit `postgres.container` in your editor.

2. Add a `PublishPort=` line (normally not present):

```
PublishPort=5433:5432
```

3. Update `POSTGRES_PORT` in `.portal.env`:

```bash
POSTGRES_PORT=5433
```

### Customizing VM Resources

To change the VM memory or CPU allocation:

1. Edit the `Makefile`:

Edit `Makefile` in your editor.

2. Modify the configuration variables near the top:

```makefile
VM_MEMORY := 8192  # Memory in MB
VM_VCPUS := 4      # Number of vCPUs
```

3. Recreate the VM:

```bash
make vm-destroy-local
make vm-create-local
```

### Customizing Disk Size

To change the VM disk size:

1. Edit `config.toml`:

Edit `config.toml` in your editor.

2. Modify the `minsize` value:

```toml
[[customizations.filesystem]]
mountpoint = "/"
minsize = "40GiB"
```

3. Rebuild the QCOW2 image:

```bash
make clean-outputs
make qcow2-local
```

### Applying Configuration Changes

After modifying configuration files, you must rebuild and redeploy:

**For environment variable changes only (.portal.env):**

```bash
make clean
make deploy-vm-local
```

**For Quadlet configuration changes (*.container files):**

```bash
make clean
make deploy-vm-local
```

**For Containerfile changes:**

```bash
make clean
make build-local
make deploy-vm-local
```

## Upgrading

This section describes procedures for upgrading the self-service automation portal to a newer version.

### Upgrade Overview

Upgrades for the Podman Quadlet deployment can be performed using:

- **Image replacement**: Build a new bootc image and deploy a new VM
- **Atomic update** (within VM): Use `bootc upgrade` for system and application updates

### Pre-Upgrade Checklist

Before upgrading, complete the following tasks:

1. **Backup Configuration**: Back up all configuration files and custom settings
2. **Export Database**: Perform a PostgreSQL database backup
3. **Document Current State**: Note the current image version and VM configuration
4. **Review Release Notes**: Check the release notes for breaking changes and new requirements
5. **Test Upgrade**: Perform the upgrade in a test environment first
6. **Schedule Downtime**: Plan for service downtime during the upgrade process

### Backing Up Data

#### Backup Configuration Files

Create a backup of all configuration files:

```bash
cd /path/to/image_mode/quadlet
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .portal.env .credentials.env rhdh.container postgres.container \
  rhdh-network.network config.toml
```

#### Backup PostgreSQL Database

From the host system:

```bash
ssh admin@<vm-ip-address> \
  "sudo podman exec rhdh-postgres pg_dump -U postgres rhdh_backstage" \
  > backup-$(date +%Y%m%d).sql
```

Or backup the entire data volume:

```bash
ssh admin@<vm-ip-address> \
  "sudo podman volume export postgres-data --output -" \
  > postgres-data-backup-$(date +%Y%m%d).tar
```

#### Backup VM Disk Image

```bash
make vm-status  # Note the current VM state
sudo cp /var/lib/libvirt/images/rhdh-quadlet-vm.qcow2 \
  /var/lib/libvirt/images/rhdh-quadlet-vm-backup-$(date +%Y%m%d).qcow2
```

### Upgrade Method 1: Image Replacement (Recommended)

This method creates a new VM with the upgraded image alongside the existing one.

#### Procedure

1. Update the installation files:

```bash
cd /path/to/image_mode/quadlet
git pull origin main
```

Or extract the new version:

```bash
tar -xzf image_mode-<new-version>.tar.gz
```

2. Review and merge configuration changes:

Compare your backed-up configuration with the new defaults:

```bash
diff ~/config-backup-<date>/.portal.env .portal.env
```

Merge any new required settings into your configuration.

3. Build the new bootc image:

```bash
make clean
make build-local
```

4. Create a new QCOW2 image:

```bash
make clean-outputs
make qcow2-local
```

5. Create a new VM with a different name:

Edit the `Makefile` temporarily:

```makefile
VM_NAME := rhdh-quadlet-vm-new
```

Then create the new VM:

```bash
make vm-create-local
```

6. Wait for the new VM to start and verify it:

```bash
make vm-status
make test-vm
```

7. Restore the database backup (if needed):

```bash
NEW_VM_IP=$(sudo virsh domifaddr rhdh-quadlet-vm-new | grep ipv4 | awk '{print $4}' | cut -d'/' -f1)
cat backup-<date>.sql | ssh admin@$NEW_VM_IP \
  "sudo podman exec -i rhdh-postgres psql -U postgres rhdh_backstage"
```

8. Test the new VM thoroughly.

9. Once satisfied, switch to the new VM:

```bash
# Stop the old VM
make vm-stop  # (old VM name)

# Update VM_NAME in Makefile back to original
# Or update DNS/load balancer to point to new VM
```

10. After confirming the new VM works correctly, remove the old VM:

```bash
sudo virsh undefine rhdh-quadlet-vm --remove-all-storage
```

### Upgrade Method 2: Atomic Update Within VM

This method uses bootc's atomic update capability to upgrade the running VM.

#### Procedure

This method requires that you have pushed the new image to a container registry.

1. Build and push the new bootc image to a registry:

```bash
make login
make build
make push
```

2. SSH into the running VM:

```bash
ssh admin@<vm-ip-address>
```

3. Inside the VM, run the bootc upgrade:

```bash
sudo bootc upgrade
```

This command:
- Pulls the latest bootc image from the registry
- Updates logically bound container images
- Prepares a new system state
- Requires a reboot to activate

4. Reboot the VM:

```bash
sudo reboot
```

5. After reboot, verify the upgrade:

```bash
sudo bootc status
sudo systemctl status rhdh.service postgres.service
sudo /usr/local/bin/health-check.sh
```

6. If issues occur, rollback to the previous state:

```bash
sudo bootc rollback
sudo reboot
```

### Post-Upgrade Verification

After completing the upgrade:

1. Verify service health:

```bash
make test-vm
```

2. SSH into the VM and check services:

```bash
ssh admin@<vm-ip-address>
sudo systemctl status rhdh.service postgres.service
sudo /usr/local/bin/health-check.sh
```

3. Test authentication:

Log in to the portal and verify OAuth authentication works correctly.

4. Test Ansible Automation Platform integration:

Navigate to automation templates and verify connectivity to AAP.

5. Check plugin functionality:

Verify that all dynamic plugins are loaded and functional.

6. Review logs for errors:

```bash
ssh admin@<vm-ip-address>
sudo journalctl -u rhdh.service -n 100
sudo journalctl -u postgres.service -n 100
```

Address any errors or warnings in the logs.

### Rolling Back an Upgrade

#### Rollback Method 1: Restore Previous VM

If you performed an image replacement upgrade:

1. Stop the new VM:

```bash
make vm-stop
```

2. Restore the backed-up VM disk:

```bash
sudo cp /var/lib/libvirt/images/rhdh-quadlet-vm-backup-<date>.qcow2 \
  /var/lib/libvirt/images/rhdh-quadlet-vm.qcow2
```

3. Start the restored VM:

```bash
make vm-start
```

#### Rollback Method 2: bootc Rollback

If you used the atomic update method:

1. SSH into the VM:

```bash
ssh admin@<vm-ip-address>
```

2. Rollback to the previous bootc state:

```bash
sudo bootc rollback
```

3. Reboot:

```bash
sudo reboot
```

4. Verify the rollback:

```bash
ssh admin@<vm-ip-address>
sudo bootc status
sudo /usr/local/bin/health-check.sh
```

## Troubleshooting

This section provides solutions for common issues encountered during installation and operation.

### Pre-Deployment Issues

#### Registry Authentication Fails

**Symptom**: Error messages about authentication failures when building image.

**Solution**:

Authenticate and save credentials directly to the build directory:

```bash
# Navigate to your quadlet directory
cd <your-installation-path>/image_mode/quadlet

# Authenticate and save to the files directory
podman login --authfile files/auth.json registry.redhat.io
```

#### Validation Fails

**Symptom**: `make validate` reports errors in Quadlet configuration.

**Solution**:

1. Review the validation error messages carefully.

2. Check file syntax:

```bash
cat rhdh.container
cat postgres.container
```

3. Verify environment variables are set:

```bash
grep -E "AAP_|OAUTH_|BACKEND_SECRET" .portal.env
```

4. Ensure files have correct permissions:

```bash
chmod 644 rhdh.container postgres.container rhdh-network.network
```

#### Build Fails

**Symptom**: `make build-local` fails with errors.

**Common causes:**

1. **Subscription not active**: If you see "There are no enabled repositories" error:

```bash
# Verify subscription is active
sudo subscription-manager status

# If not active, register
sudo subscription-manager register
sudo subscription-manager attach --auto
```

2. **Authentication not configured**: Ensure you are authenticated to registry and auth.json is in the files directory:

```bash
cd <your-installation-path>/image_mode/quadlet
podman login --authfile files/auth.json registry.redhat.io
```

3. **Check rootful Podman access**:

```bash
sudo podman version
```

4. **Verify disk space**:

```bash
df -h /var/lib/containers
```

5. **Review build logs for specific errors**:

```bash
make build-local 2>&1 | tee build.log
```

### VM Deployment Issues

#### VM Creation Fails

**Symptom**: `make vm-create-local` fails with errors.

**Solution**:

1. Verify libvirt is running:

```bash
sudo systemctl status libvirtd
```

2. Check QCOW2 image exists:

```bash
ls -lh output/qcow2/disk.qcow2
```

3. Verify sufficient resources:

```bash
sudo virsh list --all
free -h
```

4. Check for conflicting VMs:

```bash
sudo virsh list --all | grep rhdh
```

If a VM with the same name exists, remove it:

```bash
make vm-destroy-local
```

#### VM Does Not Start

**Symptom**: VM fails to start or becomes unresponsive.

**Solution**:

1. Check VM status:

```bash
sudo virsh list --all
```

2. View VM console:

```bash
sudo virsh console rhdh-quadlet-vm
```

Look for boot errors or kernel panics. Press `Ctrl+]` to exit console.

3. Check libvirt logs:

```bash
sudo journalctl -u libvirtd -f
```

4. Verify VM configuration:

```bash
sudo virsh dumpxml rhdh-quadlet-vm
```

5. Increase boot timeout:

First boot of bootc images may take 5-10 minutes. Wait before troubleshooting further.

#### Cannot Obtain VM IP Address

**Symptom**: `make vm-ip` does not return an IP address.

**Solution**:

1. Wait longer (networking initialization can take 2-3 minutes):

```bash
watch -n 5 'make vm-ip'
```

2. Check VM networking:

```bash
sudo virsh domifaddr rhdh-quadlet-vm
```

3. Verify default network is active:

```bash
sudo virsh net-list --all
sudo virsh net-start default
```

4. Check VM console for network errors:

```bash
sudo virsh console rhdh-quadlet-vm
```

### Service Issues

#### Services Do Not Start

**Symptom**: Portal or PostgreSQL services fail to start inside the VM.

**Solution**:

1. SSH into the VM:

```bash
ssh admin@<vm-ip-address>
```

2. Check service status:

```bash
sudo systemctl status rhdh.service postgres.service
```

3. View service logs:

```bash
sudo journalctl -u postgres.service -n 50
sudo journalctl -u rhdh.service -n 50
```

4. Check container status:

```bash
sudo podman ps -a
```

5. Verify logically bound images:

```bash
sudo podman --storage-opt=additionalimagestore=/usr/lib/bootc/storage images
```

6. Manually restart services:

```bash
sudo systemctl restart postgres.service
sudo systemctl restart rhdh.service
```

#### Portal Not Responding

**Symptom**: Portal web interface is not accessible.

**Solution**:

1. Check portal service status:

```bash
ssh admin@<vm-ip-address>
sudo systemctl status rhdh.service
```

2. View portal logs:

```bash
ssh admin@<vm-ip-address>
sudo journalctl -u rhdh.service -f
```

3. Check container logs:

```bash
ssh admin@<vm-ip-address>
sudo podman logs rhdh
```

4. Verify port binding:

```bash
ssh admin@<vm-ip-address>
sudo ss -tulpn | grep 7007
```

5. Test local connectivity:

```bash
ssh admin@<vm-ip-address>
curl -v http://localhost:7007
```

6. Allow time for initialization:

First startup may take 2-3 minutes. Wait and retry.

#### PostgreSQL Connection Issues

**Symptom**: Portal cannot connect to PostgreSQL database.

**Solution**:

1. Verify PostgreSQL is running:

```bash
ssh admin@<vm-ip-address>
sudo systemctl status postgres.service
```

2. Check PostgreSQL logs:

```bash
ssh admin@<vm-ip-address>
sudo journalctl -u postgres.service -n 50
```

3. Test database connectivity:

```bash
ssh admin@<vm-ip-address>
sudo podman exec rhdh-postgres pg_isready -U postgres
```

4. Verify PostgreSQL is listening:

```bash
ssh admin@<vm-ip-address>
sudo podman exec rhdh-postgres psql -U postgres -c "SELECT version();"
```

5. Check container network:

```bash
ssh admin@<vm-ip-address>
sudo podman network inspect rhdh-network
```

6. Verify database exists:

```bash
ssh admin@<vm-ip-address>
sudo podman exec rhdh-postgres psql -U postgres -l
```

### Authentication Issues

#### OAuth Authentication Fails

**Symptom**: Login redirects to error page or authentication fails.

**Solution**:

1. Verify AAP credentials in configuration:

```bash
grep -E "AAP_|OAUTH_" .portal.env
```

2. Test AAP connectivity from VM:

```bash
ssh admin@<vm-ip-address>
curl -k -H "Authorization: Bearer YOUR_AAP_TOKEN" \
  https://your-aap-instance.example.com/api/v2/me/
```

3. Verify OAuth application configuration in AAP:

- Ensure redirect URI matches: `http://<vm-ip>:7007/api/auth/oidc/handler/frame`
- Verify client ID and secret match the configuration

4. Check portal logs for authentication errors:

```bash
ssh admin@<vm-ip-address>
sudo journalctl -u rhdh.service | grep -i auth
```

5. Verify BASE_URL is correctly set:

```bash
ssh admin@<vm-ip-address>
grep BASE_URL /etc/rhdh/.portal.env
```

### Performance Issues

#### Slow Response Times

**Symptom**: Portal responds slowly or times out.

**Solution**:

1. Check VM resources:

```bash
ssh admin@<vm-ip-address>
free -h
top
```

2. Verify adequate VM memory:

```bash
make vm-status
```

Ensure VM has at least 4 GB RAM allocated.

3. Review application logs for performance warnings:

```bash
ssh admin@<vm-ip-address>
sudo journalctl -u rhdh.service | grep -i "slow\|timeout\|performance"
```

4. Check database performance:

```bash
ssh admin@<vm-ip-address>
sudo podman exec rhdh-postgres psql -U postgres -d rhdh_backstage -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"
```

5. Increase VM resources:

Edit `Makefile` to increase `VM_MEMORY` and `VM_VCPUS`, then recreate the VM.

### Getting Additional Support

If issues persist after following these troubleshooting steps:

1. Gather diagnostic information:

```bash
make vm-status > diagnostics.txt
make info >> diagnostics.txt
ssh admin@<vm-ip-address> "sudo systemctl status" >> diagnostics.txt
ssh admin@<vm-ip-address> "sudo /usr/local/bin/health-check.sh" >> diagnostics.txt
```

2. Review relevant Red Hat documentation:

- self-service automation portal: https://docs.redhat.com/en/documentation/red_hat_developer_hub
- RHEL Image Mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images
- Podman Quadlet: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

3. Contact Red Hat Support with:
   - Diagnostic information
   - Steps to reproduce the issue
   - Environment details (RHEL version, Podman version, system specifications)
   - Service logs

## Additional Resources

### Red Hat Product Documentation

- **Red Hat Ansible Automation Platform Documentation**: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.6
- **self-service automation portal Documentation**: https://docs.redhat.com/en/documentation/red_hat_developer_hub/1.6
- **RHEL 9 Installation Guide**: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/performing_a_standard_rhel_installation
- **RHEL 9 Composing Images**: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_installing_and_managing_rhel_for_edge_images

### Container and Virtualization Documentation

- **Podman Documentation**: https://docs.podman.io
- **Podman Quadlet**: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- **libvirt Documentation**: https://libvirt.org/docs.html

### Technical References

- **bootc Project**: https://github.com/containers/bootc
- **systemd Service Management**: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- **PostgreSQL 15 Documentation**: https://www.postgresql.org/docs/15/

### Support and Community

- **Red Hat Customer Portal**: https://access.redhat.com
- **Red Hat Developer Portal**: https://developers.redhat.com
- **Red Hat Support**: https://access.redhat.com/support

Contact Red Hat Support for assistance with:
- Product installation and configuration issues
- Performance tuning and optimization
- Integration with Ansible Automation Platform
- Production deployment planning

### Local Documentation

The following additional documentation files are included with this deployment:

- **Architecture Guide**: See `ARCHITECTURE.md` for detailed technical architecture and design decisions
- **External PostgreSQL Setup**: See `EXTERNAL-POSTGRES-SETUP.md` for advanced database configuration options
- **Quick Start Guide**: See `README.md` for quick reference commands

## Appendix A: Environment Variables Reference

This appendix provides a complete reference of environment variables used in the Podman Quadlet deployment.

**Note**: All environment variables are consolidated in the `.portal.env` file, which is used by both the portal application and PostgreSQL container. This file is hidden (starts with `.`) and automatically git-ignored.

### Portal Configuration Variables (.portal.env)

#### Core Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORTAL_ENVIRONMENT` | Environment mode (production or development) | No | `production` |
| `BASE_URL` | Base URL for accessing the portal | Yes | `http://localhost:7007` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Enable/disable TLS certificate validation (1=enabled, 0=disabled) | No | `1` |
| `NODE_OPTIONS` | Node.js runtime options | No | `--no-node-snapshot` |

#### Ansible Automation Platform Integration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AAP_HOST_URL` | Ansible Automation Platform URL | Yes | None |
| `AAP_TOKEN` | AAP API authentication token | Yes | None |
| `OAUTH_CLIENT_ID` | OAuth client ID for AAP authentication | Yes | None |
| `OAUTH_CLIENT_SECRET` | OAuth client secret for AAP authentication | Yes | None |

#### Database Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POSTGRES_HOST` | PostgreSQL server hostname | Yes | `rhdh-postgres` |
| `POSTGRES_PORT` | PostgreSQL server port | Yes | `5432` |
| `POSTGRES_USER` | PostgreSQL username | Yes | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes | None |
| `POSTGRES_DB` | PostgreSQL database name | Yes | `rhdh_backstage` |
| `BACKEND_DATABASE_CLIENT` | Database client type | Yes | `pg` |
| `BACKEND_DATABASE_CONNECTION_HOST` | Database connection host | Yes | `${POSTGRES_HOST}` |
| `BACKEND_DATABASE_CONNECTION_PORT` | Database connection port | Yes | `${POSTGRES_PORT}` |
| `BACKEND_DATABASE_CONNECTION_USER` | Database connection user | Yes | `${POSTGRES_USER}` |
| `BACKEND_DATABASE_CONNECTION_PASSWORD` | Database connection password | Yes | `${POSTGRES_PASSWORD}` |
| `BACKEND_DATABASE_CONNECTION_DATABASE` | Database connection database | Yes | `${POSTGRES_DB}` |
| `BACKEND_DATABASE_CONNECTION_SSL` | Enable SSL for database connection | No | `false` |

#### Authentication

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BACKEND_SECRET` | Secret key for backend authentication | Yes | None |
| `ENABLE_AUTH_PROVIDER_MODULE_OVERRIDE` | Enable authentication provider override | No | `true` |

#### Logging

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LOG_LEVEL` | Application log level (error, warn, info, debug) | No | `info` |

#### Optional Integrations

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GITHUB_URL` | GitHub server URL (for GitHub Enterprise) | No | `https://github.com` |
| `GITHUB_TOKEN` | GitHub personal access token or app credentials | No | `<GITHUB_TOKEN>` |
| `GITLAB_URL` | GitLab server URL (for self-hosted instances) | No | `https://gitlab.com` |
| `GITLAB_TOKEN` | GitLab personal access token | No | `<GITLAB_TOKEN>` |
| `SEGMENT_WRITE_KEY` | Segment analytics write key | No | None |

### PostgreSQL Configuration Variables (.portal.env)

PostgreSQL configuration is in the same `.portal.env` file:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POSTGRESQL_DATABASE` | PostgreSQL database name | Yes | `rhdh_backstage` |
| `POSTGRESQL_USER` | PostgreSQL application user | Yes | `rhdh_user` |
| `POSTGRESQL_PASSWORD` | PostgreSQL application user password | Yes | None |
| `POSTGRESQL_ADMIN_PASSWORD` | PostgreSQL admin (postgres) password | Yes | None |
| `POSTGRESQL_MAX_CONNECTIONS` | Maximum number of connections | No | `100` |
| `POSTGRESQL_SHARED_BUFFERS` | Shared buffer size | No | `256MB` |
| `POSTGRESQL_EFFECTIVE_CACHE_SIZE` | Effective cache size | No | `1GB` |

## Appendix B: Port Reference

This appendix lists all network ports used in the Podman Quadlet deployment.

| Port | Protocol | Service | Exposed To | Description |
|------|----------|---------|------------|-------------|
| 7007 | TCP | HTTP | Host | self-service automation portal web interface |
| 5432 | TCP | PostgreSQL | Container network only | PostgreSQL database (not exposed to host) |
| 22 | TCP | SSH | Host | SSH access to VM |

## Appendix C: File and Directory Structure

This appendix describes the file and directory structure of the Podman Quadlet deployment.

### Build Directory Structure

```
quadlet/
├── Containerfile.rhdh-bootc-quadlet    # Container build definition
├── Makefile                             # Build and deployment automation
├── build-quadlet.sh                     # Image build script
├── validate-quadlet.sh                  # Configuration validation script
├── rhdh.container                       # portal Quadlet service definition
├── postgres.container                   # PostgreSQL Quadlet service definition
├── rhdh-network.network                 # Network Quadlet definition
├── .portal.env                          # Portal and database environment variables (consolidated)
├── config.toml                          # Disk configuration
├── ARCHITECTURE.md                      # Architecture documentation
├── EXTERNAL-POSTGRES-SETUP.md           # Database setup guide
├── README.md                            # Quick start guide
└── output/                              # Generated disk images
    └── qcow2/
        └── disk.qcow2
```

### Runtime Directory Structure (VM)

```
# bootc Image Structure
/usr/lib/bootc/bound-images.d/           # Logically bound images
├── rhdh.container                       # Portal image reference
└── postgres.container                   # PostgreSQL image reference

/usr/lib/bootc/storage/                  # bootc-managed container storage
├── registry.redhat.io/rhdh/rhdh-hub-rhel9:1.6
└── registry.redhat.io/rhel9/postgresql-15:latest

/usr/share/containers/systemd/           # Quadlet service definitions
├── rhdh.container                       # portal service
├── postgres.container                   # PostgreSQL service
└── rhdh-network.network                 # Container network

/etc/rhdh/                               # Configuration files
├── configs/                             # Application configuration
└── .portal.env                          # Environment variables (portal + database)

/var/lib/rhdh/                           # Variable data
├── local-plugins/                       # Custom Ansible plugins
├── dynamic-plugins-root/                # Dynamic plugin installations
├── generated/                           # Generated configuration
├── config/                              # Runtime configuration
├── scripts/                             # Helper scripts
└── postgres-data/                       # PostgreSQL data directory

/var/lib/pgsql/data/                     # PostgreSQL data (inside container)
```

## Appendix D: Makefile Targets Reference

This appendix provides a quick reference for all available Makefile targets in the Podman Quadlet deployment.

### Complete Workflows

| Target | Description |
|--------|-------------|
| `make deploy-vm-local` | Complete local development workflow (build + QCOW2 + VM) |
| `make deploy-vm-registry` | Complete registry-based deployment workflow |

### Build and Image Creation

| Target | Description |
|--------|-------------|
| `make validate` | Validate Quadlet configuration files |
| `make build-local` | Build bootc image locally |
| `make build` | Build bootc image for registry |
| `make qcow2-local` | Create QCOW2 from local image |

### VM Management

| Target | Description |
|--------|-------------|
| `make vm-create-local` | Create VM from local QCOW2 |
| `make vm-start` | Start VM |
| `make vm-stop` | Stop VM gracefully |
| `make vm-status` | Show VM status and info |
| `make vm-ip` | Get VM IP address |
| `make vm-console` | Connect to VM console |
| `make vm-destroy-local` | Destroy local VM and cleanup |

### Testing and Validation

| Target | Description |
|--------|-------------|
| `make test-vm` | Test portal in VM |
| `make info` | Show configuration and status |
| `make health` | Run health check |

### PostgreSQL Management

| Target | Description |
|--------|-------------|
| `make postgres-setup` | Setup PostgreSQL data directory |
| `make postgres-start` | Start PostgreSQL container |
| `make postgres-stop` | Stop PostgreSQL container |
| `make postgres-status` | Check PostgreSQL status |
| `make postgres-logs` | Show PostgreSQL logs |
| `make postgres-connect` | Connect to PostgreSQL database |
| `make postgres-destroy` | Stop and remove PostgreSQL container and data |

### Image Management

| Target | Description |
|--------|-------------|
| `make pull-all-images` | Check and pull all container images |
| `make list-quadlet-images` | List all container images used in setup |
| `make check-image-status` | Check availability status of all images |

### Registry Operations

| Target | Description |
|--------|-------------|
| `make login` | Login to container registry |
| `make tag` | Tag local image for registry |
| `make push` | Push image to registry |
| `make publish` | Build and push to registry |

### Cleanup Operations

| Target | Description |
|--------|-------------|
| `make clean` | Clean up images and temporary files |
| `make clean-outputs` | Clean output directories |
| `make clean-all` | Complete cleanup including VM |

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Product**: Red Hat Ansible Automation Platform Self-Service Portal  
**Based On**: self-service automation portal 1.6  
**RHEL Version**: Red Hat Enterprise Linux 9.6 or later  
**Architecture**: x86_64 only  
**Deployment Method**: RHEL Image Mode with Podman Quadlet and Logically Bound Images  

**Legal Notice**: Red Hat, Ansible, and Ansible Automation Platform are trademarks or registered trademarks of Red Hat, Inc. or its subsidiaries in the United States and other countries.

