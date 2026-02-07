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

## Prerequisites

Before you begin, ensure you have:

- Node.js >= 24.0.0
- PostgreSQL 16 or higher
- npm or yarn
- Git

## Installation Guide

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd marwahicloudkichan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install PostgreSQL (Linux/Ubuntu)

If PostgreSQL is not installed:

```bash
# Update package list
sudo apt update

# Install PostgreSQL and contrib package
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Verify PostgreSQL is running
sudo service postgresql status
```

### Quick Setup with setup.sh (Recommended)

We provide a comprehensive setup script that handles everything:

```bash
# Make the script executable
chmod +x setup.sh

# Run complete setup and start server
./setup.sh all

# Or run just the setup (without starting server)
./setup.sh quick

# Available commands:
./setup.sh help    # Show all available commands
./setup.sh install # Install PostgreSQL only
./setup.sh start-db # Start PostgreSQL service
./setup.sh setup-db # Create database and user
./setup.sh migrate # Run database migrations
./setup.sh dev     # Start development server
```

The setup script will:
1. Install PostgreSQL if not installed
2. Start PostgreSQL service
3. Create database and user
4. Configure environment variables
5. Install npm dependencies
6. Run database migrations
7. Start the development server

### 4. Configure Database

#### Access PostgreSQL as postgres user:

```bash
sudo -u postgres psql
```

#### Create database and user:

```sql
CREATE USER Swatiai11414 WITH PASSWORD 'Swatiai@@@###2003';
CREATE DATABASE hdos;
GRANT ALL PRIVILEGES ON DATABASE hdos TO Swatiai11414;
ALTER USER Swatiai11414 WITH SUPERUSER;
\q
```

#### Alternative (using su):

```bash
sudo su - postgres -c "psql -c \"CREATE USER Swatiai11414 WITH PASSWORD 'Swatiai@@@###2003';\""
sudo su - postgres -c "psql -c \"CREATE DATABASE hdos;\""
sudo su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE hdos TO Swatiai11414;\""
```

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://Swatiai11414:Swatiai%40%40%40%23%23%232003@localhost:5433/hdos

# Security Secrets
SESSION_SECRET=your-super-secret-key-at-least-32-chars
SUPER_ADMIN_PASSWORD=your-admin-password

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Important:** The password contains special characters (`@`, `#`) that must be URL-encoded:
- `@` → `%40`
- `#` → `%23`

**Note:** Default PostgreSQL port is 5432, but on some systems (like Codespaces) it may be 5433.

### 6. Run Database Migrations

```bash
# Apply all migrations
npm run db:push
```

Or manually apply migration files:

```bash
# Apply first migration
PGPASSWORD=Swatiai@@@###2003 psql -U Swatiai11414 -h localhost -p 5433 -d hdos -f migrations/0000_windy_doctor_doom.sql

# Apply second migration (if exists)
PGPASSWORD=Swatiai@@@###2003 psql -U Swatiai11414 -h localhost -p 5433 -d hdos -f migrations/0001_add_new_shop_columns.sql
```

### 7. Start the Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:5000**

## First User Setup

The first user to authenticate becomes a **Super Admin** if no shops exist. Subsequent users become **Shop Admins**.

### Super Admin Login
- Access: `/login`
- Default Super Admin password is set in `SUPER_ADMIN_PASSWORD` env variable

## Project Structure

```
hdos/
├── api/                 # API routes and utilities
├── attached_assets/     # Uploaded assets
├── client/             # React frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utilities (cart, queryClient)
│   │   ├── pages/      # Application pages
│   │   │   ├── admin/  # Shop admin dashboard
│   │   │   ├── super-admin/ # Super admin dashboard
│   │   │   ├── shop/   # Public shop page
│   │   │   └── login/  # Authentication pages
│   │   └── App.tsx     # Main router
├── migrations/         # Database migrations
├── script/            # Build scripts
├── server/            # Express backend
│   ├── db.ts          # Database connection
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Database operations
│   └── init-db.ts     # Database initialization
├── shared/            # Shared code
│   └── schema.ts      # Database schema & types
├── uploads/           # User uploads
├── .env               # Environment variables
├── package.json       # Dependencies
├── vite.config.ts     # Vite configuration
└── drizzle.config.ts  # Drizzle ORM configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate new migration |

## API Routes

### Public Routes
- `GET /api/shops/:slug` - Get shop data
- `POST /api/shops/:slug/orders` - Create order
- `GET /api/shops/:slug/my-orders` - Get customer's orders

### Shop Admin Routes (Requires Auth)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST/PATCH/DELETE /api/admin/categories` - Menu categories
- `GET/POST/PATCH/DELETE /api/admin/items` - Menu items
- `GET/PATCH /api/admin/orders` - Orders
- `GET /api/admin/customers` - Customer list
- `GET/POST/PATCH/DELETE /api/admin/offers` - Offers
- `GET/POST/PATCH/DELETE /api/admin/sections` - Page sections

