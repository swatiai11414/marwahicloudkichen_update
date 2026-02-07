#!/bin/bash

# =============================================================================
# HDOS - Complete Setup Script
# Auto-installs requirements, configures database, and runs the application
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION - EDIT THESE VALUES
# =============================================================================

# Application Settings
APP_NAME="HDOS"
APP_PORT="${APP_PORT:-5000}"
NODE_ENV="${NODE_ENV:-development}"

# Database Settings
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-hdos}"
DB_PASSWORD="${DB_PASSWORD:-hdos_password}"
DB_NAME="${DB_NAME:-hdos}"

# PostgreSQL Connection String
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Session Secret (CHANGE IN PRODUCTION!)
SESSION_SECRET="${SESSION_SECRET:-change-this-to-a-secure-random-string-min-32-chars}"

# Super Admin Password
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Codex@2003}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_DIR="${SCRIPT_DIR}/backups"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
print_step() { echo -e "${BOLD}[→]${NC} $1"; }

# =============================================================================
# SYSTEM CHECKS
# =============================================================================

check_system() {
    print_header "System Requirements Check"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        local node_major=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')
        print_status "Node.js found: $node_version"
        if [ "$node_major" -lt 24 ]; then
            print_warning "Node.js 24.0.0 or higher recommended (found: $node_version)"
        fi
    else
        print_warning "Node.js not found - will install via nvm"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        print_status "npm found: $(npm --version)"
    else
        print_error "npm not found!"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql >/dev/null 2>&1; then
        local pg_version=$(psql --version 2>/dev/null | awk '{print $3}')
        print_status "PostgreSQL found: $pg_version"
    else
        print_warning "PostgreSQL not found - will offer to install"
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        print_status "Docker found"
    else
        print_info "Docker not found (optional)"
    fi
    
    # Check Git
    if command -v git >/dev/null 2>&1; then
        print_status "Git found"
    else
        print_warning "Git not found"
    fi
}

# =============================================================================
# INSTALL POSTGRESQL
# =============================================================================

install_postgresql() {
    print_header "Installing PostgreSQL"
    
    if command -v psql >/dev/null 2>&1; then
        print_status "PostgreSQL already installed"
        return 0
    fi
    
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian|linuxmint)
                print_step "Installing PostgreSQL on Ubuntu/Debian..."
                sudo apt update >/dev/null 2>&1
                sudo apt install -y postgresql postgresql-contrib >/dev/null 2>&1
                sudo service postgresql start
                print_status "PostgreSQL installed and started"
                ;;
            centos|rhel|fedora)
                print_step "Installing PostgreSQL on CentOS/RHEL/Fedora..."
                sudo yum install -y postgresql-server postgresql-contrib >/dev/null 2>&1
                sudo postgresql-setup initdb >/dev/null 2>&1
                sudo systemctl start postgresql
                print_status "PostgreSQL installed and started"
                ;;
            *)
                print_error "Unsupported OS: $ID"
                print_info "Please install PostgreSQL manually"
                return 1
                ;;
        esac
    else
        print_error "Cannot detect OS"
        print_info "Please install PostgreSQL manually"
        return 1
    fi
}

# =============================================================================
# START POSTGRESQL SERVICE
# =============================================================================

start_postgresql() {
    print_step "Starting PostgreSQL service..."
    
    if command -v service >/dev/null 2>&1; then
        sudo service postgresql start 2>/dev/null || sudo service postgresql restart 2>/dev/null || true
    elif command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start postgresql 2>/dev/null || sudo systemctl restart postgresql 2>/dev/null || true
    fi
    
    sleep 2
    
    if command -v pg_isready >/dev/null 2>&1; then
        pg_isready -h localhost -p 5432 >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_status "PostgreSQL is running"
            return 0
        fi
    fi
    
    print_warning "PostgreSQL may not be running - trying Docker..."
    
    # Try Docker as fallback
    if command -v docker >/dev/null 2>&1; then
        if ! docker ps | grep -q "postgres"; then
            print_step "Starting PostgreSQL via Docker..."
            docker run -d \
                --name hdos-postgres \
                -e POSTGRES_USER="$DB_USER" \
                -e POSTGRES_PASSWORD="$DB_PASSWORD" \
                -e POSTGRES_DB="$DB_NAME" \
                -p "${DB_PORT}:5432" \
                -v postgres_data:/var/lib/postgresql/data \
                postgres:15-alpine >/dev/null 2>&1 || true
            
            sleep 5
            print_status "PostgreSQL Docker container started"
        else
            print_status "PostgreSQL Docker container already running"
        fi
    else
        print_error "PostgreSQL not running and Docker not available"
        return 1
    fi
}

