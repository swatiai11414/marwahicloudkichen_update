#!/bin/bash

# HDOS Kill All Services Script
# Usage: ./kill-all.sh
# Run this on your VPS to kill all project services

echo "=========================================="
echo "  Killing All HDOS Services"
echo "=========================================="
echo ""

# Kill all tsx/node processes related to this project (suppress output)
echo "Stopping tsx/server processes..."
sudo pkill -9 -f 'tsx server/index.ts' > /dev/null 2>&1 || true
sudo pkill -9 -f 'tsx' > /dev/null 2>&1 || true

# Kill node processes running from project directory
echo "Stopping node processes..."
sudo pkill -9 -f 'node.*marwahicloudkichen_update' > /dev/null 2>&1 || true

# Kill any npm dev processes
echo "Stopping npm processes..."
sudo pkill -9 -f 'npm run dev' > /dev/null 2>&1 || true

# Kill esbuild processes
echo "Stopping esbuild processes..."
sudo pkill -9 -f 'esbuild' > /dev/null 2>&1 || true

# Clean up any hanging processes on port 80
echo "Freeing port 80..."
sudo fuser -k 80/tcp > /dev/null 2>&1 || true

# Also stop systemd service if running
echo "Stopping systemd service..."
sudo systemctl stop hdos > /dev/null 2>&1 || true

echo ""
echo "=========================================="
echo "  All Services Killed!"
echo "=========================================="
echo ""
echo "Run './dev.sh start' or './fix-server.sh' to restart"
echo ""
