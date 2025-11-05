# Offline Installation Guide

## Overview

This guide explains how to install the Self-Service Automation Portal in a disconnected/air-gapped environment using only Red Hat supported container images.

## Prerequisites on Disconnected System

- Red Hat Enterprise Linux 9.6 or later
- Podman installed
- Ansible-core >= 2.16.0 (AAP 2.5/2.6 compatible)
- AAP 2.5 or 2.6 accessible (can be within disconnected network)
- Active Red Hat subscription

## Image Requirements

All container images are Red Hat supported from `registry.redhat.io`:
- `rhel9/rhel-bootc:latest` - Base bootable container image
- `rhel9/postgresql-15:latest` - PostgreSQL database
- `rhel9/bootc-image-builder:latest` - Red Hat bootc image builder

## Step 1: Create Bundle (Connected System)

On a system with internet access and Red Hat registry credentials:

```bash
cd portal-installer

# Configure inventory with your registry credentials
cp inventory inventory.local
vi inventory.local  # Set registry_username and registry_password

# Create offline bundle
ansible-navigator run ansible.portal_setup.bundle
```

This creates a `bundle/` directory containing:
- `images/*.tar` - Container images as tar archives (~5-10 GB)
- `image-list.txt` - List of included images with versions
- `README.md` - Quick reference guide

## Step 2: Transfer Bundle

Archive and transfer the bundle to your disconnected system using your organization's approved method:

```bash
# Create compressed archive
tar czf portal-bundle-$(date +%Y%m%d).tar.gz bundle/

# Transfer via approved method:
# - USB drive
# - Secure file transfer
# - Approved network transfer mechanism
```

## Step 3: Extract Bundle (Disconnected System)

```bash
# Extract bundle
tar xzf portal-bundle-20XX1030.tar.gz
cd bundle

# Verify contents
ls -lh images/
cat image-list.txt
```

## Step 4: Load Container Images

### Option A: Load into Local Podman (Simple)

Load images directly into the local podman storage:

```bash
# Load each image
for img in images/*.tar; do
  echo "Loading: $(basename $img)"
  sudo podman load -i "$img"
done

# Verify images loaded successfully
sudo podman images | grep -E 'rhel-bootc|postgresql|bootc-image-builder'
```

Expected output:
```
registry.redhat.io/rhel9/rhel-bootc                latest  abc123def456  2 weeks ago  1.2 GB
registry.redhat.io/rhel9/postgresql-15             latest  def456ghi789  3 weeks ago  450 MB
registry.redhat.io/rhel9/bootc-image-builder       latest  ghi789jkl012  1 week ago   890 MB
```

### Option B: Mirror to Internal Registry (Recommended for Production)

Push images to your internal container registry:

```bash
# Set your internal registry
LOCAL_REGISTRY=registry.example.com:5000

# Load and push each image
for img in images/*.tar; do
  # Load into podman
  sudo podman load -i "$img"
done

# Tag and push to internal registry
sudo podman tag registry.redhat.io/rhel9/rhel-bootc:latest \
  ${LOCAL_REGISTRY}/rhel9/rhel-bootc:latest
sudo podman push ${LOCAL_REGISTRY}/rhel9/rhel-bootc:latest

sudo podman tag registry.redhat.io/rhel9/postgresql-15:latest \
  ${LOCAL_REGISTRY}/rhel9/postgresql-15:latest
sudo podman push ${LOCAL_REGISTRY}/rhel9/postgresql-15:latest

sudo podman tag registry.redhat.io/rhel9/bootc-image-builder:latest \
  ${LOCAL_REGISTRY}/rhel9/bootc-image-builder:latest
sudo podman push ${LOCAL_REGISTRY}/rhel9/bootc-image-builder:latest

# Verify images in registry
curl -X GET https://${LOCAL_REGISTRY}/v2/_catalog
```

## Step 5: Configure Inventory

Copy the portal installer to the disconnected system and configure the inventory:

```bash
cd portal-installer
cp inventory inventory.local
vi inventory.local
```

### For Option A (Local Images):

```ini
# Images are already loaded locally, no registry authentication needed
# Leave registry credentials empty to disable authentication
registry_username=
registry_password=

# Note: Credentials are NOT embedded in bootc image
# For upgrades, credentials are only needed if performing bootc upgrades
```

