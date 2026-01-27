# Quick Setup Guide - Local Development

## Option 1: Using XAMPP (Recommended for Windows)

1. **Download & Install XAMPP**
   - Download from https://www.apachefriends.org/
   - Install with MySQL component selected
   - Start MySQL from XAMPP Control Panel

2. **Setup Database**
   - Open http://localhost/phpmyadmin
   - Click "SQL" tab
   - Copy/paste content from `api/drizzle/0001_init.sql` and execute
   - Repeat for `0002_rooms.sql`, `0003_purchases.sql`, `0004_inventory.sql`
   
   OR use command line:
   ```bash
   cd api/drizzle
   mysql -u root < setup_local.sql
   ```

3. **Configure API**
   - Edit `api/.env`:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=mealsplit
     ```

4. **Start Servers**
   ```bash
   # Terminal 1 - API
   cd api
   npm install
   npm run dev
   
   # Terminal 2 - Web
   cd web
   npm install
   npm run dev
   ```

5. **Test**
   - API: http://localhost:3001
   - Web: http://localhost:5173
   - Try signing up a new account!

## Option 2: Using Docker (Cross-platform)

```bash
# Start MySQL in Docker
docker run --name mealsplit-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=mealsplit -p 3306:3306 -d mysql:8

# Wait 10 seconds for MySQL to start, then import migrations
docker exec -i mealsplit-mysql mysql -uroot -proot mealsplit < api/drizzle/0001_init.sql
docker exec -i mealsplit-mysql mysql -uroot -proot mealsplit < api/drizzle/0002_rooms.sql
docker exec -i mealsplit-mysql mysql -uroot -proot mealsplit < api/drizzle/0003_purchases.sql
docker exec -i mealsplit-mysql mysql -uroot -proot mealsplit < api/drizzle/0004_inventory.sql

# Update api/.env with:
DB_PASSWORD=root
```

## Troubleshooting

**"Database connection failed"**
- Ensure MySQL is running (check XAMPP Control Panel or `docker ps`)
- Verify credentials in `api/.env`
- Check if database exists: `mysql -u root -e "SHOW DATABASES;"`

**"Table doesn't exist"**
- Run migrations in correct order (0001 -> 0002 -> 0003 -> 0004)
- Verify tables: `mysql -u root mealsplit -e "SHOW TABLES;"`

**"Port already in use"**
- API: Kill process on port 3001
- Web: Kill process on port 5173

## First Test Account

Once everything is running, create your first account:
1. Go to http://localhost:5173/signup
2. Fill in:
   - Display name: Your Name
   - Email: test@example.com
   - Password: password123
3. Click "Create account"
4. You should be redirected to /rooms

You're now ready to use MealSplit locally!
