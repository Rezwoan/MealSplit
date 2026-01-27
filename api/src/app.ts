import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { registerHealthRoutes } from './routes/health'

export function buildApp() {
  const app = fastify({ logger: true })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })

  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
  })

  app.register(multipart)

  app.register(registerHealthRoutes)

  return app
}
