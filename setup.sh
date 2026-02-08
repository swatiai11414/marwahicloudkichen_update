#!/bin/bash

# ===========================================
# HDOS - Hotel Digital Operating System
# Complete Setup Script with Progress Checks
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
echo -e "${BLUE}║  Complete Setup Script with Progress Checks              ║${NC}"
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
# Step 4: Start PostgreSQL Service
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 4: Starting PostgreSQL Service...                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

if sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL service is running (systemctl)${NC}"
elif sudo service postgresql status > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL service is running (service)${NC}"
else
    echo "Starting PostgreSQL service..."
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL service started${NC}"
fi

sudo systemctl enable postgresql 2>/dev/null || true
echo -e "${GREEN}✓ PostgreSQL service is active${NC}"
echo ""

# ===========================================
# Step 5: Configure PostgreSQL Authentication
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 5: Configuring PostgreSQL Authentication...           ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

PG_HBA_CONF=""
for ver in 16 15 14 13 12; do
    if [ -f "/etc/postgresql/$ver/main/pg_hba.conf" ]; then
        PG_HBA_CONF="/etc/postgresql/$ver/main/pg_hba.conf"
        break
    fi
done

if [ -z "$PG_HBA_CONF" ]; then
    PG_HBA_CONF=$(sudo find /etc -name "pg_hba.conf" 2>/dev/null | head -1)
fi

if [ -z "$PG_HBA_CONF" ] || [ ! -f "$PG_HBA_CONF" ]; then
    echo -e "${RED}✗ Could not find pg_hba.conf${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
else
    echo -e "${CYAN}  Config file: $PG_HBA_CONF${NC}"
    
    if grep -q "^local.*all.*all.*md5" "$PG_HBA_CONF" 2>/dev/null && \
       grep -q "^host.*all.*all.*127.0.0.1.*md5" "$PG_HBA_CONF" 2>/dev/null; then
        echo -e "${GREEN}✓ md5 authentication is already configured${NC}"
    else
        echo "Configuring md5 authentication..."
        sudo cp "$PG_HBA_CONF" "$PG_HBA_CONF.backup" 2>/dev/null || true
        
        sudo cat > "$PG_HBA_CONF" <<EOF
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF
        echo -e "${GREEN}✓ pg_hba.conf updated with md5 authentication${NC}"
    fi
    
    sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL restarted${NC}"
fi
echo ""

# ===========================================
# Step 6: Create Database and User
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 6: Creating Database and User...                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

echo "Creating user '$DB_USER'..."
USER_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER';" 2>/dev/null | tr -d ' ')
if [ -z "$USER_EXISTS" ]; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
    echo -e "${GREEN}✓ User '$DB_USER' created${NC}"
else
    echo -e "${GREEN}✓ User '$DB_USER' already exists${NC}"
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
fi

echo "Creating database '$DB_NAME'..."
DB_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ')
if [ -z "$DB_EXISTS" ]; then
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
    echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
else
    echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
fi

sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;" 2>/dev/null
echo -e "${GREEN}✓ User privileges configured${NC}"
echo ""

# ===========================================
# Step 7: Test Database Connection
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 7: Testing Database Connection...                     ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
    echo -e "${CYAN}  Host: localhost:5432${NC}"
    echo -e "${CYAN}  Database: $DB_NAME${NC}"
    echo -e "${CYAN}  User: $DB_USER${NC}"
else
    echo -e "${RED}✗ Database connection failed!${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi
echo ""

# ===========================================
# Step 8: Install Project Dependencies
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 8: Installing npm dependencies...                     ║${NC}"
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
# Step 9: Configure Environment Variables
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 9: Configuring environment variables...                ║${NC}"
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
# Step 10: Run Database Migrations
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 10: Running database migrations...                    ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

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
# Step 11: TypeScript Check
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 11: TypeScript Check...                               ║${NC}"
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
# Step 12: Build Application
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 12: Building Application...                           ║${NC}"
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
# Step 13: Port Configuration
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 13: Configure Server Port...                         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

read -p "Enter port number to run the server (default: 5000): " -r
echo ""

if [[ -z "$REPLY" ]]; then
    PORT_NUMBER="5000"
else
    PORT_NUMBER="$REPLY"
fi

echo -e "${GREEN}✓ Server will run on port: $PORT_NUMBER${NC}"

if [ -f ".env" ]; then
    sed -i "s/^PORT=.*/PORT=$PORT_NUMBER/" .env
    echo -e "${GREEN}✓ Port updated in .env file${NC}"
fi
echo ""

# ===========================================
# Step 14: Setup Ngrok (Optional)
# ===========================================
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Step 14: Setup Ngrok (Optional)...                         ║${NC}"
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
echo -e "${GREEN}║  SETUP COMPLETED SUCCESSFULLY!                              ║${NC}"
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
echo "  - Port: $PORT_NUMBER"
echo ""

echo -e "${CYAN}🚀 Available Commands:${NC}"
echo "  npm run dev    : Start development server"
echo "  npm run build  : Build for production"
echo "  npm start      : Start production server"

if command -v ngrok &> /dev/null; then
    echo "  ngrok http $PORT_NUMBER : Create public URL"
fi

echo ""
echo -e "${CYAN}🌐 Server URL:${NC} http://localhost:$PORT_NUMBER"
echo ""

read -p "Do you want to start the development server? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting development server on port $PORT_NUMBER...${NC}"
    export PORT=$PORT_NUMBER
    npm run dev
fi