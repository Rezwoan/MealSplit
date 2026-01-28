// DB Schema validation and compatibility checker
import { pool } from '../db/connection'

export interface SchemaCheck {
  ok: boolean
  missing: string[]
  migrationHints: string[]
}

const REQUIRED_TABLES = [
  'users',
  'user_preferences',
  'rooms',
  'room_memberships',
  'room_invites',
  'purchases',
  'purchase_splits',
  'settlements',
  'member_break_periods',
  'inventory_items',
]

const REQUIRED_COLUMNS = {
  users: ['id', 'email', 'password_hash', 'display_name', 'created_at', 'updated_at'],
  user_preferences: ['user_id', 'theme_mode', 'accent_color', 'updated_at'],
  room_memberships: ['id', 'room_id', 'user_id', 'role', 'status', 'inviter_confirmed', 'invitee_confirmed'],
  rooms: ['id', 'name', 'currency', 'owner_user_id', 'created_at'],
}

const MIGRATION_MAP: Record<string, string> = {
  'users.avatar_url': '0007_user_profiles.sql',
  'users.bio': '0007_user_profiles.sql',
  'user_preferences': '0007_user_profiles.sql',
  'user_preferences.theme_mode': '0007_user_profiles.sql',
  'user_preferences.accent_hue': '0007_user_profiles.sql',
  'room_memberships.role': '0008_room_settings.sql',
  'purchase_split_inputs': '0006_smart_splits.sql',
  'member_break_periods': '0004_inventory.sql',
  'purchase_receipts': '0005_receipts.sql',
  'inventory_items': '0004_inventory.sql',
  'purchases': '0003_purchases.sql',
  'rooms': '0002_rooms.sql',
  'users': '0001_init.sql',
}

export async function checkSchema(): Promise<SchemaCheck> {
  const missing: string[] = []
  const hints = new Set<string>()

  try {
    const conn = await pool.getConnection()
    
    try {
      // Check tables exist
      const [tables] = await conn.query<any[]>(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()'
      )
      const existingTables = new Set(tables.map((row: any) => row.table_name || row.TABLE_NAME))

      for (const table of REQUIRED_TABLES) {
        if (!existingTables.has(table)) {
          missing.push(`table:${table}`)
          const hint = MIGRATION_MAP[table]
          if (hint) hints.add(hint)
        }
      }

      // Check required columns
      for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
        if (!existingTables.has(table)) continue

        const [cols] = await conn.query<any[]>(
          'SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?',
          [table]
        )
        const existingColumns = new Set(cols.map((row: any) => row.column_name || row.COLUMN_NAME))

        for (const col of columns) {
          if (!existingColumns.has(col)) {
            missing.push(`column:${table}.${col}`)
            const hint = MIGRATION_MAP[`${table}.${col}`]
            if (hint) hints.add(hint)
          }
        }
      }
    } finally {
      conn.release()
    }

    return {
      ok: missing.length === 0,
      missing,
      migrationHints: Array.from(hints).sort(),
    }
  } catch (err: any) {
    console.error('Schema check failed:', err.message)
    throw err
  }
}

export async function ensureUserPreferences(userId: string): Promise<void> {
  try {
    const conn = await pool.getConnection()
    try {
      await conn.query(
        'INSERT IGNORE INTO user_preferences (user_id, theme_mode, accent_color, updated_at) VALUES (?, ?, ?, NOW())',
        [userId, 'dark', '#3B82F6']
      )
    } finally {
      conn.release()
    }
  } catch (err: any) {
    console.error('Failed to ensure user preferences:', err.message)
    // Don't throw - this is a fallback
  }
}
