# Project Local Testing Guide

## ✅ Project Setup Status

### Completed Steps:
1. ✅ Dependencies installed successfully (633 packages)
2. ✅ `.env` file created with Supabase database connection
3. ✅ Project structure verified:
   - Full-stack TypeScript/React application
   - Express.js backend with PostgreSQL (Drizzle ORM)
   - React frontend with Vite
   - Admin panel functionality

## 🚀 How to Test Locally

### Option 1: Development Mode (Easiest for local testing)
```bash
cd /workspaces/liveordersystem
npm run dev
```
This will start the development server on `http://localhost:5000`

### Option 2: Production Build + Run
```bash
cd /workspaces/liveordersystem
npm run build
npm start
```

### Option 3: Docker Compose (Full Stack)
```bash
cd /workspaces/liveordersystem
docker-compose up
```
This starts both PostgreSQL and the application

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🗄️ Database

**Current Configuration:** Supabase PostgreSQL (already set up in .env)
- Host: db.xgpzcljnxuwpledrlcem.supabase.co
- Database: postgres
- User: postgres

**Credentials in .env:**
- SESSION_SECRET: Already configured
- SUPER_ADMIN_PASSWORD: Codex@2003

## 🔍 Key Project Features

1. **Live Order System** - Real-time order management
2. **Admin Panel** - Super admin access
3. **Authentication** - Passport.js integration
4. **Rate Limiting** - Security features
5. **WebSocket Support** - Real-time updates
6. **File Upload** - Multer integration
7. **API** - RESTful backend

## ⚠️ Notes

- Project requires Node.js >= 24.0.0
- Database is already provisioned (Supabase)
- Environment variables are configured
- TypeScript strict mode enabled

## 🧪 Testing the Application

Once the dev server is running, visit:
- Frontend: http://localhost:5000
- Admin Panel: http://localhost:5000/admin (if available)
- API endpoints: http://localhost:5000/api/*

## 📊 Project Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Radix UI
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Authentication:** Passport.js + Express Session
- **Real-time:** WebSockets
- **State Management:** React Query (TanStack Query)
- **Form Handling:** React Hook Form
