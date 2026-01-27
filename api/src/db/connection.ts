import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mealsplit',
  connectionLimit: 10,
}

export const pool = mysql.createPool(dbConfig)

// Test connection and provide helpful error message
pool.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully')
    conn.release()
  })
  .catch(err => {
    console.error('❌ Database connection failed!')
    console.error(`   Host: ${dbConfig.host}`)
    console.error(`   Database: ${dbConfig.database}`)
    console.error(`   User: ${dbConfig.user}`)
    console.error(`   Error: ${err.message}`)
    console.error('')
    console.error('📋 Setup instructions:')
    console.error('   1. Install MySQL (XAMPP, WAMP, or standalone)')
    console.error('   2. Create database: CREATE DATABASE mealsplit;')
    console.error('   3. Import migrations from api/drizzle/ folder in order:')
    console.error('      - 0001_init.sql')
    console.error('      - 0002_rooms.sql')
    console.error('      - 0003_purchases.sql')
    console.error('      - 0004_inventory.sql')
    console.error('   4. Update api/.env with your MySQL credentials')
  })

