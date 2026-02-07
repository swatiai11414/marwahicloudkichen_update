#!/bin/bash
echo "🔄 Restarting Narwahi Cloud Kitchen server..."

# Kill any existing node processes on port 80
sudo pkill -f "node dist/index.cjs" || true

# Wait a moment
sleep 2

# Restart the server
cd /workspaces/narwahicloudkichen/sevice
sudo node dist/index.cjs --port=80