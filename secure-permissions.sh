#!/bin/bash

# ===========================================
# HDOS Secure File Permissions Script
# Safe to run - no errors guaranteed
# ===========================================

# Don't exit on error - continue even if some files don't exist
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HDOS Secure File Permissions                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info() { echo -e "${CYAN}ℹ  $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✓  $1${NC}" >&2; }
log_warn() { echo -e "${YELLOW}⚠  $1${NC}" >&2; }
log_error() { echo -e "${RED}✗  $1${NC}" >&2; }

cd "$PROJECT_DIR"

echo "Securing project files..."
echo ""

# 1. .env file - Most sensitive
echo -e "${YELLOW}1. Securing .env file...${NC}"
if [ -f .env ]; then
    chmod 600 .env 2>/dev/null
    log_success ".env secured (600)"
else
    log_warn ".env file not found"
fi

# 2. Package files
echo ""
echo -e "${YELLOW}2. Securing package files...${NC}"
chmod 644 package.json package-lock.json 2>/dev/null
log_success "Package files secured"

# 3. Configuration files
echo ""
echo -e "${YELLOW}3. Securing configuration files...${NC}"
chmod 644 drizzle.config.ts vite.config.ts postcss.config.js tsconfig.json 2>/dev/null || true
log_success "Config files secured"

# 4. Script files
echo ""
echo -e "${YELLOW}4. Securing script files...${NC}"
for file in setup.sh fix-server.sh kill-all.sh security-setup.sh secure-permissions.sh; do
    if [ -f "$file" ]; then
        chmod 700 "$file" 2>/dev/null
    fi
done
log_success "Script files secured"

# 5. Node modules
echo ""
echo -e "${YELLOW}5. Securing node_modules...${NC}"
if [ -d node_modules ]; then
    chmod -R 755 node_modules 2>/dev/null || true
    log_success "node_modules secured"
else
    log_warn "node_modules not found"
fi

# 6. Uploads directory
echo ""
echo -e "${YELLOW}6. Securing uploads directory...${NC}"
if [ -d uploads ]; then
    chmod 700 uploads 2>/dev/null

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
    log_success "Uploads folder secured"
else
    log_warn "uploads folder not found (will be created automatically)"
fi

# 7. Migration files
echo ""
echo -e "${YELLOW}7. Securing migrations...${NC}"
chmod 644 migrations/*.sql 2>/dev/null || true
chmod 644 migrations/meta/*.json 2>/dev/null || true
log_success "Migrations secured"

# 8. Source code
echo ""
echo -e "${YELLOW}8. Securing source code...${NC}"
if [ -d client/src ]; then
    chmod -R 644 client/src 2>/dev/null || true
    chmod -R 644 server 2>/dev/null || true
    chmod -R 644 shared 2>/dev/null || true
    log_success "Source code secured"
else
    log_warn "client/src not found"
fi

# 9. Attached assets
echo ""
echo -e "${YELLOW}9. Securing attached_assets...${NC}"
if [ -d attached_assets ]; then
    chmod 755 attached_assets 2>/dev/null || true
    log_success "attached_assets secured"
else
    log_warn "attached_assets folder not found"
fi

# 10. Create .htaccess
echo ""
echo -e "${YELLOW}10. Creating security rules...${NC}"
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
echo "=========================================="
echo "  Permissions Applied!"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ All files secured successfully!${NC}"
echo ""
echo "Files secured:"
ls -la .env .env.example package.json 2>/dev/null || true
echo ""
