import {
  datetime,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  createdAt: datetime('created_at').defaultNow().notNull(),
  updatedAt: datetime('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const userPreferences = mysqlTable('user_preferences', {
  userId: varchar('user_id', { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  themeMode: mysqlEnum('theme_mode', ['light', 'dark', 'amoled'])
    .default('amoled')
    .notNull(),
  accentColor: varchar('accent_color', { length: 20 })
    .default('#00FFFF')
    .notNull(),
  updatedAt: datetime('updated_at').defaultNow().onUpdateNow().notNull(),
})
