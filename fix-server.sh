#!/bin/bash

# HDOS Server Fix Script
# Usage: ./fix-server.sh
# Run this directly on your VPS server!
# This script fixes and restarts the server WITHOUT pulling code

set -e

echo "=========================================="
echo "  HDOS Server Fix & Restart Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ubuntu/marwahicloudkichen_update"

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Kill existing server processes
echo "Step 1: Stopping existing server processes..."
sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true
sudo pkill -9 -f 'node.*tsx' 2>/dev/null || true
sudo fuser -k 80/tcp 2>/dev/null || true
sleep 3
print_status "Old processes killed"

# Step 2: Free port 80
echo ""
echo "Step 2: Freeing port 80..."
sudo fuser -k 80/tcp 2>/dev/null || true
sleep 1
print_status "Port 80 freed"

# Step 3: Clean up node_modules cache (optional)
echo ""
echo "Step 3: Clearing temporary cache..."
rm -rf "$PROJECT_DIR"/node_modules/.vite 2>/dev/null || true
rm -rf "$PROJECT_DIR"/node_modules/.cache 2>/dev/null || true
print_status "Cache cleared"

# Step 4: Start server
echo ""
echo "Step 4: Starting server..."
cd "$PROJECT_DIR"
sudo NODE_ENV=development PORT=80 nohup npx tsx server/index.ts > /tmp/server.log 2>&1 &
sleep 10
print_status "Server started"

# Step 5: Test endpoints
echo ""
echo "Step 5: Testing endpoints..."

# Test health endpoint
HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    print_status "API Health: OK"
else
    print_error "API Health: FAILED"
    print_warning "Server might still be starting, waiting more..."
    sleep 5
    HEALTH=$(curl -s http://localhost/api/health 2>/dev/null)
    if echo "$HEALTH" | grep -q "ok"; then
        print_status "API Health: OK (after retry)"
    else
        print_error "API Health: Still failing"
        echo ""
        echo "Server log:"
        tail -20 /tmp/server.log 2>/dev/null || echo "No logs available"
    fi
fi

# Test shops endpoint
SHOPS=$(curl -s http://localhost/api/shops/list 2>/dev/null)
if echo "$SHOPS" | grep -q "\["; then
    print_status "Shops API: OK (Response: $SHOPS)"
else
    print_warning "Shops API: Empty or slow"
fi

# Test HTML page
HTML_SIZE=$(curl -s http://localhost/ 2>/dev/null | wc -c)
if [ "$HTML_SIZE" -gt 1000 ]; then
    print_status "Landing Page: OK ($HTML_SIZE bytes)"
else
    print_error "Landing Page: FAILED ($HTML_SIZE bytes)"
fi

# Step 6: Show server status
echo ""
echo "Step 6: Server Process Status..."
ps aux | grep tsx | grep -v grep | head -3

echo ""
echo "=========================================="
echo "  Fix Complete!"
echo "=========================================="
echo ""
echo "🌐 Open browser: http://YOUR_SERVER_IP"
echo "🔐 Super Admin: http://YOUR_SERVER_IP/login/super-admin"
echo "🔐 Shop Admin:  http://YOUR_SERVER_IP/login/shop-admin"
echo ""
