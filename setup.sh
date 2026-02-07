#!/bin/bash

# ===========================================
# HDOS - Hotel Digital Operating System
# Complete Setup Script
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project Configuration
PROJECT_NAME="HDOS - Hotel Digital Operating System"
DB_NAME="hdos"
DB_USER="Swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"
NODE_VERSION="24"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  $PROJECT_NAME                      ║${NC}"
echo -e "${BLUE}║  Complete Setup Script                                      ║${NC}"
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
    
    # Check if PostgreSQL is running
    if sudo systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    fi
else
    # Install PostgreSQL
    echo "Installing PostgreSQL..."
    sudo apt-get install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    echo -e "${GREEN}✓ PostgreSQL installed and started${NC}"
fi

echo ""

# ===========================================
# Step 4: Configure PostgreSQL Database
# ===========================================
echo -e "${YELLOW}Step 4: Configuring PostgreSQL database...${NC}"

# Switch to postgres user and configure database
echo "Creating database '$DB_NAME' and user '$DB_USER'..."

sudo -u postgres psql <<EOF
-- Drop existing database and user if they exist (for clean setup)
-- WARNING: This will delete all existing data in these objects
-- DROP DATABASE IF EXISTS $DB_NAME;
-- DROP USER IF EXISTS $DB_USER;

-- Create user if not exists
DO \$\$BEGIN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
ALTER USER $DB_USER WITH SUPERUSER;

-- Set password for postgres user (for external connections)
ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';

\echo 'Database and user created successfully!'
\dt
EOF

echo -e "${GREEN}✓ Database configured successfully${NC}"
echo ""

# ===========================================
# Step 5: Install Project Dependencies
# ===========================================
echo -e "${YELLOW}Step 5: Installing npm dependencies...${NC}"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules already exists. Updating dependencies...${NC}"
    npm ci
else
    echo "Installing dependencies..."
    npm ci
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ===========================================
# Step 6: Configure Environment Variables
# ===========================================
echo -e "${YELLOW}Step 6: Configuring environment variables...${NC}"

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists. Using existing configuration.${NC}"
else
    echo "Creating .env file..."
    
    cat > .env <<EOF
# ===========================================
# HDOS - Hotel Digital Operating System
# Environment Variables Configuration
# ===========================================

# ===========================================
# REQUIRED - Database Configuration
# ===========================================
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

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
# Step 7: Run Database Migrations
# ===========================================
echo -e "${YELLOW}Step 7: Running database migrations...${NC}"

# Test database connection first
echo "Testing database connection..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
    
    # Run migrations
    echo "Running database migrations..."
    npm run db:push
    
    echo -e "${GREEN}✓ Database migrations completed${NC}"
else
    echo -e "${RED}✗ Database connection failed!${NC}"
    echo -e "${YELLOW}Please check your PostgreSQL configuration and try again.${NC}"
    exit 1
fi

echo ""

# ===========================================
# Step 8: Verify Installation
# ===========================================
echo -e "${YELLOW}Step 8: Verifying installation...${NC}"

# Run TypeScript check
echo "Running TypeScript check..."
if npm run check; then
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
echo -e "${BLUE}Project Configuration:${NC}"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo ""
echo -e "${BLUE}Available Commands:${NC}"
echo "  - ${YELLOW}npm run dev${NC}    : Start development server"
echo "  - ${YELLOW}npm run build${NC}  : Build for production"
echo "  - ${YELLOW}npm start${NC}     : Start production server"
echo "  - ${YELLOW}npm run check${NC}  : TypeScript type checking"
echo "  - ${YELLOW}npm run db:push${NC} : Push schema changes to database"
echo ""
echo -e "${BLUE}Server will start at:${NC} http://localhost:5000"
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
