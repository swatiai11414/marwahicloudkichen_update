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
        if pg_isready -h localhost -p 5432 -U $DB_USER -d $DB_NAME 2>/dev/null; then
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
    sudo apt-get update -qq 2>&1 > /dev/null
    log_success "System updated"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 2: Node.js $NODE_VERSION...                              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    if command -v node &> /dev/null; then
        echo -e "${CYAN}Node.js $(node -v) installed${NC}"
    else
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - 2>&1 > /dev/null
        sudo apt-get install -y nodejs 2>&1 > /dev/null
        log_success "Node.js $NODE_VERSION installed"
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 3: PostgreSQL...                                   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    if ! command -v psql &> /dev/null; then
        sudo apt-get install -y postgresql postgresql-contrib 2>&1 > /dev/null
    fi
    log_success "PostgreSQL ready"

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 4: Configuring database...                          ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    
    PG_VERSION=$(ls /etc/postgresql/ 2>/dev/null | grep -E '^[0-9]+$' | sort -n | tail -1)
    [ -z "$PG_VERSION" ] && PG_VERSION=16
    
    sudo bash -c "cat > /etc/postgresql/$PG_VERSION/main/pg_hba.conf <<EOF
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF"
    
    sudo service postgresql start 2>/dev/null
    sleep 2
    
    sudo su - postgres -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' SUPERUSER;\" 2>/dev/null" || true
    sudo su - postgres -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\" 2>/dev/null" || true
    
    sudo service postgresql restart
    sleep 2
    
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database configured!"
    else
        log_error "Database connection failed!"
    fi

    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Step 5: Creating .env file...                            ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    
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
    echo -e "${YELLOW}║  Step 6: Installing dependencies...                       ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    npm ci 2>&1 > /dev/null || npm install 2>&1 > /dev/null
    log_success "Dependencies installed"
}

do_migrate() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Running migrations...                                  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    
    wait_postgres || return 1
    npm run db:push > /tmp/db-mig.log 2>&1
    log_success "Migrations done"
    
    if [ -f "migrations/0003_add_store_availability_tables.sql" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f migrations/0003_add_store_availability_tables.sql > /tmp/mig-0003.log 2>&1 || true
        log_success "Migration 0003 applied"
    fi
}

do_start() {
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Starting server on port $PORT...                         ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    
    sed -i "s/PORT=.*/PORT=$PORT/" .env 2>/dev/null || true
    sudo pkill -f 'tsx server/index.ts' 2>/dev/null || true
    sleep 2
    
    cd "$(dirname "$0")"
    sudo PORT=$PORT npm run dev > /tmp/server.log 2>&1 &
    sleep 6
    
    if sudo lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Server started on port $PORT"
    else
        log_error "Server failed to start"
        tail -5 /tmp/server.log 2>/dev/null
    fi
}

do_stop() {
    echo ""
    echo -e "${YELLOW}Stopping server...${NC}"
    sudo pkill -f 'tsx server/index.ts' 2>/dev/null || true
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
    echo -e "${YELLOW}║  Server Status                                           ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    
    if sudo lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_success "Server RUNNING on port $PORT"
    else
        log_error "Server NOT RUNNING"
    fi
    
    echo ""
    echo "Node: $(node -v 2>/dev/null || echo 'N/A')"
    echo "PG: $(pg_isready -h localhost -p 5432 2>/dev/null && echo 'Ready' || echo 'N/A')"
}

do_logs() {
    echo ""
    echo -e "${YELLOW}Server Logs${NC}"
    tail -50 /tmp/server.log 2>/dev/null || echo "No logs"
}

case $COMMAND in
    install) do_install ;;
    migrate) do_migrate ;;
    start) do_start ;;
    stop) do_stop ;;
    restart) do_restart ;;
    status) do_status ;;
    logs) do_logs ;;
    all) do_install; do_migrate; do_start ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  DONE!                                                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo -e "${CYAN}🌐 http://$IP:$PORT${NC}"
echo ""
