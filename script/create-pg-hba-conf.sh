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

# Step 2: Create pg_hba.conf
echo "Step 2: Creating pg_hba.conf at $PG_HBA_CONF..."
cat > "$PG_HBA_CONF" <<EOF
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF
echo "✓ pg_hba.conf created"

# Step 3: Configure pg_hba.conf
echo "Step 3: Configuring pg_hba.conf..."
sudo cp "$PG_HBA_CONF" /etc/postgresql/*/main/pg_hba.conf
echo "✓ pg_hba.conf copied to PostgreSQL config"

# Step 4: Start PostgreSQL
echo "Step 4: Starting PostgreSQL..."
sudo service postgresql start
sleep 3
echo "✓ PostgreSQL started"

# Step 5: Configure authentication
echo "Step 5: Configuring authentication..."
sudo sed -i "s/scram-sha-256/md5/g" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo sed -i "s/peer/trust/g" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo service postgresql restart
sleep 3
echo "✓ Authentication configured"

# Step 6: Create/Update user
echo "Step 6: Creating/updating user '$DB_USER'..."
sudo -u postgres psql -c "DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   ELSE
      ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;"
echo "✓ User created/updated"

# Step 7: Create database
echo "Step 7: Creating database '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"
echo "✓ Database created"

echo "=========================================="
echo "✓ PostgreSQL configuration complete!"
echo "=========================================="
