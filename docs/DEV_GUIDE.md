# Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- MySQL running (XAMPP, WAMP, or standalone)
- Git (optional, for cloning)

### First Time Setup

1. **Clone and Install**
```bash
cd e:\MealSplit
cd api && npm install && cd ..
cd web && npm install && cd ..
```

2. **Configure Environment**
Create `api/.env`:
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=7d
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mealsplit
```

3. **Start Development Servers**

The API now auto-bootstraps the database on first run!

```bash
# Terminal 1 - API Server (auto-creates DB + applies migrations)
cd e:\MealSplit\api
npm run dev

# Terminal 2 - Frontend Server
cd e:\MealSplit\web
npm run dev
```

The API will run on **http://localhost:3001**  
The frontend will run on **http://localhost:5173**

### What Happens on `npm run dev`

The API startup now:
1. Connects to MySQL
2. Creates database if missing
3. **Automatically applies all migrations** from `api/drizzle/*.sql`
4. Tracks applied migrations in `schema_migrations` table
5. Starts the server

**You don't need to manually import SQL files anymore!** 🎉

### Manual Database Bootstrap

If you want to manually bootstrap the DB without starting the server:

```bash
cd e:\MealSplit\api
npm run db:bootstrap
```

This is useful for:
- Resetting the database
- Applying new migrations
- Testing migration scripts

### Skip Auto-Bootstrap

If you want to start the server without running bootstrap (faster restarts during development):

```bash
cd e:\MealSplit\api
npm run dev:nocheck
```

## Fixing "Port Already in Use" (Windows)

If you see `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001`, a zombie Node.js process is still holding the port.

### Method 1: PowerShell (Recommended)

```powershell
# Find the process ID
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess

# Kill the process
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

### Method 2: Task Manager

1. Open **Task Manager** (Ctrl+Shift+Esc)
2. Go to **Details** tab
3. Find **node.exe** processes
4. Right-click → **End task** on Node.js processes related to MealSplit

### Method 3: Command Prompt

```cmd
# Find process using port 3001
netstat -ano | findstr :3001

# Kill by PID (replace 12345 with actual PID from above)
taskkill /PID 12345 /F
```

### Method 4: Kill All Node Processes (Nuclear Option)

**⚠️ WARNING: This will kill ALL Node.js processes on your system!**

```powershell
Get-Process node | Stop-Process -Force
```

## Better Dev Workflow (tsx)

The default dev script uses `tsx watch` which is faster and handles cleanup better than nodemon+ts-node.

If you have issues with tsx, you can use the old nodemon script:

```bash
npm run dev:nodemon
```

## Installing tsx (if not already installed)

```bash
cd e:\MealSplit\api
npm install tsx --save-dev
```

## Troubleshooting

### Database Schema Errors

If you see errors like:
- `"Failed to load profile"`
- `"Room is loading forever"`
- `500 Internal server error`

**Check the backend logs.** The startup now shows:

```
✅ Database schema is compatible
```

Or:

```
⚠️  WARNING: Database schema is incomplete!
   Missing: column:users.avatar_url, table:user_preferences
   
📋 Apply these migrations:
   - api/drizzle/0007_user_profiles.sql
   
💡 Auto-fix: Run "npm run db:bootstrap" in api folder
```

**Fix:** Run `npm run db:bootstrap` in the api folder.

### Health Check Endpoints

Test if your backend is healthy:

```bash
# Basic health
curl http://localhost:3001/health

# Database schema check
curl http://localhost:3001/health/db
```

The `/health/db` endpoint returns:
- **200** if schema is compatible
- **500** with detailed error if migrations are missing

### Frontend Shows "Backend Needs Migration"

The frontend now detects schema errors and shows:
- Clear error message
- Which migrations are needed  
- How to fix it (`npm run db:bootstrap`)

**No more silent failures or infinite loading!**

### Port 5173 (Frontend) Already in Use

Same steps as above, but use port 5173:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Database Connection Failed

1. Ensure XAMPP/MySQL is running
2. Check credentials in `api/.env`
3. The bootstrap script will create the database automatically
4. If manual creation needed: `CREATE DATABASE mealsplit;`

### "Cannot Connect to API" Error in Frontend

1. Check if API server is running on port 3001
2. Check `web/src/config.ts` has correct API_BASE_URL
3. Check CORS_ORIGIN in `api/.env` matches frontend URL

### TypeScript Compilation Errors

```bash
cd e:\MealSplit\api
npm run build
```

Check the output for specific errors.

### Frontend Build Errors

```bash
cd e:\MealSplit\web
npm run build
```

## Clean Restart

If everything is stuck, do a clean restart:

```powershell
# Kill all node processes
Get-Process node | Stop-Process -Force

# Wait 2 seconds
Start-Sleep -Seconds 2

# Restart API
cd e:\MealSplit\api
npm run dev

# In another terminal, restart frontend
cd e:\MealSplit\web
npm run dev
```

## Environment Variables

### API (.env)

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mealsplit
```

### Frontend (src/config.ts)

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
```

For custom API URL, create `web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```
