#!/bin/bash

# ===========================================
# HDOS - Hotel Digital Operating System
# Complete Setup Script (matches main.yml workflow)
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

PROJECT_NAME="HDOS - Hotel Digital Operating System"
DB_NAME="hdos"
DB_USER="Swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"
NODE_VERSION="24"
ERROR_COUNT=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  $PROJECT_NAME                      ║${NC}"
echo -e "${BLUE}║  Complete Setup Script (main.yml workflow)               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================
# Step 1: Update System
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 1: Updating system packages...                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

sudo apt-get update -qq 2>&1 > /dev/null
echo -e "${GREEN}✓ System updated successfully${NC}"
echo ""

# ===========================================
# Step 2: Install Node.js
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 2: Installing Node.js $NODE_VERSION...                  ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

if command -v node &> /dev/null; then
    NODE_INSTALLED_VERSION=$(node -v)
    echo -e "${CYAN}Node.js is already installed: $NODE_INSTALLED_VERSION${NC}"
    NODE_MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR_VERSION" -ge 24 ]; then
        echo -e "${GREEN}✓ Node.js version is compatible (v$NODE_MAJOR_VERSION)${NC}"
    else
        echo -e "${RED}✗ Node.js version is too old. Need version >= 24${NC}"
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - 2>&1 > /dev/null
        sudo apt-get install -y nodejs 2>&1 > /dev/null
        echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
    fi
else
    echo "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - 2>&1 > /dev/null
    sudo apt-get install -y nodejs 2>&1 > /dev/null
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
fi

echo ""
echo -e "${CYAN}  Node.js version: $(node -v)${NC}"
echo -e "${CYAN}  npm version: $(npm -v)${NC}"
echo ""

# ===========================================
# Step 3: Install PostgreSQL
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 3: Installing PostgreSQL...                           ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is already installed${NC}"
    echo -e "${CYAN}  Version: $(psql --version)${NC}"
else
    echo "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib 2>&1 > /dev/null
    echo -e "${GREEN}✓ PostgreSQL installed successfully${NC}"
    echo -e "${CYAN}  Version: $(psql --version)${NC}"
fi
echo ""

# ===========================================
# Step 4: Configure PostgreSQL (like main.yml)
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 4: Configuring PostgreSQL...                          ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

# Start PostgreSQL
echo "Starting PostgreSQL service..."
sudo service postgresql start
sleep 3
echo -e "${GREEN}✓ PostgreSQL service started${NC}"

# Configure pg_hba.conf for md5 authentication
echo "Configuring pg_hba.conf for md5 authentication..."
sudo sed -i "s/scram-sha-256/md5/g" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo sed -i "s/peer/trust/g" /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo sed -i 's/local   all             all             peer/local   all             all             md5/g' /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true

cat > /tmp/pg_hba.conf <<'EOF'
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

sudo cp /tmp/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf 2>/dev/null || true
sudo service postgresql restart
sleep 3
echo -e "${GREEN}✓ pg_hba.conf configured${NC}"

# Create user if not exists
echo "Creating user '$DB_USER'..."
sudo -u postgres psql -c "DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   ELSE
      ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;"
echo -e "${GREEN}✓ User '$DB_USER' created/updated${NC}"

# Create database if not exists
echo "Creating database '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"

sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;" 2>/dev/null || true
echo -e "${GREEN}✓ User privileges configured${NC}"
echo ""

# ===========================================
# Step 5: Create .env file
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 5: Creating .env file...                              ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists, using existing configuration${NC}"
else
    echo "Creating .env file..."
    ENCODED_PASSWORD=$(echo -n "$DB_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g')

    cat > .env <<EOF
DATABASE_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0
SUPER_ADMIN_PASSWORD=Codex@2003
PORT=5000
NODE_ENV=development
EOF
    echo -e "${GREEN}✓ .env file created successfully${NC}"
fi
echo ""

# ===========================================
# Step 6: Install Dependencies
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 6: Installing npm dependencies...                     ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

if [ -d "node_modules" ]; then
    echo "Updating existing dependencies..."
    npm ci 2>&1 > /dev/null || npm install 2>&1 > /dev/null
    echo -e "${GREEN}✓ Dependencies updated successfully${NC}"
else
    echo "Installing dependencies..."
    npm ci 2>&1 > /dev/null || npm install 2>&1 > /dev/null
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
fi

echo -e "${CYAN}  Dependencies count: $(ls node_modules 2>/dev/null | wc -l)${NC}"
echo ""

# ===========================================
# Step 7: Wait for PostgreSQL
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 7: Waiting for PostgreSQL...                         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

for i in {1..30}; do
    if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is ready!${NC}"
        break
    fi
    sleep 2
done
echo ""

# ===========================================
# Step 8: Run Database Migrations
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 8: Running database migrations...                    ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

echo "Running database migrations..."
npm run db:push > /tmp/db-migration.log 2>&1
MIGRATION_STATUS=$?

if [ $MIGRATION_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Database migrations failed${NC}"
    cat /tmp/db-migration.log 2>/dev/null | tail -3 || true
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# ===========================================
# Step 9: TypeScript Check
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 9: TypeScript Check...                               ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

echo "Running TypeScript check..."
npm run check > /tmp/ts-check.log 2>&1
TS_STATUS=$?

if [ $TS_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript check completed with warnings${NC}"
fi
echo ""

# ===========================================
# Step 10: Build Application
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 10: Building Application...                           ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

echo "Building application..."
npm run build > /tmp/build.log 2>&1
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    cat /tmp/build.log 2>/dev/null | tail -5 || true
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# ===========================================
# Step 11: Setup Ngrok (Optional)
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 11: Setup Ngrok (Optional)...                        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

read -p "Do you want to set up ngrok for public URL? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting up ngrok..."

    if command -v ngrok &> /dev/null; then
        echo -e "${GREEN}✓ Ngrok is already installed${NC}"
    else
        wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz 2>/dev/null || \
        curl -sL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -o /tmp/ngrok.tgz 2>/dev/null

        if [ -f /tmp/ngrok.tgz ]; then
            sudo tar -xzf /tmp/ngrok.tgz -C /usr/local/bin ngrok 2>/dev/null
            rm /tmp/ngrok.tgz
            if command -v ngrok &> /dev/null; then
                echo -e "${GREEN}✓ Ngrok installed successfully${NC}"
                echo -e "${CYAN}  Version: $(ngrok --version)${NC}"
            else
                echo -e "${RED}✗ Failed to install ngrok${NC}"
            fi
        else
            echo -e "${RED}✗ Failed to download ngrok${NC}"
        fi
    fi
else
    echo -e "${YELLOW}Skipping ngrok setup${NC}"
fi
echo ""

# ===========================================
# Final Summary
# ===========================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  SETUP COMPLETED SUCCESSFULLY!                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All steps completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠ Completed with $ERROR_COUNT error(s)${NC}"
fi

echo ""
echo -e "${CYAN}📦 Project Configuration:${NC}"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - Port: 5000"
echo ""

echo -e "${CYAN}🚀 Available Commands:${NC}"
echo "  npm run dev    : Start development server"
echo "  npm run build  : Build for production"
echo "  npm start      : Start production server"

if command -v ngrok &> /dev/null; then
    echo "  ngrok http 5000 : Create public URL"
fi

echo ""
echo -e "${CYAN}🌐 Server URL:${NC} http://localhost:5000"
echo ""

read -p "Do you want to start the development server? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting development server on port 5000...${NC}"
    export PORT=5000
    npm run dev
fi
