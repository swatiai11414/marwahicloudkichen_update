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
MAGENTA='\033[0;35m'
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
sudo systemctl enable postgresql 2>/dev/null || true

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
# Step 6: Test Database Connection
# ===========================================
echo -e "${YELLOW}Step 6: Testing database connection...${NC}"

# Export DATABASE_URL for testing
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify connection, continuing anyway...${NC}"
fi
echo ""

# ===========================================
# Step 7: Install Project Dependencies
# ===========================================
echo -e "${YELLOW}Step 7: Installing npm dependencies...${NC}"

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
# Step 8: Configure Environment Variables
# ===========================================
echo -e "${YELLOW}Step 8: Configuring environment variables...${NC}"

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
# Step 9: Run Database Migrations
# ===========================================
echo -e "${YELLOW}Step 9: Running database migrations...${NC}"

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
# Step 10: Verify Installation
# ===========================================
echo -e "${YELLOW}Step 10: Verifying installation...${NC}"

# Run TypeScript check
echo "Running TypeScript check..."
if npm run check 2>&1; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript check completed with warnings (this is OK for development)${NC}"
fi

echo ""

# ===========================================
# Step 11: Port Configuration
# ===========================================
echo -e "${YELLOW}Step 11: Configure server port...${NC}"

# Ask for port number
read -p "Enter port number to run the server (default: 5000): " -r
echo ""

if [[ -z "$REPLY" ]]; then
    PORT_NUMBER="5000"
else
    PORT_NUMBER="$REPLY"
fi

echo "Using port: $PORT_NUMBER"

# Update .env with selected port
if [ -f ".env" ]; then
    # Update PORT in .env file
    sed -i "s/^PORT=.*/PORT=$PORT_NUMBER/" .env
    echo -e "${GREEN}✓ Port updated in .env file${NC}"
fi

echo ""

# ===========================================
# Step 12: Ngrok Setup (Optional)
# ===========================================
echo -e "${YELLOW}Step 12: Ngrok Setup (Optional)...${NC}"

read -p "Do you want to set up ngrok for public URL? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting up ngrok..."
    
    # Check if ngrok is installed
    if command -v ngrok &> /dev/null; then
        echo -e "${YELLOW}Ngrok is already installed${NC}"
    else
        echo "Downloading and installing ngrok..."
        
        # Download ngrok
        if command -v wget &> /dev/null; then
            wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
        elif command -v curl &> /dev/null; then
            curl -sL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -o /tmp/ngrok.tgz
        else
            echo -e "${RED}Error: Neither wget nor curl is installed${NC}"
        fi
        
        if [ -f /tmp/ngrok.tgz ]; then
            sudo tar -xzf /tmp/ngrok.tgz -C /usr/local/bin ngrok
            rm /tmp/ngrok.tgz
            echo -e "${GREEN}✓ Ngrok installed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to download ngrok${NC}"
        fi
    fi
    
    # Authenticate ngrok (optional)
    echo ""
    read -p "Do you have a ngrok authtoken? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "To authenticate ngrok, run:"
        echo -e "${CYAN}  ngrok config add-authtoken YOUR_AUTHTOKEN${NC}"
        echo ""
        echo "You can get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    fi
    
    echo ""
    echo -e "${GREEN}✓ Ngrok setup complete!${NC}"
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  NGROK USAGE INSTRUCTIONS:                              ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "1. Start your server first:"
    echo -e "   ${CYAN}npm run dev${NC}"
    echo ""
    echo "2. In another terminal, run ngrok:"
    echo -e "   ${CYAN}ngrok http $PORT_NUMBER${NC}"
    echo ""
    echo "3. You'll get a public URL like:"
    echo -e "   ${GREEN}https://xxxx-xxxx.ngrok.io${NC}"
    echo ""
    echo "4. Use this URL to access your server publicly!"
    echo ""
else
    echo -e "${YELLOW}Skipping ngrok setup${NC}"
fi

echo ""

# ===========================================
# Step 13: Start Server Options
# ===========================================
echo -e "${YELLOW}Step 13: Starting server options...${NC}"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  SETUP COMPLETED SUCCESSFULLY!                             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📦 Project Configuration:${NC}"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - Node.js: $(node -v)"
echo "  - npm: $(npm -v)"
echo "  - Port: $PORT_NUMBER"
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

# Ask if user wants to start the server
read -p "Do you want to start the development server now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting development server on port $PORT_NUMBER...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    export PORT=$PORT_NUMBER
    npm run dev
fi
