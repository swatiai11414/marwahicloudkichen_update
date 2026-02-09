#!/bin/bash

# HDOS Server Status Check
# Usage: ./server-status.sh
# Shows complete server status

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HDOS Server Status                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Colors for status
PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"

echo "=========================================="
echo "  Server Processes"
echo "=========================================="
echo ""

# Check tsx processes
TSX_COUNT=$(ps aux | grep tsx | grep -v grep | wc -l)
if [ "$TSX_COUNT" -gt 0 ]; then
    echo -e "${PASS} Server running ($TSX_COUNT process)"
    ps aux | grep tsx | grep -v grep | head -3
else
    echo -e "${FAIL} Server NOT running"
fi

echo ""
echo "=========================================="
echo "  Port Status"
echo "=========================================="
echo ""

# Check port 80
if sudo lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${PASS} Port 80: LISTENING"
else
    echo -e "${FAIL} Port 80: NOT LISTENING"
fi

echo ""
echo "=========================================="
echo "  API Health"
echo "=========================================="
echo ""

# Test API health
HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${PASS} API Health: OK"
    echo "$HEALTH" | head -3
else
    echo -e "${FAIL} API Health: FAILED"
fi

echo ""
echo "=========================================="
echo "  Database Status"
echo "=========================================="
echo ""

# Check PostgreSQL
if sudo service postgresql status 2>/dev/null | grep -q "online\|active"; then
    echo -e "${PASS} PostgreSQL: Running"
else
    echo -e "${FAIL} PostgreSQL: Not Running"
fi

# Test database connection
DB_TEST=$(PGPASSWORD=Swatiai@@@###2003 psql -U swatiai11414 -h localhost -d hdos -c "SELECT 1;" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${PASS} Database: Connected"
else
    echo -e "${FAIL} Database: Connection Failed"
fi

echo ""
echo "=========================================="
echo "  System Resources"
echo "=========================================="
echo ""

# CPU Load
LOAD=$(cat /proc/loadavg | awk '{print $1}')
echo "CPU Load: $LOAD"

# Memory
MEM=$(free -h | grep Mem | awk '{print $3 "/" $2}')
echo "Memory: $MEM"

# Disk
DISK=$(df -h / | grep -E "^/" | awk '{print $3 "/" $2}')
echo "Disk: $DISK"

echo ""
echo "=========================================="
echo "  Uptime"
echo "=========================================="
echo ""

UPTIME=$(uptime -p 2>/dev/null || uptime)
echo "$UPTIME"

echo ""
echo "=========================================="
echo "  Recent Server Logs"
echo "=========================================="
echo ""

if [ -f /tmp/server.log ]; then
    echo "Last 10 lines:"
    tail -10 /tmp/server.log 2>/dev/null
else
    echo -e "${WARN} No server log found"
fi

echo ""
echo "=========================================="
echo "  Quick Actions"
echo "=========================================="
echo ""
echo "To restart server: ./fix-server.sh"
echo "To stop server: ./kill-all.sh"
echo "To view logs: ./setup.sh logs"
echo ""
