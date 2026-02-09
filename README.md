# HDOS - Hotel Digital Operating System

A multi-tenant SaaS platform for hotels and restaurants featuring QR-based ordering, dynamic shop pages, no-code page builder, WhatsApp integration, and role-based admin panels.

![HDOS Banner](https://via.placeholder.com/1200x400/2563eb/ffffff?text=HDOS+Hotel+Digital+Operating+System)

## Features

### 🏨 Multi-Tenant Architecture
- Each shop has a unique slug for public access (`/s/[slug]`)
- Shops can have custom themes, sections, menus, and offers
- Role-based access: Super Admin and Shop Admin

### 📱 QR-Based Ordering
- Customers scan QR to browse menu and place orders
- No login required for customers (phone + name only)
- Real-time order tracking

### 🎨 No-Code Page Builder
- Dynamic sections: Hero, Menu, Offers, About, WhatsApp, Gallery
- Visual page builder for shop admins
- Customizable themes and colors

### 💬 WhatsApp Integration
- Order confirmations sent via WhatsApp
- Bill sharing through WhatsApp links
- Customer notifications

### 📊 Analytics Dashboard
- Real-time today dashboard
- Customer behavior tracking
- Sales and revenue analytics
- Visitor data export

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Express.js, TypeScript
- **Database:** PostgreSQL 16, Drizzle ORM
- **Auth:** Passport.js, express-session
- **State:** TanStack Query

---

## 🚀 Quick Start (VPS)

### Step 1: Connect to VPS

```bash
ssh -i miss.pem ubuntu@13.50.247.62
```

### Step 2: Clone & Setup

```bash
cd /home/ubuntu/marwahicloudkichen_update
git pull
./setup.sh all
```

That's it! Your server will be running at: **http://13.50.247.62**

---

## 📖 User Guide

### Available Scripts

| Script | Description |
|--------|-------------|
| `./setup.sh all` | Complete setup: install, migrate, start |
| `./setup.sh install` | Install dependencies & setup database |
| `./setup.sh migrate` | Run database migrations |
| `./setup.sh start` | Start the server |
| `./setup.sh stop` | Stop the server |
| `./setup.sh restart` | Restart the server |
| `./setup.sh status` | Check server status |
| `./setup.sh logs` | View server logs |
| `./fix-server.sh` | Fix common issues & restart server |
| `./kill-all.sh` | Kill all project services |

---

## 🖥️ VPS Deployment Guide

### 1. First Time Setup

```bash
# Connect to VPS
ssh -i miss.pem ubuntu@YOUR_SERVER_IP

# Navigate to project directory
cd /home/ubuntu/marwahicloudkichen_update

# Pull latest code
git pull

# Run complete setup
./setup.sh all
```

### 2. Daily Operations

```bash
# Check server status
./setup.sh status

# View logs
./setup.sh logs

# Restart server
./setup.sh restart

# Stop server
./setup.sh stop
```

### 3. Fix Server Issues

```bash
# If server is not responding or has errors
./kill-all.sh      # Kill all processes
./fix-server.sh    # Restart with fresh code
./setup.sh status  # Verify it's running
```

### 4. Manual Server Start

```bash
# Kill old processes
sudo pkill -9 -f tsx

# Start server
cd /home/ubuntu/marwahicloudkichen_update
sudo NODE_ENV=development PORT=80 npx tsx server/index.ts &
```

---

## 👥 User Roles & Access

### 1. Super Admin (Platform Owner)

**Access:** `/login/super-admin`

**Capabilities:**
- View all shops on platform
- Create/Edit/Delete shops
- Manage themes
- View platform analytics
- Access visitor data
- Manage offers across all shops

**Default Password:** `Codex@2003`

### 2. Shop Admin (Individual Store Owner)

**Access:** `/login/shop-admin`

**Capabilities:**
- Manage own shop only
- Add/Edit menu categories and items
- View and manage orders
- Create offers
- Customize shop page sections
- View shop analytics

### 3. Customer (End User)

**Access:** Public shop page `/s/[slug]`

**Capabilities:**
- Browse menu without login
- Place orders (phone + name required)
- Track order status
- View order history

---

## 📁 Project Structure

```
marwahicloudkichen_update/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   ├── pages/         # All pages
│   │   │   ├── admin/     # Shop Admin dashboard
│   │   │   ├── super-admin/ # Super Admin dashboard
│   │   │   ├── shop/      # Public shop page
│   │   │   └── login/     # Authentication pages
│   │   └── App.tsx        # Main router
│   └── index.html
├── server/                 # Express Backend
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   ├── index.ts          # Server entry
│   ├── vite.ts           # Vite dev server
│   └── static.ts         # Production static files
├── migrations/           # Database migrations
├── shared/               # Shared code
│   └── schema.ts         # Database schema
├── uploads/              # User uploaded files
├── scripts/              # Build & utility scripts
├── setup.sh              # Main setup script
├── fix-server.sh         # Fix script
├── kill-all.sh           # Kill all services
├── package.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## 🗄️ Database Configuration

### Database Details

| Setting | Value |
|---------|-------|
| Database | hdos |
| User | swatiai11414 |
| Password | Swatiai@@@###2003 |
| Port | 5432 |
| Host | localhost |

### Environment Variables

```env
DATABASE_URL=postgresql://swatiai11414:Swatiai%40%40%40%23%23%232003@localhost:5432/hdos
SESSION_SECRET=0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0
SUPER_ADMIN_PASSWORD=Codex@2003
PORT=80
NODE_ENV=development
```

**Note:** Special characters in password must be URL-encoded:
- `@` → `%40`
- `#` → `%23`

---

## 🔗 Important URLs

| Page | URL |
|------|-----|
| Landing Page | http://13.50.247.62 |
| Super Admin Login | http://13.50.247.62/login/super-admin |
| Shop Admin Login | http://13.50.247.62/login/shop-admin |
| Health Check | http://13.50.247.62/api/health |
| API List | http://13.50.247.62/api/shops/list |

---

## 🔧 API Documentation

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/shops/list` | List all shops |
| GET | `/api/shops/:slug` | Get shop details |
| GET | `/api/shops/:slug/availability` | Get shop status |
| GET | `/api/shops/:slug/menu` | Get shop menu |
| POST | `/api/shops/:slug/orders` | Create order |
| GET | `/api/shops/:slug/my-orders` | Get customer orders |

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/super-admin/login` | Super admin login |
| POST | `/api/auth/shop-admin/login` | Shop admin login |
| POST | `/api/auth/logout` | Logout |

### Shop Admin Endpoints (Requires Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET/POST | `/api/admin/categories` | Menu categories |
| PUT/DELETE | `/api/admin/categories/:id` | Manage category |
| GET/POST | `/api/admin/items` | Menu items |
| PUT/DELETE | `/api/admin/items/:id` | Manage item |
| GET/PATCH | `/api/admin/orders` | Orders |
| GET | `/api/admin/customers` | Customer list |
| GET/POST | `/api/admin/offers` | Offers |
| GET/POST | `/api/admin/sections` | Page sections |

### Super Admin Endpoints (Requires Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/super-admin/dashboard` | Platform stats |
| GET/POST | `/api/super-admin/shops` | Manage all shops |
| GET/POST | `/api/super-admin/themes` | Manage themes |
| GET | `/api/super-admin/analytics/orders` | Order analytics |
| GET | `/api/super-admin/user-data` | Visitor analytics |

---

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# TypeScript check
npm run check

# Build for production
npm run build
```

### Database Migrations

```bash
# Push schema changes
npm run db:push

# Generate new migration
npm run db:generate
```

---

## 🔍 Troubleshooting

### Server Not Starting

```bash
# Check if port is in use
sudo lsof -i :80

# Kill process on port
sudo fuser -k 80/tcp

# Restart with logs
./setup.sh logs
```

### Database Connection Failed

```bash
# Check PostgreSQL status
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Test connection
PGPASSWORD=Swatiai@@@###2003 psql -U swatiai11414 -h localhost -d hdos
```

### API Returning HTML Instead of JSON

This is a known issue. Fix it with:

```bash
./fix-server.sh
```

### Blank Page on Browser

```bash
# Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

# Check if server is responding
curl http://13.50.247.62/api/health

# Check if API works
curl http://13.50.247.62/api/shops/list
```

### Reset Everything

```bash
# Kill all processes
./kill-all.sh

# Reset database (CAUTION: deletes all data)
sudo su - postgres -c "psql -c 'DROP DATABASE hdos;'"
sudo su - postgres -c "psql -c 'DROP USER swatiai11414;'"

# Re-setup
./setup.sh all
```

---

## 📝 Common Commands Quick Reference

```bash
# Setup
./setup.sh all              # Full setup + start
./setup.sh install          # Install dependencies
./setup.sh migrate          # Run migrations
./setup.sh start            # Start server
./setup.sh stop             # Stop server
./setup.sh restart          # Restart server
./setup.sh status           # Check status
./setup.sh logs             # View logs

# Fix
./fix-server.sh             # Fix & restart
./kill-all.sh               # Kill all services

# Git
git pull                    # Update code
git add . && git commit -m "message" && git push  # Commit & push
```

---

## 📞 Support

If you encounter any issues:

1. Check server logs: `./setup.sh logs`
2. Check API health: `curl http://YOUR_IP/api/health`
3. Run fix script: `./fix-server.sh`
4. Take screenshot of error and share

---

## 🔐 Security Notes

- **Super Admin Password:** `Codex@2003` (change in production)
- **Session Secret:** Change in `.env` for production
- **Database Password:** Change after initial setup
- **HTTPS:** Enable SSL certificate for production

---

**Built with ❤️ for Hotels and Restaurants**

