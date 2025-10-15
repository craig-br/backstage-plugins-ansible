# Customizing VM User Credentials

## Overview

Customize VM username, passwords, and SSH keys before building the bootc image. Credentials are embedded at build time.

## Quick Start

Copy the example file:
```bash
cd /opt/ansible-self-service-portal/image_mode/quadlet
cp credentials.env.example .credentials.env
```

Edit `.credentials.env` in your editor:
```bash
ADMIN_USER=prodadmin
ADMIN_PASSWORD=$(openssl rand -base64 32)
ROOT_PASSWORD=$(openssl rand -base64 32)
SSH_PUBLIC_KEY_FILE=~/.ssh/id_ed25519.pub
SSH_SECURITY_MODE=keys-only
```

Build and deploy:
```bash
make clean
make deploy-vm-local
ssh prodadmin@<vm-ip>
```

## Configuration Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ADMIN_USER` | Admin username | `admin` | Yes |
| `ADMIN_PASSWORD` | Admin password | `admin123` | Yes |
| `ROOT_PASSWORD` | Root password | `root123` | Yes |
| `SSH_PUBLIC_KEY_FILE` | SSH public key path | (empty) | No |
| `SSH_SECURITY_MODE` | SSH security mode | `keys-and-password` | No |

## Security

- Use SSH keys for production (`SSH_SECURITY_MODE=keys-only`)
- Generate strong passwords: `openssl rand -base64 32`
- Generate SSH keys in `~/.ssh/` with proper permissions:
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/portal_vm_key
  chmod 700 ~/.ssh && chmod 600 ~/.ssh/portal_vm_key
  ```
- Never store SSH keys in project directories
- Never commit `.credentials.env` to git (automatically ignored)

## How It Works

Credentials are embedded at **build time**:
1. Edit `.credentials.env`
2. Run `make build-local`
3. Image built with your credentials
4. To change, rebuild the image

## Troubleshooting

**SSH Key Not Working:**
Check key was copied to VM:
```bash
ssh admin@<vm-ip>
cat ~/.ssh/authorized_keys
```

Check local permissions:
```bash
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

**Forgot Password:**
Rebuild with defaults or use SSH key if configured.
