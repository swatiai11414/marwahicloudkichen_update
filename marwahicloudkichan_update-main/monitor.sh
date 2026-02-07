#!/bin/bash
# HDOS - System Monitoring Script
# Run: ./monitor.sh or bash monitor.sh

echo "=== HDOS System Monitor ==="
echo "Timestamp: $(date)"
echo

# System Resources
echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo
echo "Memory Usage:"
free -h
echo
echo "Disk Usage:"
df -h /
echo

# Application Status
echo "=== Application Status ==="
if systemctl is-active --quiet hdos; then
    echo "✓ HDOS Service: Running"
else
    echo "✗ HDOS Service: Stopped"
fi

if systemctl is-active --quiet nginx; then
    echo "✓ Nginx: Running"
else
    echo "✗ Nginx: Stopped"
fi

if systemctl is-active --quiet postgresql; then
    echo "✓ PostgreSQL: Running"
else
    echo "✗ PostgreSQL: Stopped"
fi
echo

# Application Health Check
echo "=== Application Health ==="
if curl -s -f http://localhost:5000/health > /dev/null; then
    echo "✓ Application Health Check: OK"
else
    echo "✗ Application Health Check: FAILED"
fi
echo

# Recent Logs
echo "=== Recent Application Logs ==="
sudo journalctl -u hdos -n 5 --no-pager -q
echo

# Database Connection Test
echo "=== Database Connection ==="
if sudo -u postgres psql -h localhost -U hdos_user -d hdos -c "SELECT 1;" &>/dev/null; then
    echo "✓ Database Connection: OK"
else
    echo "✗ Database Connection: FAILED"
fi
echo

echo "=== End Monitor ==="