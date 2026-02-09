#!/bin/bash

# ===========================================
# HDOS - Hotel Digital Operating System
# Complete Setup & Deployment Script
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DB_NAME="hdos"
DB_USER="swatiai11414"
DB_PASSWORD="Swatiai@@@###2003"
NODE_VERSION="24"
PORT=80
ERROR_COUNT=0

show_help() {
    echo "Usage: ./setup.sh [OPTIONS] [COMMAND]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT    Set port (default: 80)"
    echo "  -h, --help         Show help"
    echo ""
    echo "Commands:"
    echo "  install            Install all dependencies"
    echo "  migrate            Run database migrations"
    echo "  start              Start server"
    echo "  stop               Stop server"
    echo "  restart            Restart server"
    echo "  status             Check status"
    echo "  logs               View logs"
    echo "  all                Full setup"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port) PORT="$2"; shift 2 ;;
        -h|--help) show_help; exit 0 ;;
        install|migrate|start|stop|restart|status|logs|all) COMMAND="$1"; shift ;;
        *) echo "Unknown: $1"; show_help; exit 1 ;;
    esac
done
COMMAND="${COMMAND:-all}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HDOS - Hotel Digital Operating System             ║${NC}"
echo -e "${BLUE}║  Setup & Deployment Script                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Port: $PORT | Command: $COMMAND${NC}"
echo ""

log_info() { echo -e "${CYAN}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✓  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error() { echo -e "${RED}✗  $1${NC}"; ERROR_COUNT=$((ERROR_COUNT + 1)); }

wait_postgres() {
    log_info "Waiting for PostgreSQL..."
    for i in {1..30}; do
        if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "PostgreSQL ready!"
            return 0
        fi
        sleep 2
    done
    log_error "PostgreSQL not ready"
    return 1
}

do_install() {
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 1: Updating system...                              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    sudo apt-get update -qq 2>&1 > /dev/null || true
    log_success "System updated"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 2: Node.js $NODE_VERSION...                              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    if command -v node &> /dev/null; then
        echo -e "${CYAN}Node.js $(node -v) installed${NC}"
    else
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - 2>&1 > /dev/null || true
        sudo apt-get install -y nodejs 2>&1 > /dev/null || true
        log_success "Node.js $NODE_VERSION installed"
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 3: PostgreSQL...                                   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    if ! command -v psql &> /dev/null; then
        sudo apt-get install -y postgresql postgresql-contrib 2>&1 > /dev/null || true
    fi
    log_success "PostgreSQL installed"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 4: Starting PostgreSQL...                          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    sudo service postgresql start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || true
    sleep 2
    log_success "PostgreSQL started"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 5: Configuring database...                         ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    # Configure PostgreSQL for password authentication
    log_info "Configuring PostgreSQL authentication..."

    # Get PostgreSQL version
    PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | grep -E '^[0-9]+$' | sort -n | tail -1)
    [ -z "$PG_VERSION" ] && PG_VERSION=16

    # Update pg_hba.conf to allow password authentication
    sudo bash -c "cat > /etc/postgresql/$PG_VERSION/main/pg_hba.conf <<'HBA'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
HBA"

    # Restart PostgreSQL
    sudo service postgresql restart 2>/dev/null || sudo pg_ctlcluster $PG_VERSION main restart 2>/dev/null || true
    sleep 2

    # Create user and database using postgres system user
    log_info "Creating database user and schema..."

    # Drop existing if exists
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
    sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

    # Create user with password
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;"

    # Create database
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

    # Grant all privileges
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

    # Restart PostgreSQL again
    sudo service postgresql restart 2>/dev/null || sudo pg_ctlcluster $PG_VERSION main restart 2>/dev/null || true
    sleep 2

    # Test connection
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database configured successfully!"
    else
        log_error "Database connection failed!"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 6: Creating .env file...                           ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    # URL encode the password
    ENCODED_PASSWORD=$(echo -n "$DB_PASSWORD" | sed 's/@/%40/g' | sed 's/#/%23/g')

    cat > .env <<EOF
DATABASE_URL=postgresql://$DB_USER:$ENCODED_PASSWORD@localhost:5432/$DB_NAME
SESSION_SECRET=0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0
SUPER_ADMIN_PASSWORD=Codex@2003
PORT=$PORT
NODE_ENV=development
EOF
    log_success ".env created"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 7: Installing dependencies...                      ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    if [ -d "node_modules" ]; then
        log_info "node_modules exists, running npm ci..."
        npm ci 2>&1 | tail -5 || npm install 2>&1 | tail -5
    else
        log_info "Installing dependencies..."
        npm install 2>&1 | tail -10
    fi

    if [ -d "node_modules" ]; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

do_migrate() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Running migrations...                                   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    wait_postgres || return 1

    # Run drizzle push
    log_info "Running database migrations..."
    npm run db:push 2>&1 | tail -10

    if [ $? -eq 0 ]; then
        log_success "Database migrations completed!"
    else
        log_error "Database migrations failed!"
        exit 1
    fi
}

do_start() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Starting server on port $PORT...                        ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    # Update PORT in .env
    sed -i "s/PORT=.*/PORT=$PORT/" .env 2>/dev/null || true

    # Kill existing server
    sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true
    sudo pkill -9 -f 'node.*tsx' 2>/dev/null || true
    sleep 2

    # Free port if occupied
    sudo fuser -k ${PORT}/tcp 2>/dev/null || true
    sleep 1

    cd "$(dirname "$0")"

    # Start server with sudo
    log_info "Starting server..."
    sudo PORT=$PORT NODE_ENV=development nohup npm run dev > /tmp/server.log 2>&1 &

    # Wait for server to start
    log_info "Waiting for server to start..."
    for i in {1..15}; do
        if sudo lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_success "Server started successfully on port $PORT!"
            return 0
        fi
        sleep 2
    done

    log_error "Server failed to start!"
    echo ""
    echo "Server log:"
    tail -20 /tmp/server.log 2>/dev/null
    exit 1
}

do_stop() {
    echo ""
    echo -e "${YELLOW}Stopping server...${NC}"
    sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true
    sudo pkill -9 -f 'node.*tsx' 2>/dev/null || true
    sudo fuser -k ${PORT}/tcp 2>/dev/null || true
    sleep 2
    log_success "Server stopped"
}

do_restart() {
    do_stop
    sleep 2
    do_start
}

do_status() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Server Status                                          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

    if sudo lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Server RUNNING on port $PORT"
    else
        log_error "Server NOT RUNNING on port $PORT"
    fi

    echo ""
    echo "Node: $(node -v 2>/dev/null || echo 'N/A')"
    echo "PostgreSQL: $(sudo service postgresql status 2>/dev/null | grep -q 'online\|active' && echo 'Connected' || echo 'Not Connected')"
    echo ""
    echo "Recent server logs:"
    tail -10 /tmp/server.log 2>/dev/null || echo "No logs found"
}

do_logs() {
    echo ""
    echo -e "${YELLOW}Server Logs${NC}"
    tail -50 /tmp/server.log 2>/dev/null || echo "No logs found"
}

# Main execution
case $COMMAND in
    install) do_install ;;
    migrate) do_migrate ;;
    start) do_start ;;
    stop) do_stop ;;
    restart) do_restart ;;
    status) do_status ;;
    logs) do_logs ;;
    all)
        do_install
        do_migrate
        do_start
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  DONE!                                                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo -e "${CYAN}🌐 http://$IP:$PORT${NC}"
echo -e "${CYAN}🔐 Super Admin: http://$IP:$PORT/login/super-admin${NC}"
echo ""