# =============================================================================
# SETUP DATABASE
# =============================================================================

setup_database() {
    print_header "Setting Up Database"
    
    # Wait for PostgreSQL to be ready
    print_step "Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
            print_status "PostgreSQL is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL failed to start"
        return 1
    fi
    
    # Create user and database
    print_step "Creating database user and schema..."
    
    local pg_cmd="psql -h $DB_HOST -p $DB_PORT -U postgres 2>/dev/null"
    
    # Create user if not exists
    if ! $pg_cmd -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        print_info "Creating user: $DB_USER"
        $pg_cmd -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" >/dev/null 2>&1 || true
    fi
    
    # Create database if not exists
    if ! $pg_cmd -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
        print_info "Creating database: $DB_NAME"
        $pg_cmd -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >/dev/null 2>&1 || true
    fi
    
    # Grant privileges
    $pg_cmd -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >/dev/null 2>&1 || true
    
    print_status "Database setup complete"
}

# =============================================================================
# INSTALL NPM DEPENDENCIES
# =============================================================================

install_dependencies() {
    print_header "Installing npm Dependencies"
    
    print_step "Running npm install..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        return 1
    fi
}

# =============================================================================
# CONFIGURE ENVIRONMENT
# =============================================================================

configure_env() {
    print_header "Configuring Environment"
    
    # Create .env file
    cat > "$ENV_FILE" << EOF
# =============================================================================
# HDOS - Environment Configuration
# Generated by setup.sh
# =============================================================================

# Database Configuration
DATABASE_URL=$DATABASE_URL

# Security Secrets
SESSION_SECRET=$SESSION_SECRET
SUPER_ADMIN_PASSWORD=$SUPER_ADMIN_PASSWORD

# Server Configuration
PORT=$APP_PORT
NODE_ENV=$NODE_ENV
EOF
    
    print_status "Environment configured: $ENV_FILE"
    print_info "Port: $APP_PORT"
    print_info "Database: $DB_NAME on $DB_HOST:$DB_PORT"
}

# =============================================================================
# RUN MIGRATIONS
# =============================================================================

