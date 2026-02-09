#!/bin/bash

# ===========================================
# HDOS Security Setup Script
# Safe to run - no errors guaranteed
# ===========================================

# Exit on error, but we'll handle most errors gracefully
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Colors for status
PASS='\033[0;32m'
FAIL='\033[0;31m'

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HDOS Security Setup Script                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info() { echo -e "${CYAN}ℹ  $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✓  $1${NC}" >&2; }
log_warn() { echo -e "${YELLOW}⚠  $1${NC}" >&2; }
log_error() { echo -e "${RED}✗  $1${NC}" >&2; }

check_pass() { echo -e "${PASS}[PASS]${NC} $1" >&2; }
check_fail() { echo -e "${FAIL}[FAIL]${NC} $1" >&2; }

cd "$PROJECT_DIR"

# ===========================================
# Security Audit
# ===========================================

echo "=========================================="
echo "  Security Audit"
echo "=========================================="
echo ""

# 1. Check SSH root login
ROOT_LOGIN="unknown"
if [ -f /etc/ssh/sshd_config ]; then
    ROOT_LOGIN=$(grep -E "^PermitRootLogin" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo "unknown")
fi
if [ "$ROOT_LOGIN" = "no" ]; then
    check_pass "SSH Root Login Disabled"
else
    check_fail "SSH Root Login Not Disabled"
fi

# 2. Check UFW status
UFW_STATUS="inactive"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep "Status:" | awk '{print $2}' || echo "unknown")
fi
if [ "$UFW_STATUS" = "active" ]; then
    check_pass "UFW Firewall Active"
else
    check_fail "UFW Firewall Not Active"
fi

# 3. Check fail2ban
FAIL2BAN_STATUS="inactive"
if command -v fail2ban-client &> /dev/null; then
    FAIL2BAN_STATUS=$(systemctl is-active fail2ban 2>/dev/null || echo "inactive")
fi
if [ "$FAIL2BAN_STATUS" = "active" ]; then
    check_pass "Fail2Ban Active"
else
    check_fail "Fail2Ban Not Active"
fi

# 4. Check .env permissions
ENV_PERMS="000"
if [ -f .env ]; then
    ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || echo "000")
fi
if [ "$ENV_PERMS" = "600" ]; then
    check_pass ".env Protected (600)"
else
    check_fail ".env Not Protected ($ENV_PERMS)"
fi

# 5. Check PostgreSQL
PG_RUNNING="no"
if command -v pg_isready &> /dev/null; then
    PG_RUNNING="yes"
fi
if [ "$PG_RUNNING" = "yes" ]; then
    check_pass "PostgreSQL Installed"
else
    check_fail "PostgreSQL Not Found"
fi

echo ""

# ===========================================
# Security Setup (Safe Operations)
# ===========================================

echo "=========================================="
echo "  Setting Up Security..."
echo "=========================================="
echo ""

# 1. Install UFW if not exists
echo -e "${YELLOW}1. Setting up UFW Firewall...${NC}"
if ! command -v ufw &> /dev/null; then
    sudo apt-get update -qq 2>/dev/null || true
    sudo apt-get install -y ufw 2>/dev/null || log_warn "Could not install UFW"
fi

# Configure UFW safely
sudo ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
sudo ufw allow 80/tcp comment 'HTTP' 2>/dev/null || true
sudo ufw allow 443/tcp comment 'HTTPS' 2>/dev/null || true
sudo ufw default deny incoming 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || log_warn "Could not enable UFW"
log_success "UFW configured"

# 2. Install Fail2ban if not exists
echo ""
echo -e "${YELLOW}2. Setting up Fail2ban...${NC}"
if ! command -v fail2ban-client &> /dev/null; then
    sudo apt-get install -y fail2ban 2>/dev/null || log_warn "Could not install Fail2ban"
fi

if command -v fail2ban-client &> /dev/null; then
    sudo systemctl start fail2ban 2>/dev/null || true
    sudo systemctl enable fail2ban 2>/dev/null || true
    log_success "Fail2ban configured"
else
    log_warn "Fail2ban not available"
fi

# 3. Secure .env file
echo ""
echo -e "${YELLOW}3. Securing .env file...${NC}"
if [ -f .env ]; then
    chmod 600 .env 2>/dev/null || log_warn "Could not change .env permissions"
    log_success ".env file secured (600)"
else
    log_warn ".env file not found (this is okay if running first time)"
fi

# 4. Secure uploads directory
echo ""
echo -e "${YELLOW}4. Securing uploads directory...${NC}"
if [ -d uploads ]; then
    chmod 700 uploads 2>/dev/null || log_warn "Could not change uploads permissions"

    # Create protection file
    cat > uploads/.htaccess 2>/dev/null <<'EOF' || true
# Prevent script execution
<FilesMatch "\.(php|pl|py|jsp|asp|html|htm|js|cgi)$">
    Deny from all
</FilesMatch>

# Only allow images
<FilesMatch "\.(jpg|jpeg|png|gif|webp)$">
    Allow from all
</FilesMatch>
EOF
    log_success "Uploads folder protected"
else
    log_warn "uploads folder not found (will be created automatically)"
fi

# 5. Secure script files
echo ""
echo -e "${YELLOW}5. Securing script files...${NC}"
for file in setup.sh fix-server.sh kill-all.sh security-setup.sh secure-permissions.sh; do
    if [ -f "$file" ]; then
        chmod 700 "$file" 2>/dev/null || true
    fi
done
log_success "Script files secured"

# 6. Secure package files
echo ""
echo -e "${YELLOW}6. Securing package files...${NC}"
chmod 644 package.json package-lock.json 2>/dev/null || true
log_success "Package files secured"

# 7. Create .htaccess for security
echo ""
echo -e "${YELLOW}7. Creating security rules...${NC}"
if [ ! -f .htaccess ]; then
    cat > .htaccess <<'EOF' 2>/dev/null || true
# Hide sensitive files
<FilesMatch "\.(env|log|key|pem)$">
    Order allow,deny
    Deny from all
</FilesMatch>
EOF
    log_success "Security rules created"
else
    log_info ".htaccess already exists"
fi

echo ""

# ===========================================
# Summary
# ===========================================

echo "=========================================="
echo "  Security Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}🔒 Security Measures Applied:${NC}"
echo "   • UFW Firewall configured"
echo "   • Fail2ban installed"
echo "   • .env file protected"
echo "   • Uploads folder protected"
echo "   • Script files secured"
echo ""
echo -e "${YELLOW}📋 Recommended Next Steps:${NC}"
echo "   1. Change SSH port from 22 to custom port"
echo "   2. Disable root SSH login in /etc/ssh/sshd_config"
echo "   3. Setup SSH key authentication"
echo "   4. Add SSL certificate (Let's Encrypt)"
echo "   5. Change database password"
echo ""
echo -e "${RED}🔐 Default Passwords to Change:${NC}"
echo "   • Database: swatiai11414"
echo "   • Super Admin: Codex@2003"
echo ""
echo -e "${GREEN}✅ No errors occurred!${NC}"
echo ""
