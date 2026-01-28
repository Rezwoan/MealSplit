# Database Setup (cPanel + phpMyAdmin)

## 1) Create database + user (cPanel)
1. Open cPanel → **MySQL Databases**.
2. Create a new database (e.g., `mealsplit`).
3. Create a new database user and set a strong password.
4. Add the user to the database with **All Privileges**.

## 2) Import schema (phpMyAdmin)
1. Open **phpMyAdmin** from cPanel.
2. Select your database from the left sidebar.
3. Go to **Import**.
4. Import [api/drizzle/0001_init.sql](../api/drizzle/0001_init.sql).
5. Import [api/drizzle/0002_rooms.sql](../api/drizzle/0002_rooms.sql).
6. Import [api/drizzle/0003_purchases.sql](../api/drizzle/0003_purchases.sql).
7. Import [api/drizzle/0004_inventory.sql](../api/drizzle/0004_inventory.sql).
8. Import [api/drizzle/0005_receipts.sql](../api/drizzle/0005_receipts.sql).
9. Click **Go** to import each file in order.

## 3) Configure API environment
Create `api/.env` and set:
```
PORT=3001
CORS_ORIGIN=https://app.yourdomain.com
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

> Note: On cPanel, use the DB host shown in cPanel (often `localhost`).