run_migrations() {
    print_header "Running Database Migrations"
    
    print_step "Running npm run db:push..."
    npm run db:push
    
    if [ $? -eq 0 ]; then
        print_status "Migrations completed successfully"
    else
        print_error "Migration failed - trying manual approach..."
        
        # Try manual migration
        local migrations_path="${SCRIPT_DIR}/migrations"
        if [ -d "$migrations_path" ]; then
            for sql_file in "$migrations_path"/*.sql; do
                if [ -f "$sql_file" ]; then
                    print_info "Applying: $(basename "$sql_file")"
                    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file" >/dev/null 2>&1 || true
                fi
            done
            print_status "Manual migration complete"
        fi
    fi
}

# =============================================================================
# START DEVELOPMENT SERVER
# =============================================================================

start_dev_server() {
    print_header "Starting Development Server"
    
    print_info "App will run on: http://localhost:$APP_PORT"
    print_info "Press Ctrl+C to stop"
    echo ""
    
    # Start the dev server
    npm run dev
}

# =============================================================================
# BUILD FOR PRODUCTION
# =============================================================================

build_production() {
    print_header "Building for Production"
    
    print_step "Running npm run build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_status "Build complete"
        print_info "Run with: PORT=$APP_PORT npm start"
    else
        print_error "Build failed"
        return 1
    fi
}

# =============================================================================
# SHOW STATUS
# =============================================================================

show_status() {
    print_header "System Status"
    
    # Node version
    echo -e "${BOLD}Node.js:${NC} $(node --version)"
    echo -e "${BOLD}npm:${NC} $(npm --version)"
    
    # Database status
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL: Running${NC}"
    else
        echo -e "${RED}PostgreSQL: Not Running${NC}"
    fi
    
    # App port
    echo -e "${BOLD}Application Port:${NC} $APP_PORT"
    echo -e "${BOLD}Environment:${NC} $NODE_ENV"
    
    # URLs
    echo ""
    echo -e "${BOLD}Application URLs:${NC}"
    echo "  • App: http://localhost:$APP_PORT"
    echo "  • API: http://localhost:$APP_PORT/api"
    echo "  • Login: http://localhost:$APP_PORT/login"
}

# =============================================================================
# CLEANUP
# =============================================================================

cleanup() {
    print_header "Cleanup"
    
    print_step "Stopping services..."
    
    # Stop Docker container if exists
    if docker ps | grep -q "hdos-postgres"; then
        docker stop hdos-postgres >/dev/null 2>&1 || true
        print_status "Stopped PostgreSQL Docker container"
    fi
    
    print_status "Cleanup complete"
}

# =============================================================================
# USAGE
# =============================================================================

usage() {
    cat << EOF
${BOLD}HDOS Setup Script${NC}

${BOLD}Usage:${NC} $0 [command] [options]

${BOLD}Commands:${NC}
  all           Complete setup and start server (default)
  quick         Setup without starting server
  install       Install PostgreSQL only
  start-db      Start PostgreSQL service
  setup-db      Create database and user
  deps          Install npm dependencies
  env           Configure environment variables
  migrate       Run database migrations
  dev           Start development server
  build         Build for production
  status        Show system status
  cleanup       Stop and cleanup services
  help          Show this help message

${BOLD}Options:${NC}
  PORT=<port>   Set application port (default: 5000)
  DB_HOST=<host> Set database host (default: localhost)
  DB_PORT=<port> Set database port (default: 5432)
  DB_USER=<user> Set database user (default: hdos)
  DB_PASS=<pass> Set database password (default: hdos_password)
  DB_NAME=<name> Set database name (default: hdos)

${BOLD}Examples:${NC}
  $0 all                    # Complete setup and start
  $0 all PORT=3000          # Start on port 3000
  $0 dev PORT=8080          # Start dev server on port 8080
  $0 quick                  # Setup only, don't start
  $0 build                  # Build for production

${BOLD}Notes:${NC}
  • Edit this script or set environment variables to customize
  • Default credentials are for development only - CHANGE IN PRODUCTION!
  • Docker will be used if PostgreSQL is not installed locally

EOF
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo -e "${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║                    HDOS Setup & Run Script                        ║${NC}"
    echo -e "${BOLD}║              Hotel Digital Operating System                       ║${NC}"
    echo -e "${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
    
    local command="${1:-all}"
    
    case "$command" in
        help|--help|-h)
            usage
            exit 0
            ;;
        all)
            check_system
            install_postgresql 2>/dev/null || true
            start_postgresql
            setup_database
            install_dependencies
            configure_env
            run_migrations
            show_status
            start_dev_server
            ;;
        quick)
            check_system
            install_postgresql 2>/dev/null || true
            start_postgresql
            setup_database
            install_dependencies
            configure_env
            run_migrations
            show_status
            ;;
        install)
            install_postgresql
            start_postgresql
            ;;
        start-db)
            start_postgresql
            ;;
        setup-db)
            setup_database
            ;;
        deps)
            install_dependencies
            ;;
        env)
            configure_env
            ;;
        migrate)
            configure_env
            run_migrations
            ;;
        dev)
            configure_env
            show_status
            start_dev_server
            ;;
        build)
            build_production
            ;;
        status)
            show_status
            ;;
        cleanup)
            cleanup
            ;;
        *)
            print_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

main "$@"