### For Option B (Internal Registry):

```ini
# Point to your internal registry
registry_url=registry.example.com:5000

# If your internal registry requires authentication:
# These credentials are used for:
#   - Build time: Pulling images during image creation
#   - Upgrade time: Performing bootc upgrades (injected temporarily)
# Note: Credentials are NOT embedded in the bootc image
registry_username=<internal-registry-user>
registry_password=<internal-registry-password>

# Note: For self-signed certificates, you may need to configure
# the system trust store on the build host before running the installer
```

### Configure Required Portal Settings:

```ini
# AAP Configuration (must be accessible from disconnected system)
aap_host_url=https://aap.internal.example.com
aap_token=<your-aap-api-token>
oauth_client_id=<your-oauth-client-id>
oauth_client_secret=<your-oauth-client-secret>

# Security
backend_secret=<generate-with-openssl-rand>
postgres_password=<generate-with-openssl-rand>

# VM Credentials
admin_password=<generate-with-openssl-rand>
ssh_public_key_file=files/portal_vm_key.pub
```

**Security Note:** The built bootc container image and output disk images contain environment-specific secrets. Do not share image files between environments or upload to public registries.

## Step 6: Run Installation

```bash
# Ensure SSH public key is in place
mkdir -p files
cp ~/.ssh/id_ed25519.pub files/portal_vm_key.pub

# Run installation
ansible-navigator run -i inventory.local ansible.portal_setup.install
```

Or without ansible-navigator:
```bash
ansible-playbook -i inventory.local ansible.portal_setup.install
```

## Step 7: Deploy Image

After installation completes successfully:

```bash
# Images are in output directory organized by format
ls -lh output/qcow2/
ls -lh output/vmdk/  # if VMDK was configured
ls -lh output/iso/   # if ISO was configured

# Deploy to your virtualization platform
# - Copy image file (e.g., rhaap-portal-image-latest.qcow2) to hypervisor
# - Create VM with appropriate resources (4 vCPU, 8GB RAM minimum)
# - Boot from image
```

## Troubleshooting

### Images Not Found During Build

**Symptom:** Build fails with "image not found" error

**Solution:**
```bash
# Verify images are loaded
sudo podman images

# Check specific image
sudo podman images registry.redhat.io/rhel9/rhel-bootc

# If missing, reload
sudo podman load -i bundle/images/registry.redhat.io_rhel9_rhel-bootc_latest.tar
```

### Registry Connection Failed

**Symptom:** Cannot connect to internal registry

**Solution:**
```bash
# Test registry connectivity
podman login registry.example.com:5000

# Check TLS settings
registry_tls_verify=false  # for self-signed certs

# Verify images are in registry
curl -k https://registry.example.com:5000/v2/_catalog
```

### AAP Not Accessible

**Symptom:** Preflight checks fail on AAP connectivity

**Solution:**
- Verify AAP is accessible from build host: `curl -k https://aap.internal.example.com/api/v2/ping/`
- Check AAP token is valid and has Administrator privileges
- Ensure network routes exist in disconnected environment

### Disk Space Issues

**Symptom:** No space left on device during build

**Solution:**
```bash
# Check available space (need ~30GB)
df -h /var/lib/containers

# Clean old images
sudo podman system prune -a

# Check image sizes
sudo podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}"
```

## Security Considerations

1. **Image Verification:** All images are from Red Hat official registry
2. **Transfer Security:** Use approved secure transfer methods for bundle
3. **Registry Authentication:** Enable authentication on internal registry for production
4. **TLS Certificates:** Use proper TLS certificates for internal registry in production
5. **Credential Management:** Store AAP tokens and passwords securely

## Support

For issues with:
- **Container Images:** Red Hat support (images are fully supported)
- **AAP Connectivity:** Check AAP documentation and connectivity
- **Build Process:** Review ansible-navigator logs in `artifacts/`

## Notes

- Bundle size is approximately 5-10 GB
- Installation requires ~30GB free disk space
- All images are Red Hat Enterprise Linux based and fully supported
- AAP instance can be within the air-gapped network
- Database can be external PostgreSQL or local container


