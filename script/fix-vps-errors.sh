#!/bin/bash

# Fix VPS Errors Script
# 1. Fix PostgreSQL password authentication
# 2. Fix directory permissions

set -e

DB_NAME="hdos"
DB_USER="Swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"

echo "=========================================="
echo "Fixing VPS Errors"
echo "=========================================="

# ===========================================
# Fix 1: PostgreSQL Authentication
# ===========================================
echo ""
echo "Step 1: Fixing PostgreSQL authentication..."

# Stop PostgreSQL
echo "Stopping PostgreSQL..."
sudo service postgresql stop
sleep 2

# Find PostgreSQL version and config directory
PG_VERSION=$(ls -d /etc/postgresql/*/main 2>/dev/null | head -1 | grep -oP '\d+')
if [ -z "$PG_VERSION" ]; then
    PG_VERSION=$(sudo -u postgres psql --version 2>/dev/null | grep -oP '\d+' | head -1)
fi

echo "PostgreSQL version: $PG_VERSION"

# Create proper pg_hba.conf
cat > /tmp/pg_hba.conf <<EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                trust
local   all             $DB_USER                               md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

# Copy to PostgreSQL config directory
if [ -d "/etc/postgresql/$PG_VERSION/main" ]; then
    sudo cp /tmp/pg_hba.conf "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    echo "✓ pg_hba.conf updated for version $PG_VERSION"
elif [ -d "/etc/postgresql/main" ]; then
    sudo cp /tmp/pg_hba.conf "/etc/postgresql/main/pg_hba.conf"
    echo "✓ pg_hba.conf updated"
else
    # Find the config directory
    PG_CONF_DIR=$(sudo find /etc/postgresql -name "pg_hba.conf" -type f 2>/dev/null | head -1)
    if [ -n "$PG_CONF_DIR" ]; then
        sudo cp /tmp/pg_hba.conf "$PG_CONF_DIR"
        echo "✓ pg_hba.conf updated at $PG_CONF_DIR"
    else
        echo "ERROR: Could not find pg_hba.conf"
        exit 1
    fi
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
sudo service postgresql start
sleep 3

# Verify PostgreSQL is running
if ! sudo service postgresql status > /dev/null 2>&1; then
    echo "ERROR: PostgreSQL failed to start"
    sudo tail -20 /var/log/postgresql/postgresql-*.log 2>/dev/null || true
    exit 1
fi
echo "✓ PostgreSQL is running"

# Drop and recreate user with correct password
echo "Recreating user '$DB_USER'..."
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;"
echo "✓ User recreated"

# Drop and recreate database
echo "Recreating database '$DB_NAME'..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo "✓ Database recreated"

# Test connection
echo "Testing connection..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL connection successful!"
else
    echo "ERROR: Connection test failed"
    exit 1
fi

# ===========================================
# Fix 2: Directory Permissions
# ===========================================
echo ""
echo "Step 2: Fixing directory permissions..."

# Fix node_modules/.vite permissions
if [ -d "/home/ubuntu/node_modules/.vite" ]; then
    sudo chmod -R 777 "/home/ubuntu/node_modules/.vite"
    echo "✓ Fixed /home/ubuntu/node_modules/.vite permissions"
else
    # Create the directory with proper permissions
    sudo mkdir -p "/home/ubuntu/node_modules/.vite"
    sudo chmod -R 777 "/home/ubuntu/node_modules/.vite"
    echo "✓ Created /home/ubuntu/node_modules/.vite"
fi

# Fix uploads directory if exists
if [ -d "/home/ubuntu/uploads" ]; then
    sudo chmod -R 777 "/home/ubuntu/uploads"
    echo "✓ Fixed /home/ubuntu/uploads permissions"
fi

# Fix attached_assets directory if exists
if [ -d "/home/ubuntu/attached_assets" ]; then
    sudo chmod -R 777 "/home/ubuntu/attached_assets"
    echo "✓ Fixed /home/ubuntu/attached_assets permissions"
fi

echo ""
echo "=========================================="
echo "✓ All fixes applied successfully!"
echo "=========================================="
echo ""
echo "Now run: npm run dev"
