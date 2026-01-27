import { sql } from 'drizzle-orm'
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
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
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
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const rooms = mysqlTable('rooms', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  ownerUserId: varchar('owner_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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
    createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  mode: mysqlEnum('mode', ['exclude']).default('exclude').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
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
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const inventoryItems = mysqlTable('inventory_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  trackingMode: mysqlEnum('tracking_mode', ['quantity', 'servings']).notNull(),
  unit: varchar('unit', { length: 20 }),
  lowStockThreshold: int('low_stock_threshold'),
  expiryDate: date('expiry_date', { mode: 'string' }),
  createdByUserId: varchar('created_by_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
})

export const inventoryMovements = mysqlTable('inventory_movements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  roomId: varchar('room_id', { length: 36 })
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 36 })
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['in', 'out']).notNull(),
  reason: mysqlEnum('reason', [
    'purchase',
    'replenish',
    'eat',
    'waste',
    'expired',
  ]).notNull(),
  amount: int('amount').notNull(),
  note: varchar('note', { length: 300 }),
  createdByUserId: varchar('created_by_user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
