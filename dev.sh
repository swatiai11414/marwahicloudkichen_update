#!/bin/bash

# ===========================================
# HDOS Development Server with Auto-Restart
# Uses systemd service for background execution
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PORT=80

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HDOS Development Server                                  ║${NC}"
echo -e "${BLUE}║  Background execution with auto-restart                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info() { echo -e "${CYAN}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✓  $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
log_error() { echo -e "${RED}✗  $1${NC}"; }

cd "$(dirname "$0")"

start_server() {
    echo "Starting HDOS server..."
    echo ""

    # Stop existing
    sudo systemctl stop hdos 2>/dev/null || true
    sleep 2

    # Create systemd service
    cat > /tmp/hdos.service <<EOF
[Unit]
Description=HDOS - Hotel Digital Operating System
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npx tsx server/index.ts
Environment=PORT=$PORT
Environment=NODE_ENV=development
Restart=always
RestartSec=10
StandardOutput=append:/tmp/server.log
StandardError=append:/tmp/server.log

[Install]
WantedBy=multi-user.target
EOF

    sudo cp /tmp/hdos.service /etc/systemd/system/hdos.service
    sudo systemctl daemon-reload
    sudo systemctl enable hdos
    sudo systemctl start hdos

    log_info "Waiting for server to start..."
    for i in {1..20}; do
        if sudo lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_success "Server is running!"
            echo ""
            echo "🌐 http://$(hostname -I 2>/dev/null | awk '{print $1}'):$PORT"
            echo ""
            echo "Server is running in BACKGROUND"
            echo "Use './dev.sh status' to check"
            echo "Use './dev.sh logs' to view logs"
            echo "Use './dev.sh stop' to stop"
            return 0
        fi
        sleep 2
    done

    log_error "Server failed to start!"
    echo ""
    echo "Check logs:"
    sudo systemctl status hdos
    exit 1
}

stop_server() {
    echo "Stopping HDOS server..."
    sudo systemctl stop hdos 2>/dev/null || true
    sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true
    log_success "Server stopped"
}

restart_server() {
    stop_server
    sleep 2
    start_server
}

check_status() {
    echo ""
    echo "HDOS Server Status:"
    echo ""

    if sudo systemctl is-active --quiet hdos 2>/dev/null; then
        log_success "Server is RUNNING"
        echo ""
        sudo systemctl status hdos --no-pager | head -8
    else
        log_error "Server is NOT RUNNING"
    fi

    echo ""
    echo "Port $PORT status:"
    if sudo lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $PORT is LISTENING"
    else
        echo "Port $PORT is NOT LISTENING"
    fi
}

view_logs() {
    echo "HDOS Server Logs:"
    echo ""
    sudo journalctl -u hdos -n 100 --no-pager 2>/dev/null || tail -100 /tmp/server.log
}

case "$1" in
    start) start_server ;;
    stop) stop_server ;;
    restart) restart_server ;;
    status) check_status ;;
    logs) view_logs ;;
    "")
        start_server
        ;;
    *)
        echo "Usage: ./dev.sh [start|stop|restart|status|logs]"
        echo ""
        echo "Commands:"
        echo "  start   - Start server in background"
        echo "  stop    - Stop server"
        echo "  restart - Restart server"
        echo "  status  - Check server status"
        echo "  logs    - View server logs"
        exit 1
        ;;
esac