### Super Admin Routes (Requires Auth)
- `GET /api/super-admin/dashboard` - Platform stats
- `GET/POST/PATCH/DELETE /api/super-admin/shops` - Shop management
- `GET/POST/PATCH/DELETE /api/super-admin/themes` - Theme management
- `GET /api/super-admin/analytics/orders` - Order analytics
- `GET /api/super-admin/user-data` - Visitor analytics

## Deployment Options

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Vercel

```bash
# Deploy to Vercel
vercel --prod
```

### Render

```bash
# Deploy using render.yaml
render-blueprints deploy
```

### VPS

```bash
# Build the application
npm run build

# Start production server
npm start
```

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Troubleshooting

### Database Connection Error

If you see `ECONNREFUSED`:

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL if not running
sudo service postgresql start

# Verify port
sudo cat /etc/postgresql/16/main/postgresql.conf | grep port
```

### Port Already in Use

If port 5000 is in use:

```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs kill -9

# Or change PORT in .env
PORT=5001
```

### Migration Errors

If you see migration errors like "relation already exists", it's normal - the tables are already created. The server will continue working.

```bash
# If you want to reset the database (CAUTION: deletes all data)
PGPASSWORD=Swatiai@@@###2003 psql -U Swatiai11414 -h localhost -p 5433 -d hdos -c "DROP TABLE IF EXISTS customer_sessions, user_behaviors, page_visits, customers, order_items, orders, offers, menu_items, menu_categories, shop_sections, profiles, shops, shop_themes, sessions, users CASCADE;"

# Re-run migrations
npm run db:push
```

### Special Characters in Password

If your password contains special characters like `@` or `#`, you must URL-encode them in DATABASE_URL:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `!` | `%21` |
| `# HDOS - Hotel Digital Operating System

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

## Prerequisites

Before you begin, ensure you have:

- Node.js >= 24.0.0
- PostgreSQL 16 or higher
- npm or yarn
- Git

## Installation Guide

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd marwahicloudkichan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install PostgreSQL (Linux/Ubuntu)

If PostgreSQL is not installed:

```bash
# Update package list
sudo apt update

# Install PostgreSQL and contrib package
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Verify PostgreSQL is running
sudo service postgresql status
```

### Quick Setup with setup.sh (Recommended)

We provide a comprehensive setup script that handles everything:

```bash
# Make the script executable
chmod +x setup.sh

# Run complete setup and start server
./setup.sh all

# Or run just the setup (without starting server)
./setup.sh quick

# Available commands:
./setup.sh help    # Show all available commands
./setup.sh install # Install PostgreSQL only
./setup.sh start-db # Start PostgreSQL service
./setup.sh setup-db # Create database and user
./setup.sh migrate # Run database migrations
./setup.sh dev     # Start development server
```

The setup script will:
1. Install PostgreSQL if not installed
2. Start PostgreSQL service
3. Create database and user
4. Configure environment variables
5. Install npm dependencies
6. Run database migrations
7. Start the development server

### 4. Configure Database

#### Access PostgreSQL as postgres user:

```bash
sudo -u postgres psql
```

#### Create database and user:

```sql
CREATE USER Swatiai11414 WITH PASSWORD 'Swatiai@@@###2003';
CREATE DATABASE hdos;
GRANT ALL PRIVILEGES ON DATABASE hdos TO Swatiai11414;
ALTER USER Swatiai11414 WITH SUPERUSER;
\q
```

#### Alternative (using su):

```bash
sudo su - postgres -c "psql -c \"CREATE USER Swatiai11414 WITH PASSWORD 'Swatiai@@@###2003';\""
sudo su - postgres -c "psql -c \"CREATE DATABASE hdos;\""
sudo su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE hdos TO Swatiai11414;\""
```

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your database credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://Swatiai11414:Swatiai%40%40%40%23%23%232003@localhost:5433/hdos

# Security Secrets
SESSION_SECRET=your-super-secret-key-at-least-32-chars
SUPER_ADMIN_PASSWORD=your-admin-password

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Important:** The password contains special characters (`@`, `#`) that must be URL-encoded:
- `@` → `%40`
- `#` → `%23`

