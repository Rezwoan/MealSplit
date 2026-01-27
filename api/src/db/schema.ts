import {
  date,
  datetime,
  int,
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

export const purchases = mysqlTable('purchases', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  payerUserId: varchar('payer_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  totalAmountCents: int('total_amount_cents').notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  notes: varchar('notes', { length: 500 }),
  category: varchar('category', { length: 50 }),
  purchasedAt: datetime('purchased_at').notNull(),
  createdAt: datetime('created_at').defaultNow().notNull(),
})

export const purchaseSplits = mysqlTable(
  'purchase_splits',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    purchaseId: varchar('purchase_id', { length: 36 })
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shareAmountCents: int('share_amount_cents').notNull(),
    createdAt: datetime('created_at').defaultNow().notNull(),
  },
  (table) => ({
    purchaseUserUnique: uniqueIndex('purchase_splits_purchase_user_unique').on(
      table.purchaseId,
      table.userId,
    ),
  }),
)

export const memberBreakPeriods = mysqlTable('member_break_periods', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  mode: mysqlEnum('mode', ['exclude']).default('exclude').notNull(),
  createdAt: datetime('created_at').defaultNow().notNull(),
})

export const settlements = mysqlTable('settlements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  payerUserId: varchar('payer_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  receiverUserId: varchar('receiver_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  amountCents: int('amount_cents').notNull(),
  settledAt: datetime('settled_at').notNull(),
  createdAt: datetime('created_at').defaultNow().notNull(),
})
