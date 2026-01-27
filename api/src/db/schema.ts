import {
  mysqlTable,
  int,
  varchar,
  timestamp,
} from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const rooms = mysqlTable('rooms', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  currency: varchar('currency', { length: 8 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const roomMembers = mysqlTable('room_memberships', {
  id: int('id').autoincrement().primaryKey(),
  roomId: int('room_id').notNull(),
  userId: int('user_id').notNull(),
  role: varchar('role', { length: 16 }).notNull(),
  status: varchar('status', { length: 16 }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
})