**Note:** Default PostgreSQL port is 5432, but on some systems (like Codespaces) it may be 5433.

### 6. Run Database Migrations

```bash
# Apply all migrations
npm run db:push
```

Or manually apply migration files:

```bash
# Apply first migration
PGPASSWORD=Swatiai@@@###2003 psql -U Swatiai11414 -h localhost -p 5433 -d hdos -f migrations/0000_windy_doctor_doom.sql

# Apply second migration (if exists)
PGPASSWORD=Swatiai@@@###2003 psql -U Swatiai11414 -h localhost -p 5433 -d hdos -f migrations/0001_add_new_shop_columns.sql
```

### 7. Start the Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:5000**

## First User Setup

The first user to authenticate becomes a **Super Admin** if no shops exist. Subsequent users become **Shop Admins**.

### Super Admin Login
- Access: `/login`
- Default Super Admin password is set in `SUPER_ADMIN_PASSWORD` env variable

## Project Structure

```
hdos/
├── api/                 # API routes and utilities
├── attached_assets/     # Uploaded assets
├── client/             # React frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utilities (cart, queryClient)
│   │   ├── pages/      # Application pages
│   │   │   ├── admin/  # Shop admin dashboard
│   │   │   ├── super-admin/ # Super admin dashboard
│   │   │   ├── shop/   # Public shop page
│   │   │   └── login/  # Authentication pages
│   │   └── App.tsx     # Main router
├── migrations/         # Database migrations
├── script/            # Build scripts
├── server/            # Express backend
│   ├── db.ts          # Database connection
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Database operations
│   └── init-db.ts     # Database initialization
├── shared/            # Shared code
│   └── schema.ts      # Database schema & types
├── uploads/           # User uploads
├── .env               # Environment variables
├── package.json       # Dependencies
├── vite.config.ts     # Vite configuration
└── drizzle.config.ts  # Drizzle ORM configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate new migration |

## API Routes

### Public Routes
- `GET /api/shops/:slug` - Get shop data
- `POST /api/shops/:slug/orders` - Create order
- `GET /api/shops/:slug/my-orders` - Get customer's orders

### Shop Admin Routes (Requires Auth)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST/PATCH/DELETE /api/admin/categories` - Menu categories
- `GET/POST/PATCH/DELETE /api/admin/items` - Menu items
- `GET/PATCH /api/admin/orders` - Orders
- `GET /api/admin/customers` - Customer list
- `GET/POST/PATCH/DELETE /api/admin/offers` - Offers
- `GET/POST/PATCH/DELETE /api/admin/sections` - Page sections

### Super Admin Routes (Requires Auth)
- `GET /api/super-admin/dashboard` - Platform stats
- `GET/POST/PATCH/DELETE /api/super-admin/shops` - Shop management
- `GET/POST/PATCH/DELETE /api/super-admin/themes` - Theme management
- `GET /api/super-admin/analytics/orders` - Order analytics
- `GET /api/super-admin/user-data` - Visitor analytics

## Deployment Options

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Vercel

```bash
# Deploy to Vercel
vercel --prod
```

### Render

```bash
# Deploy using render.yaml
render-blueprints deploy
```

### VPS

```bash
# Build the application
npm run build

# Start production server
npm start
```

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions.

## Troubleshooting

### Database Connection Error

If you see `ECONNREFUSED`:

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL if not running
sudo service postgresql start

# Verify port
sudo cat /etc/postgresql/16/main/postgresql.conf | grep port
```

### Port Already in Use

If port 5000 is in use:

```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs kill -9

# Or change PORT in .env
PORT=5001
```

 | `%24` |

Example:
```env
# Password: Swatiai@@@###2003
DATABASE_URL=postgresql://Swatiai11414:Swatiai%40%40%40%23%23%232003@localhost:5433/hdos
```

### Default Environment Variables

If `.env` file is not found, the server will use default values (OK for development only):

- `SUPER_ADMIN_PASSWORD=Codex@2003`
- `SESSION_SECRET=dev-secret-change-in-production...`

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please create an issue in the repository.

---

Built with ❤️ for Hotels and Restaurants
