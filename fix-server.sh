#!/bin/bash

# HDOS Server Fix Script
# Usage: ./fix-server.sh

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
SERVER_IP="13.50.247.62"
SSH_KEY="miss.pem"
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
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true"
sleep 2
print_status "Old processes killed"

# Step 2: Pull latest code
echo ""
echo "Step 2: Pulling latest code from GitHub..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "cd $PROJECT_DIR && git pull origin main"
print_status "Code updated"

# Step 3: Start server
echo ""
echo "Step 3: Starting server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "cd $PROJECT_DIR && sudo NODE_ENV=development PORT=80 npx tsx server/index.ts &"
sleep 8
print_status "Server started"

# Step 4: Test endpoints
echo ""
echo "Step 4: Testing endpoints..."

# Test health endpoint
HEALTH=$(curl -s http://"$SERVER_IP"/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
    print_status "API Health: OK"
else
    print_error "API Health: FAILED"
    print_warning "Server might still be starting, waiting more..."
    sleep 5
    HEALTH=$(curl -s http://"$SERVER_IP"/api/health 2>/dev/null)
    if echo "$HEALTH" | grep -q "ok"; then
        print_status "API Health: OK (after retry)"
    else
        print_error "API Health: Still failing"
    fi
fi

# Test shops endpoint
SHOPS=$(curl -s http://"$SERVER_IP"/api/shops/list 2>/dev/null)
if echo "$SHOPS" | grep -q "\["; then
    print_status "Shops API: OK (Response: $SHOPS)"
else
    print_error "Shops API: FAILED"
fi

# Test HTML page
HTML_SIZE=$(curl -s http://"$SERVER_IP"/ 2>/dev/null | wc -c)
if [ "$HTML_SIZE" -gt 1000 ]; then
    print_status "Landing Page: OK ($HTML_SIZE bytes)"
else
    print_error "Landing Page: FAILED ($HTML_SIZE bytes)"
fi

# Step 5: Show server status
echo ""
echo "Step 5: Server Process Status..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "ps aux | grep tsx | grep -v grep | head -3"

echo ""
echo "=========================================="
echo "  Fix Complete!"
echo "=========================================="
echo ""
echo "🌐 Open browser: http://$SERVER_IP"
echo "🔐 Super Admin: http://$SERVER_IP/login/super-admin"
echo "🔐 Shop Admin:  http://$SERVER_IP/login/shop-admin"
echo ""
