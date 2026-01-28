#!/usr/bin/env tsx
import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mealsplit',
}

interface Migration {
  filename: string
  appliedAt: Date | null
}

async function bootstrap() {
  console.log('🔧 MealSplit DB Bootstrap')
  console.log('========================\n')

  let conn: mysql.Connection | null = null

  try {
    // Connect to MySQL server (without selecting database)
    console.log(`📡 Connecting to MySQL at ${dbConfig.host}...`)
    conn = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
    })

    // Create database if not exists
    console.log(`📦 Ensuring database '${dbConfig.database}' exists...`)
    await conn.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`)
    await conn.query(`USE ${dbConfig.database}`)

    // Create migrations tracking table
    console.log('📋 Setting up migrations tracking...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filename (filename)
      )
    `)

    // Get already applied migrations
    const [appliedRows] = await conn.query<any[]>(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    )
    const appliedMigrations = new Set(
      appliedRows.map((row: any) => row.filename || row.FILENAME)
    )

    // Read migration files
    const migrationsDir = join(__dirname, '../drizzle')
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('setup_local'))
      .sort()

    console.log(`\n📂 Found ${files.length} migration files`)

    let appliedCount = 0
    let skippedCount = 0

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`  ⏭️  ${file} (already applied)`)
        skippedCount++
        continue
      }

      console.log(`  🔄 Applying ${file}...`)
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        try {
          await conn.query(statement)
        } catch (err: any) {
          // Ignore duplicate column/table errors (idempotent)
          if (
            err.code !== 'ER_DUP_FIELDNAME' &&
            err.code !== 'ER_TABLE_EXISTS_ERROR' &&
            !err.message.includes('Duplicate column')
          ) {
            throw err
          }
        }
      }

      // Record migration
      await conn.query(
        'INSERT INTO schema_migrations (filename) VALUES (?) ON DUPLICATE KEY UPDATE applied_at = applied_at',
        [file]
      )

      console.log(`  ✅ Applied ${file}`)
      appliedCount++
    }

    console.log(`\n✨ Bootstrap complete!`)
    console.log(`   Applied: ${appliedCount}`)
    console.log(`   Skipped: ${skippedCount}`)
    console.log(`   Total: ${files.length}`)

    if (appliedCount === 0 && skippedCount === files.length) {
      console.log('\n✅ Database is up to date!')
    }
  } catch (err: any) {
    console.error('\n❌ Bootstrap failed!')
    console.error(`   Error: ${err.message}`)
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL connection refused. Is MySQL running?')
      console.error('   - Start XAMPP/WAMP MySQL service')
      console.error('   - Or start standalone MySQL')
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Check your credentials in .env:')
      console.error(`   DB_HOST=${dbConfig.host}`)
      console.error(`   DB_USER=${dbConfig.user}`)
      console.error(`   DB_PASSWORD=***`)
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist and could not be created.')
      console.error('   Create it manually: CREATE DATABASE mealsplit;')
    }

    process.exit(1)
  } finally {
    if (conn) {
      await conn.end()
    }
  }
}

bootstrap()
