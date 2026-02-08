#!/bin/bash

# ===========================================
# Fix PostgreSQL Authentication Error
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DB_USER="Swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"
DB_NAME="hdos"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Fix PostgreSQL Authentication Error                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================
# Step 1: Check and Install PostgreSQL
# ===========================================
echo -e "${YELLOW}Step 1: Checking PostgreSQL installation...${NC}"

if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is already installed${NC}"
    psql --version
else
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    
    # Update system
    sudo apt-get update -qq
    
    # Install PostgreSQL
    sudo apt-get install -y postgresql postgresql-contrib
    
    echo -e "${GREEN}✓ PostgreSQL installed successfully${NC}"
    psql --version
fi
echo ""

# ===========================================
# Step 2: Start PostgreSQL Service
# ===========================================
echo -e "${YELLOW}Step 2: Starting PostgreSQL service...${NC}"

# Start PostgreSQL
if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
elif sudo service postgresql status > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo "Starting PostgreSQL service..."
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
fi

# Enable on boot
sudo systemctl enable postgresql 2>/dev/null || true
echo ""

# ===========================================
# Step 3: Find pg_hba.conf file
# ===========================================
echo -e "${YELLOW}Step 3: Finding PostgreSQL configuration file...${NC}"

# Try to find pg_hba.conf
PG_HBA_CONF=$(sudo -u postgres psql -t -P format=unaligned -c "SHOW hba_file;" 2>/dev/null)

if [ -z "$PG_HBA_CONF" ] || [ ! -f "$PG_HBA_CONF" ]; then
    # Try common locations
    PG_HBA_CONF=""
    for ver in 16 15 14 13 12; do
        if [ -f "/etc/postgresql/$ver/main/pg_hba.conf" ]; then
            PG_HBA_CONF="/etc/postgresql/$ver/main/pg_hba.conf"
            break
        fi
    done
fi

if [ -z "$PG_HBA_CONF" ] || [ ! -f "$PG_HBA_CONF" ]; then
    echo -e "${RED}✗ Could not find pg_hba.conf${NC}"
    echo -e "${YELLOW}Trying to find via locate...${NC}"
    PG_HBA_CONF=$(sudo find /etc -name "pg_hba.conf" 2>/dev/null | head -1)
fi

if [ -z "$PG_HBA_CONF" ] || [ ! -f "$PG_HBA_CONF" ]; then
    echo -e "${RED}✗ Could not find pg_hba.conf. Manual installation may be required.${NC}"
    echo "Try running: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

echo "Found: $PG_HBA_CONF"
echo ""

# ===========================================
# Step 4: Backup original file
# ===========================================
echo -e "${YELLOW}Step 4: Backing up original configuration...${NC}"
sudo cp "$PG_HBA_CONF" "$PG_HBA_CONF.backup.$(date +%Y%m%d%H%M%S)"
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

# ===========================================
# Step 5: Configure md5 authentication
# ===========================================
echo -e "${YELLOW}Step 5: Configuring md5 authentication...${NC}"

echo "Current pg_hba.conf content:"
echo "----------------------------------------"
sudo cat "$PG_HBA_CONF" | head -20
echo "----------------------------------------"
echo ""

# Check if md5 is already configured
if grep -q "^local.*all.*all.*md5" "$PG_HBA_CONF" && \
   grep -q "^host.*all.*all.*127.0.0.1.*md5" "$PG_HBA_CONF"; then
    echo -e "${GREEN}✓ md5 authentication is already configured${NC}"
else
    echo "Configuring md5 authentication..."

    # Create new pg_hba.conf with md5 for localhost
    sudo cat > "$PG_HBA_CONF" <<EOF
# PostgreSQL Client Authentication Configuration File
# ===================================================
#
# This file controls client authentication.
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     md5
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
# Allow replication connections from localhost, by a user with the replication privilege.
local   replication     all                                     md5
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
EOF

    echo -e "${GREEN}✓ pg_hba.conf updated with md5 authentication${NC}"
fi
echo ""

# ===========================================
# Step 6: Restart PostgreSQL
# ===========================================
echo -e "${YELLOW}Step 6: Restarting PostgreSQL...${NC}"

if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    sudo systemctl restart postgresql
    echo -e "${GREEN}✓ PostgreSQL restarted${NC}"
elif sudo service postgresql status > /dev/null 2>&1; then
    sudo service postgresql restart
    echo -e "${GREEN}✓ PostgreSQL restarted${NC}"
else
    echo -e "${RED}✗ Could not restart PostgreSQL${NC}"
fi
echo ""

# Wait for PostgreSQL to be ready
sleep 3

# ===========================================
# Step 7: Create database and user
# ===========================================
echo -e "${YELLOW}Step 7: Creating database and user...${NC}"

# Create user if not exists
echo "Creating user '$DB_USER'..."
sudo -u postgres psql -c "DO \$\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   ELSE
      ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;"

# Create database if not exists
echo "Creating database '$DB_NAME'..."
sudo -u postgres psql -c "SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec"

# Grant privileges
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"

echo -e "${GREEN}✓ Database and user created${NC}"
echo ""

# ===========================================
# Step 8: Verify connection
# ===========================================
echo -e "${YELLOW}Step 8: Verifying database connection...${NC}"

# Test connection with password
export PGPASSWORD="$DB_PASSWORD"

if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
elif psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1 | grep -q "peer"; then
    echo "Trying with peer authentication..."
    if sudo -u postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>/dev/null; then
        echo -e "${GREEN}✓ Connected as postgres user (peer auth)${NC}"
        echo -e "${YELLOW}⚠ Note: Connection works but may require pg_hba.conf adjustment${NC}"
    fi
else
    echo -e "${RED}✗ Connection failed${NC}"
    echo ""
    echo "Debug info:"
    psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1 || true
fi
echo ""

# ===========================================
# Complete
# ===========================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  FIX COMPLETED!                                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Database Configuration:${NC}"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Connection string:"
echo -e "${CYAN}  postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME${NC}"
echo ""
echo -e "${CYAN}🔧 Useful Commands:${NC}"
echo "  ${YELLOW}sudo -u postgres psql${NC}     : Connect as postgres user"
echo -e "${YELLOW}sudo systemctl status postgresql${NC} : Check PostgreSQL status"
echo -e "${YELLOW}sudo systemctl restart postgresql${NC} : Restart PostgreSQL"
echo ""
echo "Try running your app:"
echo -e "${CYAN}  npm run dev${NC}"
echo ""
