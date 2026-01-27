import { drizzle } from 'drizzle-orm/mysql2'
import { pool } from './connection'

export const db = drizzle(pool)
