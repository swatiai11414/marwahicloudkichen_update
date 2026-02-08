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
sudo service postgresql stop 2>/dev/null || true
sleep 2

# Find PostgreSQL version
PG_VERSION=$(ls -d /etc/postgresql/*/main 2>/dev/null | head -1 | grep -oP '\d+')
if [ -z "$PG_VERSION" ]; then
    PG_VERSION=16
fi

echo "PostgreSQL version: $PG_VERSION"

# Create proper pg_hba.conf directly with sudo bash
echo "Creating pg_hba.conf..."
sudo bash -c "cat > /etc/postgresql/$PG_VERSION/main/pg_hba.conf <<'PGEOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
PGEOF"

echo "✓ pg_hba.conf created"

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

# Drop and recreate user
echo "Recreating user '$DB_USER'..."
echo "DROP USER IF EXISTS $DB_USER CASCADE;" | sudo -u postgres psql 2>/dev/null || true
sleep 2
echo "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;" | sudo -u postgres psql
echo "✓ User recreated"

# Drop and recreate database
echo "Recreating database '$DB_NAME'..."
echo "DROP DATABASE IF EXISTS $DB_NAME;" | sudo -u postgres psql 2>/dev/null || true
echo "CREATE DATABASE $DB_NAME OWNER $DB_USER;" | sudo -u postgres psql
echo "✓ Database recreated"

# Restart PostgreSQL to apply all changes
echo "Restarting PostgreSQL..."
sudo service postgresql restart
sleep 3

# Test connection
echo "Testing connection..."
export PGPASSWORD="$DB_PASSWORD"
psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL connection successful!"
else
    echo "WARNING: Connection test failed, trying alternative..."
    
    # Alternative: Use ALTER USER to set password
    echo "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" | sudo -u postgres psql
    sleep 2
    
    export PGPASSWORD="$DB_PASSWORD"
    psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ PostgreSQL connection successful!"
    else
        echo "ERROR: Connection test failed"
        exit 1
    fi
fi

# ===========================================
# Fix 2: Directory Permissions
# ===========================================
echo ""
echo "Step 2: Fixing directory permissions..."

# Get current directory
CURRENT_DIR=$(pwd)
echo "Project directory: $CURRENT_DIR"

# Fix node_modules/.vite permissions
VITE_DIR="$CURRENT_DIR/node_modules/.vite"
if [ -d "$VITE_DIR" ]; then
    sudo chmod -R 777 "$VITE_DIR"
    echo "✓ Fixed $VITE_DIR permissions"
else
    sudo mkdir -p "$VITE_DIR"
    sudo chmod -R 777 "$VITE_DIR"
    echo "✓ Created $VITE_DIR"
fi

# Fix uploads directory
UPLOADS_DIR="$CURRENT_DIR/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    sudo chmod -R 777 "$UPLOADS_DIR"
    echo "✓ Fixed $UPLOADS_DIR permissions"
fi

# Fix attached_assets directory
ASSETS_DIR="$CURRENT_DIR/attached_assets"
if [ -d "$ASSETS_DIR" ]; then
    sudo chmod -R 777 "$ASSETS_DIR"
    echo "✓ Fixed $ASSETS_DIR permissions"
fi

echo ""
echo "=========================================="
echo "✓ All fixes applied successfully!"
echo "=========================================="
echo ""
echo "Now run: npm run dev"
