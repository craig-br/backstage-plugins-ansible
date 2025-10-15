# User-Provided Files Directory

This directory contains user-provided files that are required for building the bootc image but should not be committed to version control.

## Required Files

### 1. auth.json (REQUIRED)

Registry authentication file from Red Hat registry login.

**How to create:**
```bash
sudo cp /root/.config/containers/auth.json auth.json
```

This file contains credentials for pulling images from registry.redhat.io and will be embedded in the bootc image.

### 2. SSH Public Key (OPTIONAL, but recommended for production)

Your SSH public key for secure VM access.

**How to create:**
```bash
# Copy your existing public key
cp ~/.ssh/id_ed25519.pub my_key.pub

# Or copy a specific key
cp ~/.ssh/portal_vm_key.pub portal_vm_key.pub
```

After copying your public key here, update `.credentials.env`:
```bash
SSH_PUBLIC_KEY_FILE=quadlet/files/my_key.pub
```

## Security Notes

- **Do not commit** these files to version control
- All files here are automatically git-ignored
- Only copy **public** keys (.pub), never private keys
- auth.json contains sensitive credentials

## Directory Structure

```
files/
├── .gitkeep          # Ensures directory exists in git
├── README.md         # This file
├── auth.json         # Your registry authentication (you provide this)
└── *.pub             # Your SSH public keys (optional, you provide these)
```
