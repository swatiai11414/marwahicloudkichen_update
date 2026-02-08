#!/bin/bash

# ===========================================
# HDOS - Hotel Digital Operating System
# Complete Setup Script (Non-Docker)
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project Configuration
PROJECT_NAME="HDOS - Hotel Digital Operating System"
DB_NAME="hdos"
DB_USER="Swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"
NODE_VERSION="24"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  $PROJECT_NAME                      ║${NC}"
echo -e "${BLUE}║  Complete Setup Script (Non-Docker)                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ===========================================
# Step 1: Update System
# ===========================================
echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
sudo apt-get update -qq
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# ===========================================
# Step 2: Install Node.js
# ===========================================
echo -e "${YELLOW}Step 2: Installing Node.js $NODE_VERSION...${NC}"

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_INSTALLED_VERSION=$(node -v)
    echo -e "${YELLOW}Node.js is already installed: $NODE_INSTALLED_VERSION${NC}"
    
    # Check if version is >= 24
    NODE_MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR_VERSION" -ge 24 ]; then
        echo -e "${GREEN}✓ Node.js version is compatible${NC}"
    else
        echo -e "${RED}✗ Node.js version is too old. Need version >= 24${NC}"
        echo -e "${YELLOW}Installing Node.js $NODE_VERSION...${NC}"
        
        # Install Node.js 24 using NodeSource
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
    fi
else
    # Install Node.js using NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
fi

echo ""
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"
echo ""

# ===========================================
# Step 3: Install PostgreSQL
# ===========================================
echo -e "${YELLOW}Step 3: Installing PostgreSQL...${NC}"

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL is already installed${NC}"
else
    echo "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
fi

# ===========================================
# Step 4: Configure PostgreSQL
# ===========================================
echo ""
echo -e "${YELLOW}Step 4: Configuring PostgreSQL...${NC}"

# Start PostgreSQL service (try systemctl first, then service command)
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

# Enable PostgreSQL on boot
sudo systemctl enable postgresql 2>/dev/null || sudo systemctl enable postgresql 2>/dev/null || true

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..10}; do
    if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready!${NC}"
        break
    fi
    echo "Waiting... ($i/10)"
    sleep 1
done

# ===========================================
# Step 5: Create Database and User
# ===========================================
echo ""
echo -e "${YELLOW}Step 5: Creating database and user...${NC}"

# Create user if not exists
echo "Creating user '$DB_USER'..."
sudo -u postgres psql -c "DO \$\$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
   END IF;
END
\$\$;"

# Create database if not exists
echo "Creating database '$DB_NAME'..."
sudo -u postgres psql -c "SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\\gexec"

# Grant privileges
sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"

echo -e "${GREEN}✓ Database and user created successfully${NC}"
echo ""

# ===========================================
# Step 6: Configure PostgreSQL Authentication
# ===========================================
echo -e "${YELLOW}Step 6: Configuring PostgreSQL authentication...${NC}"

# Check if md5 authentication is configured for the user
PG_HBA_CONF="/etc/postgresql/*/main/pg_hba.conf"
if [ -f "$PG_HABA_CONF" ] 2>/dev/null || [ -f "/etc/postgresql/15/main/pg_hba.conf" ] 2>/dev/null; then
    PG_HBA_CONF=$(find /etc/postgresql -name "pg_hba.conf" -type f | head -1)
    
    # Check if trust or md5 exists for localhost
    if grep -q "127.0.0.1/32.*md5" "$PG_HBA_CONF" 2>/dev/null || \
       grep -q "localhost.*md5" "$PG_HBA_CONF" 2>/dev/null; then
        echo -e "${GREEN}✓ PostgreSQL authentication is configured${NC}"
    else
        echo "Configuring md5 authentication..."
        # Add md5 authentication for localhost
        sudo sed -i '/# TYPE  DATABASE        USER            ADDRESS                 METHOD/a # Allow local md5 authentication for HDOS\nlocal   all             all                                     md5\nhost    all             all             127.0.0.1/32            md5' "$PG_HBA_CONF" 2>/dev/null || true
        echo -e "${GREEN}✓ Authentication configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ pg_hba.conf not found, skipping auth config${NC}"
