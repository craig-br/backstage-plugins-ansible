# SSH Security Modes

## Overview

Choose your SSH security level when building the VM image.

## Three Modes

### 1. keys-only (MOST SECURE - Production)

**Configuration:**
```bash
SSH_SECURITY_MODE=keys-only
SSH_PUBLIC_KEY_FILE=~/.ssh/id_ed25519.pub
```

**Features:**
- SSH access ONLY with SSH keys
- Password SSH disabled
- Console access still available (emergency)
- No brute-force risk

**Use for:**
- Production deployments
- Internet-facing systems
- Compliance requirements

**Trade-offs:**
- Must have SSH key for remote access
- Key loss requires console recovery

---

### 2. keys-and-password (BALANCED - Default)

**Configuration:**
```bash
SSH_SECURITY_MODE=keys-and-password
SSH_PUBLIC_KEY_FILE=~/.ssh/id_ed25519.pub
```

**Features:**
- SSH keys for primary access
- Password authentication as fallback
- Some password attack risk

**Use for:**
- Development environments
- Internal networks
- When key loss is problematic

**Trade-offs:**
- Password still exposed to attacks
- Not recommended for internet-facing

---

### 3. password-only (LEAST SECURE - Dev/Demo Only)

**Configuration:**
```bash
SSH_SECURITY_MODE=password-only
SSH_PUBLIC_KEY_FILE=
```

**Features:**
- Username and password only
- No SSH key required
- Vulnerable to brute-force

**Use ONLY for:**
- Local development
- Short-lived testing
- Demos and training

**DO NOT use for production.**

---

## Decision Matrix

| Scenario | Recommended Mode |
|----------|------------------|
| Production deployment | keys-only |
| Internet-facing server | keys-only |
| Internal server (firewalled) | keys-and-password |
| Development on laptop | keys-and-password or password-only |
| Demo/Training | password-only |
| Compliance required | keys-only |

## Usage Examples

### Production (Keys-Only)

```bash
# Generate SSH key in .ssh directory with proper permissions
ssh-keygen -t ed25519 -f ~/.ssh/portal_prod_key -C "production-server"
chmod 700 ~/.ssh
chmod 600 ~/.ssh/portal_prod_key
chmod 644 ~/.ssh/portal_prod_key.pub

cat > .credentials.env << EOF
ADMIN_USER=prodadmin
ADMIN_PASSWORD=$(openssl rand -base64 32)
ROOT_PASSWORD=$(openssl rand -base64 32)
SSH_PUBLIC_KEY_FILE=~/.ssh/portal_prod_key.pub
SSH_SECURITY_MODE=keys-only
EOF

make deploy-vm-local
ssh prodadmin@<vm-ip>
```

### Development (Keys-and-Password)

```bash
cat > .credentials.env << EOF
ADMIN_USER=devuser
ADMIN_PASSWORD=MyDevPassword123!
ROOT_PASSWORD=MyRootPassword456!
SSH_PUBLIC_KEY_FILE=~/.ssh/id_ed25519.pub
SSH_SECURITY_MODE=keys-and-password
EOF

make deploy-vm-local
ssh devuser@<vm-ip>
```

### Local Demo (Password-Only)

```bash
cat > .credentials.env << EOF
ADMIN_USER=demo
ADMIN_PASSWORD=demo123
ROOT_PASSWORD=demo123
SSH_PUBLIC_KEY_FILE=
SSH_SECURITY_MODE=password-only
EOF

make deploy-vm-local
ssh demo@<vm-ip>
```

## Important Notes

**Console access always requires password** regardless of SSH mode. This ensures recovery if SSH breaks.

**To change modes:** You must rebuild the image.

Edit `.credentials.env` in your editor and change `SSH_SECURITY_MODE`:
```bash
make clean
make deploy-vm-local
```

## Security Best Practices

### Keys-Only Mode
- Keep SSH private key secure
- Use strong passphrase on key
- Backup key securely (encrypted)
- Rotate keys regularly

### Keys-and-Password Mode
- Use SSH keys as primary method
- Strong passwords (20+ chars)
- Monitor failed login attempts
- Use firewall to restrict SSH

### Password-Only Mode
- Use ONLY in isolated environments
- Terminate when done
- Never use in production
- Never expose to internet

## FAQ

**Q: Default mode if not set?**  
A: `keys-and-password`

**Q: Can I disable console password?**  
A: No. Console is your emergency access.

**Q: Does keys-only require SSH key at build?**  
A: Yes. Otherwise you'll lock yourself out.

**Q: Multiple SSH keys?**  
A: One at build time. Add more to `~/.ssh/authorized_keys` after deployment.

**Q: Lost SSH key in keys-only mode?**  
A: Use console access, generate new key, add to `~/.ssh/authorized_keys`.

## Compliance

| Standard | Recommendation | SSH Mode |
|----------|----------------|----------|
| PCI-DSS | Two-factor or equivalent | keys-only |
| SOC 2 | Strong authentication | keys-only |
| HIPAA | Access controls | keys-only |
| NIST 800-53 | Multi-factor preferred | keys-only |
| CIS Benchmarks | Key-based auth | keys-only |

## Recommendation

| Environment | Mode |
|-------------|------|
| Production | keys-only |
| Staging | keys-only |
| Development | keys-and-password |
| Local Laptop | password-only |
| Demo/Training | password-only |

**When in doubt:** Start with `keys-and-password`, upgrade to `keys-only` for production.
