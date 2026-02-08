#!/bin/bash
# ===========================================
# Create .env file for HDOS
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Creating .env file...${NC}"

# Default values (can be overridden by environment or arguments)
DB_NAME="${DB_NAME:-hdos}"
DB_USER="${DB_USER:-Swatiai11414}"
DB_PASSWORD="${DB_PASSWORD:-Swatiai@@@###2003}"
PORT="${PORT:-5000}"
SESSION_SECRET="${SESSION_SECRET:-0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Codex@2003}"

# URL encode the password (@ -> %40, # -> %23)
ENCODED_PASSWORD=$(echo -n "$DB_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g')

# Create .env file
cat > .env <<EOF
DATABASE_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=$SESSION_SECRET
SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD
PORT=$PORT
NODE_ENV=development
EOF

echo -e "${GREEN}✓ .env file created successfully${NC}"
echo ""
echo "Contents:"
echo "  DATABASE_URL=postgresql://$DB_USER:*****@localhost:5432/$DB_NAME"
echo "  SESSION_SECRET=*****"
echo "  SUPER_ADMIN_PASSWORD=*****"
echo "  PORT=$PORT"
echo "  NODE_ENV=development"
echo ""
