#!/bin/bash

# Script to run the Narwahi Cloud Kitchen project on port 80
# Note: Port 80 requires root privileges. You may need to run with sudo:
# sudo ./run-port-80.sh

echo "🚀 Starting Narwahi Cloud Kitchen on port 80..."
echo "Note: Port 80 requires root privileges. Using sudo automatically."

# Set the port environment variable
export PORT=80

# Change to the project directory
cd "$(dirname "$0")"

# Run the development server with sudo (required for port 80)
sudo -E npm run dev
