import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { db } from '../db'
import { users, userPreferences } from '../db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../lib/password'

const signupSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
})

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
})

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
    }

    const { displayName, email, password } = parsed.data
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing.length > 0) {
      return reply.code(409).send({ message: 'Email already in use' })
    }

    const userId = randomUUID()
    const passwordHash = hashPassword(password)

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      displayName,
    })

    await db.insert(userPreferences).values({
      userId,
      themeMode: 'amoled',
      accentColor: '#00FFFF',
    })

    const token = app.jwt.sign({ sub: userId }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })

    return reply.send({
      token,
      user: {
        id: userId,
        email,
        displayName,
      },
    })
  })

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request', issues: parsed.error.flatten() })
    }

    const { email, password } = parsed.data
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    const user = result[0]
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({ message: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    })
  })
}
