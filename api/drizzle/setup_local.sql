-- MealSplit Database Setup Script
-- Run this file to create the database and all tables
-- Usage: mysql -u root -p < api/drizzle/setup_local.sql

-- Create database
CREATE DATABASE IF NOT EXISTS mealsplit;
USE mealsplit;

-- Show progress
SELECT 'Setting up MealSplit database...' AS status;

-- Import migrations in order
SOURCE 0001_init.sql;
SELECT '✓ Migration 0001_init.sql applied' AS status;

SOURCE 0002_rooms.sql;
SELECT '✓ Migration 0002_rooms.sql applied' AS status;

SOURCE 0003_purchases.sql;
SELECT '✓ Migration 0003_purchases.sql applied' AS status;

SOURCE 0004_inventory.sql;
SELECT '✓ Migration 0004_inventory.sql applied' AS status;

-- Verify tables
SELECT 'Database setup complete! Tables created:' AS status;
SHOW TABLES;
