# Development Guide

## Quick Start

### Starting the Servers

```bash
# Terminal 1 - API Server
cd e:\MealSplit\api
npm run dev

# Terminal 2 - Frontend Server
cd e:\MealSplit\web
npm run dev
```

The API will run on **http://localhost:3001**  
The frontend will run on **http://localhost:5173**

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

### Port 5173 (Frontend) Already in Use

Same steps as above, but use port 5173:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

### Database Connection Failed

1. Ensure XAMPP/MySQL is running
2. Check credentials in `api/.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=mealsplit
   ```
3. Verify database exists: `CREATE DATABASE mealsplit;`
4. Import migrations in order (see docs/DB_SETUP.md)

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
