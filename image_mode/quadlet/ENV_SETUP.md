# Environment Configuration Setup

## Quick Start

Before building or deploying, copy the example environment files to hidden versions:

```bash
cd /opt/ansible-self-service-portal/image_mode/quadlet

# Copy all example files (creates hidden files starting with .)
cp portal.env.example .portal.env
cp credentials.env.example .credentials.env
```

Then edit each hidden file with your values in your editor:
- `.portal.env` - Portal and database configuration (consolidated)
- `.credentials.env` - VM user credentials (only for builds)

## File Overview

| Example File | Copy To | Purpose | Required |
|--------------|---------|---------|----------|
| `portal.env.example` | `.portal.env` | Portal + database config, AAP integration, GitHub/GitLab tokens | Yes |
| `credentials.env.example` | `.credentials.env` | VM user credentials and SSH keys | For builds only |

## Git Protection

The `.gitignore` files are configured to exclude:
```
image_mode/quadlet/.portal.env
image_mode/quadlet/.credentials.env
```

This prevents accidental commits of sensitive data. The `.example` files are safe to commit.

## What to Edit

### .portal.env (All runtime configuration)

**Required:**
- `PORTAL_ENVIRONMENT` - Environment mode (production or development)
- `AAP_HOST_URL` - Your Ansible Automation Platform URL
- `AAP_TOKEN` - AAP authentication token
- `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` - OAuth credentials
- `BACKEND_SECRET` - Generate with: `openssl rand -base64 32`

**Database (choose one option):**
- **Option 1 (DEFAULT)**: Local PostgreSQL container - Update `POSTGRES_PASSWORD` only
- **Option 2**: External PostgreSQL - Comment out Option 1, uncomment Option 2, update credentials

**Optional (only if needed):**
- `GITHUB_URL` / `GITHUB_TOKEN` - Only for private repos or GitHub Enterprise
- `GITLAB_URL` / `GITLAB_TOKEN` - Only for private repos or self-hosted GitLab

### .credentials.env (Build-time only)
- `ADMIN_USER` / `ADMIN_PASSWORD` - VM admin user credentials
- `ROOT_PASSWORD` - VM root password
- `SSH_PUBLIC_KEY_FILE` - Path to your SSH public key (optional)
- `SSH_SECURITY_MODE` - SSH security mode (keys-only, keys-and-password, password-only)

## Security Best Practices

1. **Never commit the dotted files** - They contain secrets
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Use SSH keys for production** - Set `SSH_PUBLIC_KEY_FILE` in `.credentials.env`
4. **Keep backups secure** - Store credentials in a password manager
5. **Rotate credentials regularly** - Especially for production

**Problem:** Accidentally committed secrets

**Solution:** Immediately:
1. Rotate all credentials
2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
3. Force push (coordinate with team)