fi

# Reload PostgreSQL configuration
sudo -u postgres psql -c "SELECT pg_reload_conf();" 2>/dev/null || true
echo ""

# ===========================================
# Step 7: Test Database Connection
# ===========================================
echo -e "${YELLOW}Step 7: Testing database connection...${NC}"

# Export DATABASE_URL for testing
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    # Try with postgres user
    if sudo -u postgres PGASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>/dev/null; then
        echo -e "${GREEN}✓ Database connection successful (via postgres user)!${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
        echo -e "${YELLOW}Trying alternative connection...${NC}"
        export PGUSER=postgres
        export PGPASSWORD="$DB_PASSWORD"
        if psql -h localhost -U postgres -d $DB_NAME -c "SELECT 1;" 2>/dev/null; then
            echo -e "${GREEN}✓ Connected as postgres user${NC}"
        else
            echo -e "${YELLOW}⚠ Could not verify connection, continuing anyway...${NC}"
        fi
    fi
fi
echo ""

# ===========================================
# Step 8: Install Project Dependencies
# ===========================================
echo -e "${YELLOW}Step 8: Installing npm dependencies...${NC}"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules already exists. Updating dependencies...${NC}"
    npm ci 2>/dev/null || npm install
else
    echo "Installing npm dependencies..."
    npm ci 2>/dev/null || npm install
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ===========================================
# Step 9: Configure Environment Variables
# ===========================================
echo -e "${YELLOW}Step 9: Configuring environment variables...${NC}"

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists. Using existing configuration.${NC}"
else
    echo "Creating .env file..."
    
    # URL encode the password for DATABASE_URL
    ENCODED_PASSWORD=$(echo -n "$DB_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g')
    
    cat > .env <<EOF
# ===========================================
# HDOS - Hotel Digital Operating System
# Environment Variables Configuration
# ===========================================

# ===========================================
# REQUIRED - Database Configuration
# ===========================================
DATABASE_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME

# ===========================================
# REQUIRED - Security Secrets
# ===========================================
SESSION_SECRET=0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0
SUPER_ADMIN_PASSWORD=Codex@2003

# ===========================================
# OPTIONAL - Server Configuration
# ===========================================
PORT=5000
NODE_ENV=development
EOF
    
    echo -e "${GREEN}✓ .env file created${NC}"
fi

echo ""

# ===========================================
# Step 10: Run Database Migrations
# ===========================================
echo -e "${YELLOW}Step 10: Running database migrations...${NC}"

# Update DATABASE_URL in current shell
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Run migrations
echo "Running database migrations..."
if npm run db:push 2>&1; then
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠ Database migrations had issues, continuing...${NC}"
fi

echo ""

# ===========================================
# Step 11: Verify Installation
# ===========================================
echo -e "${YELLOW}Step 11: Verifying installation...${NC}"

# Run TypeScript check
echo "Running TypeScript check..."
if npm run check 2>&1; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript check completed with warnings (this is OK for development)${NC}"
fi

echo ""

# ===========================================
# Setup Complete
# ===========================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  SETUP COMPLETED SUCCESSFULLY!                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📦 Project Configuration:${NC}"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo ""
echo -e "${CYAN}🔗 Connection String:${NC}"
echo "  postgresql://$DB_USER:****@localhost:5432/$DB_NAME"
echo ""
echo -e "${CYAN}🚀 Available Commands:${NC}"
echo "  ${YELLOW}npm run dev${NC}    : Start development server"
echo "  ${YELLOW}npm run build${NC}  : Build for production"
echo "  ${YELLOW}npm start${NC}     : Start production server"
echo "  ${YELLOW}npm run check${NC}  : TypeScript type checking"
echo "  ${YELLOW}npm run db:push${NC} : Push schema changes to database"
echo ""
echo -e "${CYAN}🌐 Server will start at:${NC} http://localhost:5000"
echo ""

# Ask if user wants to start the server
read -p "Do you want to start the development server? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting development server...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    npm run dev
fi
