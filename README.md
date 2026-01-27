# MealSplit

MealSplit is a shared room app for 2–4 roommates to track groceries, inventory, and meals while keeping cost splits simple and fair.

## Documentation
- [MealSplit_PRD.md](docs/MealSplit_PRD.md)
- [MealSplit_User_Stories.md](docs/MealSplit_User_Stories.md)

## Local Development

**Fixed URLs:**
- 🌐 Web: **http://localhost:5173** (fixed, strictPort)
- 🔌 API: **http://localhost:3001** (fixed)

### Prerequisites
- Node.js 18+ 
- MySQL 8+ (Install [XAMPP](https://www.apachefriends.org/), [WAMP](https://www.wampserver.com/), or [standalone MySQL](https://dev.mysql.com/downloads/installer/))

### Database Setup (First Time)
1. Start MySQL server
2. Create database:
   ```sql
   CREATE DATABASE mealsplit;
   ```
3. Import migrations in order (via MySQL Workbench, phpMyAdmin, or command line):
   - `api/drizzle/0001_init.sql`
   - `api/drizzle/0002_rooms.sql`
   - `api/drizzle/0003_purchases.sql`
   - `api/drizzle/0004_inventory.sql`

### API Setup
1. Copy `api/.env.example` to `api/.env` and configure:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mealsplit
   ```
2. From `/api`:
   ```
   npm install
   npm run dev
   ```
3. API will start at **http://localhost:3001**
4. Verify with: http://localhost:3001/health

### Web Setup
1. From `/web`:
   ```
   npm install
   npm run dev
   ```
2. Web will start at **http://localhost:5173** (will fail if port is in use)

### Troubleshooting
- **"Database connection failed"**: Ensure MySQL is running and credentials in `.env` are correct
- **"Port 5173 is in use"**: Kill the process using that port or change the port in `vite.config.ts`

### Database migrations
Drizzle SQL migrations are generated locally (api/drizzle) and applied manually via phpMyAdmin on cPanel (no SSH).
