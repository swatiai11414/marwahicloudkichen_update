# Live Order System - Local Development Setup Guide

## Prerequisites
- Node.js 24.0.0 or higher
- Docker and Docker Compose

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start PostgreSQL Database
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Verify the database is running:
```bash
docker ps | grep liveorder-db
```

### 3. Initialize Database Schema
```bash
npm run db:push
```

This will create all required database tables based on the schema.

### 4. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### 5. Run on Port 80 (Production Mode)
For production-like testing or when you need to access the app on port 80:

```bash
# Make the script executable (first time only)
chmod +x run-port-80.sh

# Run on port 80 (automatically uses sudo for privileged port)
./run-port-80.sh
```

**Note**: This script builds the project in production mode and runs on port 80. The app will be accessible at `http://localhost` (no port needed). Database migrations are skipped in production mode to avoid conflicts with existing tables.

---

## Database Management

### Database Credentials
- **Host**: localhost
- **Port**: 5432
- **Username**: hdos
- **Password**: hdos_password
- **Database**: hdos

### Useful Commands

#### View Database Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f db
```

#### Access PostgreSQL CLI
```bash
docker exec -it liveorder-db psql -U hdos -d hdos
```

#### Stop Database
```bash
docker-compose -f docker-compose.dev.yml down
```

#### Stop Database and Remove Data
```bash
docker-compose -f docker-compose.dev.yml down -v
```

#### Restart Database
```bash
docker-compose -f docker-compose.dev.yml restart db
```

---

## Troubleshooting

### Database Connection Error
If you get a "Cannot connect to database" error:
1. Make sure Docker is running: `docker ps`
2. Make sure the database container is running: `docker ps | grep liveorder-db`
3. If not running, start it: `docker-compose -f docker-compose.dev.yml up -d`

### "Tables don't exist" Error
If you get errors about missing tables:
```bash
npm run db:push
```

### Database is Locked
If you get database lock errors:
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
npm run db:push
```

### Port Already in Use
If port 5432 is already in use, edit `docker-compose.dev.yml` and change:
```yaml
ports:
  - "5432:5432"
```
to a different port like:
```yaml
ports:
  - "5433:5432"
```

Then update `.env` to use the new port:
```
DATABASE_URL=postgresql://hdos:hdos_password@localhost:5433/hdos
```

---

## Application URLs

- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health
- **Super Admin Login**: http://localhost:5000/login/super-admin
- **Shop Admin Login**: http://localhost:5000/login/shop-admin

### Default Credentials
- **Super Admin Password**: `Codex@2003`

---

## Development Scripts

```bash
# Start development server
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Run production build
npm start

# Push database schema changes
npm run db:push
```

---

## Environment Variables (.env)

The `.env` file is already configured for local development:
```
DATABASE_URL=postgresql://hdos:hdos_password@localhost:5432/hdos
SESSION_SECRET=0d30d9ade1002580c7b3d528963206b9f8292d4c3bc33a63083c738b4c2a54b0
SUPER_ADMIN_PASSWORD=Codex@2003
PORT=5000
NODE_ENV=development
```

---

## Project Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Session Store**: PostgreSQL (connect-pg-simple)
- **Authentication**: Passport.js + Express Session
- **Real-time**: WebSockets
- **State Management**: React Query (TanStack Query)

