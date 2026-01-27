import {
  datetime,
  mysqlEnum,
  mysqlTable,
  tinyint,
  uniqueIndex,
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

export const rooms = mysqlTable('rooms', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  ownerUserId: varchar('owner_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: datetime('created_at').defaultNow().notNull(),
})

export const roomMemberships = mysqlTable(
  'room_memberships',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    roomId: varchar('room_id', { length: 36 })
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: mysqlEnum('role', ['owner', 'admin', 'member'])
      .default('member')
      .notNull(),
    status: mysqlEnum('status', ['pending', 'active', 'rejected', 'left'])
      .default('pending')
      .notNull(),
    inviterConfirmed: tinyint('inviter_confirmed').default(0).notNull(),
    inviteeConfirmed: tinyint('invitee_confirmed').default(0).notNull(),
    joinedAt: datetime('joined_at'),
    leftAt: datetime('left_at'),
  },
  (table) => ({
    roomUserUnique: uniqueIndex('room_memberships_room_user_unique').on(
      table.roomId,
      table.userId,
    ),
  }),
)

export const roomInvites = mysqlTable('room_invites', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 32 }).notNull().unique(),
  inviterUserId: varchar('inviter_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  inviteeEmail: varchar('invitee_email', { length: 255 }),
  status: mysqlEnum('status', ['active', 'revoked', 'expired', 'accepted'])
    .default('active')
    .notNull(),
  expiresAt: datetime('expires_at'),
  createdAt: datetime('created_at').defaultNow().notNull(),
})
