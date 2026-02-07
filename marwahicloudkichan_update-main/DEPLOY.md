# HDOS - Deployment Guide

Hotel Digital Operating System - Step-by-step deployment instructions for multiple platforms.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (local or hosted)
- Git installed

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd hdos

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

---

## Platform-Specific Deployment

### 1. Replit

Replit is the easiest deployment option with built-in PostgreSQL support.

**Steps:**

1. Import your repository to Replit
2. Replit will auto-detect the Node.js project
3. Go to **Secrets** tab and add:
   - `DATABASE_URL` - Use Replit's built-in PostgreSQL (auto-configured)
   - `SESSION_SECRET` - Generate a secure random string
   - `SUPER_ADMIN_PASSWORD` - Your admin password
4. Click **Run** - Replit will automatically:
   - Install dependencies
   - Build the project
   - Start the server
5. Click **Publish** to make your app live

**Notes:**
- Replit provides free PostgreSQL database
- HTTPS is automatically configured
- Custom domains supported on paid plans

---

### 2. Vercel

Vercel is great for serverless deployments, but requires external PostgreSQL.

**Database Setup:**
Use one of these PostgreSQL providers:
- [Neon](https://neon.tech) (recommended, free tier)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

**Steps:**

1. Push your code to GitHub

2. Import project on [Vercel](https://vercel.com):
   ```
   Dashboard → New Project → Import Git Repository
   ```

3. Configure Build Settings:
   - Framework: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

4. Add Environment Variables:
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=your-secret-key
   SUPER_ADMIN_PASSWORD=your-admin-password
   NODE_ENV=production
   ```

5. Deploy!

**Important:** Vercel's serverless functions have limitations:
- File uploads need external storage (S3, Cloudinary)
- Session storage works but may have cold start delays

---

### 3. Render

Render offers easy deployment with built-in PostgreSQL.

**Steps:**

1. Push your code to GitHub

2. Create PostgreSQL Database on Render:
   - Dashboard → New → PostgreSQL
   - Copy the Internal Database URL

3. Create Web Service:
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Configure:
     - Name: `hdos`
     - Runtime: Node
     - Build Command: `npm ci && npm run build`
     - Start Command: `npm start`

4. Add Environment Variables:
   ```
   DATABASE_URL=<your-internal-database-url>
   SESSION_SECRET=<generate-random-string>
   SUPER_ADMIN_PASSWORD=<your-password>
   NODE_ENV=production
   ```

5. Deploy!

**Alternative:** Use the included `render.yaml` for automatic setup:
- Push `render.yaml` to your repo
- Render will auto-configure everything

---

### 4. Railway

Railway offers simple deployments with built-in PostgreSQL.

**Steps:**

1. Sign up at [Railway](https://railway.app)

2. Create new project from GitHub

3. Add PostgreSQL:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-generates `DATABASE_URL`

4. Add Environment Variables:
   ```
   SESSION_SECRET=your-secret-key
   SUPER_ADMIN_PASSWORD=your-admin-password
   NODE_ENV=production
   PORT=5000
   ```

5. Configure Build:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`

6. Deploy!

---

### 5. Ubuntu VPS (DigitalOcean, Linode, AWS EC2, Vultr)

For full control and production-ready deployment, use a VPS with systemd service management.

**Prerequisites:**
- Ubuntu 22.04+ server (2GB RAM minimum, 4GB recommended)
- SSH access with sudo privileges
- Domain name (required for SSL)
- Root or sudo user access

**Step 1: Initial Server Setup**

```bash
# Update system and install essential packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw fail2ban htop

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create application user
sudo useradd -m -s /bin/bash hdos
sudo usermod -aG www-data hdos

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally (optional, for process monitoring)
sudo npm install -g pm2
```

**Step 2: Database Setup**

```bash
# Switch to postgres user and create database
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE hdos;
CREATE USER hdos_user WITH ENCRYPTED PASSWORD 'your-secure-db-password-here';
GRANT ALL PRIVILEGES ON DATABASE hdos TO hdos_user;
ALTER USER hdos_user CREATEDB;
\q

# Create database directory with proper permissions
sudo mkdir -p /var/lib/postgresql/data
sudo chown postgres:postgres /var/lib/postgresql/data
```

**Step 3: Application Deployment**

```bash
# Create application directory
sudo mkdir -p /var/www/hdos
sudo chown -R hdos:www-data /var/www/hdos

# Clone repository as hdos user
sudo -u hdos git clone <your-repo-url> /var/www/hdos
cd /var/www/hdos

# Install dependencies
sudo -u hdos npm ci --production=false

# Create uploads directory
sudo mkdir -p /var/www/hdos/uploads
sudo chown -R hdos:www-data /var/www/hdos/uploads
sudo chmod -R 755 /var/www/hdos/uploads

# Create .env file
sudo -u hdos nano .env
```

Add to `.env`:
```
DATABASE_URL=postgresql://hdos_user:your-secure-db-password-here@localhost:5432/hdos
SESSION_SECRET=your-super-secret-key-minimum-32-characters-long
SUPER_ADMIN_PASSWORD=YourSecureAdminPassword123!
NODE_ENV=production
PORT=5000
```

```bash
# Build application
sudo -u hdos npm run build

# Push database schema
sudo -u hdos npm run db:push

# Set proper permissions
sudo chown -R hdos:www-data /var/www/hdos
sudo chmod -R 755 /var/www/hdos
```

**Step 4: Systemd Service Setup**

```bash
# Copy the systemd service file
sudo cp /var/www/hdos/hdos.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable hdos
sudo systemctl start hdos

# Check service status
sudo systemctl status hdos
```

**Step 5: Nginx Configuration**

```bash
# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Create nginx configuration
sudo nano /etc/nginx/sites-available/hdos
```

Add the following configuration:
```nginx
# Upstream backend
upstream hdos_backend {
    server localhost:5000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy settings
    location / {
        proxy_pass http://hdos_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files with caching
    location /uploads {
        alias /var/www/hdos/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    # Security: Don't serve dotfiles
    location ~ /\. {
        deny all;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/hdos /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

**Step 6: SSL Certificate with Let's Encrypt**

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Set up automatic renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

**Step 7: Monitoring and Logs**

```bash
# Copy monitoring and update scripts
sudo cp /var/www/hdos/monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/monitor.sh
sudo cp /var/www/hdos/update.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/update.sh

# Run system monitoring
sudo /usr/local/bin/monitor.sh

# Update application (when new version is available)
sudo /usr/local/bin/update.sh

# View application logs
sudo journalctl -u hdos -f

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 monitoring (if using PM2 instead of systemd)
pm2 monit
```

**Step 8: Backup Configuration**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-hdos.sh
```

Add backup script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/hdos"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hdos"
DB_USER="hdos_user"

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Database backup
sudo -u postgres pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
sudo tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www hdos

# Keep only last 7 days of backups
sudo find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
sudo find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable and set up cron
sudo chmod +x /usr/local/bin/backup-hdos.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-hdos.sh
```

**Step 9: Security Hardening**

```bash
# Configure fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Disable root login via SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Set up log rotation
sudo nano /etc/logrotate.d/hdos
```

Add log rotation config:
```
/var/log/hdos/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 hdos www-data
    postrotate
        systemctl reload hdos
    endscript
}
```

**Optional: PM2 Alternative Setup**

If you prefer PM2 over systemd:

```bash
# Start with PM2
sudo -u hdos pm2 start /var/www/hdos/dist/index.cjs --name hdos

# Save PM2 configuration
sudo -u hdos pm2 save

# Generate startup script
sudo -u hdos pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u hdos --hp /home/hdos
```

**Troubleshooting Ubuntu VPS:**

```bash
# Check service status
sudo systemctl status hdos
sudo systemctl status nginx
sudo systemctl status postgresql

# Restart services
sudo systemctl restart hdos
sudo systemctl restart nginx

# Check logs
sudo journalctl -u hdos -n 50
sudo journalctl -u nginx -n 50

# Check database connection
sudo -u hdos psql $DATABASE_URL -c "SELECT version();"

# Test application
curl -I http://localhost:5000/health
```

**Performance Optimization:**

```bash
# Enable PostgreSQL optimizations
sudo nano /etc/postgresql/15/main/postgresql.conf
# Add/modify:
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB

sudo systemctl restart postgresql

# Nginx optimizations
sudo nano /etc/nginx/nginx.conf
# Add in http block:
# worker_processes auto;
# worker_connections 1024;

sudo systemctl restart nginx

# Node.js performance
# Add to .env:
NODE_OPTIONS="--max-old-space-size=512"
```

**Scaling Considerations:**

- **Vertical Scaling:** Increase VPS RAM/CPU for better performance
- **Database:** Consider connection pooling, read replicas for high traffic
- **File Storage:** Use external storage (AWS S3, Cloudinary) for uploaded files
- **Load Balancing:** Add multiple application servers behind a load balancer
- **Caching:** Implement Redis for session and data caching
- **CDN:** Use Cloudflare or similar for static asset delivery

---

### 6. Docker Deployment

Use the included `Dockerfile` for containerized deployment.

**Build and Run:**

```bash
# Build image
docker build -t hdos .

# Run container
docker run -d \
  --name hdos \
  -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e SESSION_SECRET=your-secret-key \
  -e SUPER_ADMIN_PASSWORD=your-password \
  -v hdos-uploads:/app/uploads \
  hdos
```

**Docker Compose (recommended):**

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://hdos:hdos@db:5432/hdos
      - SESSION_SECRET=your-secret-key
      - SUPER_ADMIN_PASSWORD=your-password
      - NODE_ENV=production
    volumes:
      - uploads:/app/uploads
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=hdos
      - POSTGRES_PASSWORD=hdos
      - POSTGRES_DB=hdos
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  uploads:
  postgres_data:
```

```bash
docker-compose up -d
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption (min 32 chars) |
| `SUPER_ADMIN_PASSWORD` | Yes | Password for Super Admin login |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment mode (development/production) |

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Check if PostgreSQL is running
- Ensure database user has correct permissions

### Session/Login Issues
- Verify `SESSION_SECRET` is set
- Check if cookies are being set (HTTPS required in production)
- Clear browser cookies and try again

### Build Failures
- Run `npm ci` instead of `npm install`
- Ensure Node.js 20+ is installed
- Check for TypeScript errors: `npm run check`

### File Upload Issues
- Ensure `uploads` directory exists and is writable
- Check file size limits (default: 5MB)

---

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Open an issue on GitHub
