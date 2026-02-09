#!/bin/bash

# HDOS Kill All Services Script
# Usage: ./kill-all.sh
# Run this on your VPS to kill all project services

echo "=========================================="
echo "  Killing All HDOS Services"
echo "=========================================="
echo ""

# Kill all tsx/node processes related to this project
echo "Stopping tsx/server processes..."
sudo pkill -9 -f 'tsx server/index.ts' 2>/dev/null || true
sudo pkill -9 -f 'tsx' 2>/dev/null || true

# Kill node processes running from project directory
echo "Stopping node processes..."
sudo pkill -9 -f 'node.*marwahicloudkichen_update' 2>/dev/null || true

# Kill any npm dev processes
echo "Stopping npm processes..."
sudo pkill -9 -f 'npm run dev' 2>/dev/null || true

# Kill esbuild processes
echo "Stopping esbuild processes..."
sudo pkill -9 -f 'esbuild' 2>/dev/null || true

# Clean up any hanging processes on port 80
echo "Freeing port 80..."
sudo fuser -k 80/tcp 2>/dev/null || true

echo ""
echo "=========================================="
echo "  All Services Killed!"
echo "=========================================="
echo ""
echo "Run './fix-server.sh' to restart the server"
echo ""
