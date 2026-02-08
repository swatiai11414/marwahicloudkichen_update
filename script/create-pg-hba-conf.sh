#!/bin/bash

# Script to configure PostgreSQL for HDOS
# This script handles pg_hba.conf creation and PostgreSQL setup

set -e

# Variables from main.yml
DB_NAME="${DB_NAME:-hdos}"
DB_USER="${DB_USER:-Swatiai11414}"
DB_PASSWORD="${DB_PASSWORD:-Swatiai@@@###2003}"

# Output file
PG_HBA_CONF="/tmp/pg_hba.conf"

echo "=========================================="
echo "PostgreSQL Configuration Script"
echo "=========================================="

# Step 1: Install PostgreSQL
echo "Step 1: Installing PostgreSQL..."
sudo apt-get update -qq
sudo apt-get install -y postgresql postgresql-contrib
echo "✓ PostgreSQL installed"

# Step 2: Stop PostgreSQL if running
echo "Step 2: Stopping PostgreSQL..."
sudo service postgresql stop 2>/dev/null || true
sleep 2

# Step 3: Create pg_hba.conf
echo "Step 3: Creating pg_hba.conf..."
cat > "$PG_HBA_CONF" <<EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF
echo "✓ pg_hba.conf created"

# Step 4: Find PostgreSQL config directory
echo "Step 4: Finding PostgreSQL config..."
PG_CONF_DIR=$(sudo find /etc/postgresql -name "main" -type d 2>/dev/null | head -1)
if [ -z "$PG_CONF_DIR" ]; then
    echo "ERROR: PostgreSQL config directory not found"
    exit 1
fi
echo "Found config at: $PG_CONF_DIR"

# Step 5: Copy pg_hba.conf
echo "Step 5: Copying pg_hba.conf..."
sudo cp "$PG_HBA_CONF" "$PG_CONF_DIR/pg_hba.conf"
echo "✓ pg_hba.conf copied"

# Step 6: Also update pg_hba.conf directly
echo "Step 6: Updating PostgreSQL configuration..."
sudo sed -i 's/scram-sha-256/md5/g' "$PG_CONF_DIR/pg_hba.conf" 2>/dev/null || true
sudo sed -i 's/peer/md5/g' "$PG_CONF_DIR/pg_hba.conf" 2>/dev/null || true
sudo sed -i 's/local   all             all             peer/local   all             all             md5/g' "$PG_CONF_DIR/pg_hba.conf" 2>/dev/null || true
echo "✓ Configuration updated"

# Step 7: Start PostgreSQL
echo "Step 7: Starting PostgreSQL..."
sudo service postgresql start
sleep 5
echo "✓ PostgreSQL started"

# Step 8: Verify PostgreSQL is running
echo "Step 8: Verifying PostgreSQL..."
if ! sudo service postgresql status > /dev/null 2>&1; then
    echo "ERROR: PostgreSQL failed to start"
    sudo tail -50 /var/log/postgresql/postgresql-*.log 2>/dev/null || true
    exit 1
fi
echo "✓ PostgreSQL is running"

# Step 9: Create/Update user
echo "Step 9: Creating/updating user '$DB_USER'..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;"
echo "✓ User created"

# Step 10: Create database
echo "Step 10: Creating database '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo "✓ Database created"

# Step 11: Test connection
echo "Step 11: Testing connection..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Connection successful!"
else
    echo "WARNING: Connection test failed, but database is configured"
fi

echo "=========================================="
echo "✓ PostgreSQL configuration complete!"
echo "=========================================="
