import 'dotenv/config'
import { buildApp } from './app'
import { checkSchema } from './db/schema-check'

// Add handlers for uncaught errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason)
  process.exit(1)
})

async function start() {
  const app = buildApp()

  // Check schema compatibility on startup
  console.log('🔍 Checking database schema...')
  try {
    const schemaCheck = await checkSchema()
    if (!schemaCheck.ok) {
      console.error('\n⚠️  WARNING: Database schema is incomplete!')
      console.error('   Missing:', schemaCheck.missing.join(', '))
      if (schemaCheck.migrationHints.length > 0) {
        console.error('\n📋 Apply these migrations:')
        schemaCheck.migrationHints.forEach(hint => {
          console.error(`   - api/drizzle/${hint}`)
        })
      }
      console.error('\n💡 Auto-fix: Run "npm run db:bootstrap" in api folder')
      console.error('   Or manually import SQL files from api/drizzle/ in order\n')
    } else {
      console.log('✅ Database schema is compatible\n')
    }
  } catch (err: any) {
    console.error('❌ Schema check failed:', err.message)
    console.error('   API will start but may encounter errors\n')
  }

  const port = Number(process.env.PORT ?? 3001)
  const host = '0.0.0.0'

  app
    .listen({ port, host })
    .then(() => {
      app.log.info(`MealSplit API listening on http://${host}:${port}`)
    })
    .catch((err) => {
      app.log.error(err)
      process.exit(1)
    })
}

start()
