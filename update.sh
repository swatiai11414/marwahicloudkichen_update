#!/bin/bash
# HDOS - Application Update Script
# Run: ./update.sh or bash update.sh

set -e

echo "=== HDOS Application Update ==="
echo "Starting update process..."

# Stop the service
echo "Stopping HDOS service..."
sudo systemctl stop hdos

# Backup current version (optional)
BACKUP_DIR="/var/backups/hdos/pre-update-$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $BACKUP_DIR..."
sudo mkdir -p $BACKUP_DIR
sudo cp -r /var/www/hdos $BACKUP_DIR/

# Update application
echo "Updating application code..."
cd /var/www/hdos
sudo -u hdos git pull origin main

# Install dependencies
echo "Installing dependencies..."
sudo -u hdos npm ci --production=false

# Build application
echo "Building application..."
sudo -u hdos npm run build

# Run database migrations if needed
echo "Checking for database migrations..."
sudo -u hdos npm run db:push

# Set proper permissions
echo "Setting permissions..."
sudo chown -R hdos:www-data /var/www/hdos
sudo chmod -R 755 /var/www/hdos

# Start the service
echo "Starting HDOS service..."
sudo systemctl start hdos

# Wait a moment and check status
sleep 5
if sudo systemctl is-active --quiet hdos; then
    echo "✓ Update completed successfully!"
    echo "✓ HDOS service is running"
else
    echo "✗ Update failed - service not running"
    echo "Check logs with: sudo journalctl -u hdos -n 20"
    exit 1
fi

# Health check
if curl -s -f http://localhost:5000/health > /dev/null; then
    echo "✓ Application health check passed"
else
    echo "✗ Application health check failed"
fi

echo "Update process completed at $(date)"