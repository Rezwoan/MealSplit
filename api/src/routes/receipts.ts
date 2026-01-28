import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { randomUUID } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { purchases, purchaseReceipts, roomMemberships } from '../db/schema'
import { promises as fs } from 'node:fs'
import path from 'node:path'

interface ReceiptParams {
  roomId: string
  purchaseId: string
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Safe mime-to-extension mapping (never trust user-supplied extensions)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create upload directory:', err)
  }
}

function getReceiptUrl(roomId: string, purchaseId: string): string {
  return `/rooms/${roomId}/purchases/${purchaseId}/receipt/file`
}

export async function registerReceiptRoutes(app: FastifyInstance) {
  await ensureUploadDir()

  // Upload receipt for purchase
  app.post<{ Params: ReceiptParams }>(
    '/rooms/:roomId/purchases/:purchaseId/receipt',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { roomId, purchaseId } = request.params
      const userId = request.user.sub

      // Verify purchase exists and belongs to room
      const [purchase] = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, purchaseId), eq(purchases.roomId, roomId)))
        .limit(1)

      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' })
      }

      // Verify user is room member
      const [membership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId),
            eq(roomMemberships.status, 'active'),
          ),
        )
        .limit(1)

      if (!membership) {
        return reply.code(403).send({ message: 'Not a member of this room' })
      }

      // Get file from multipart
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ message: 'No file provided' })
      }

      const file: MultipartFile = data

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.code(400).send({ 
          message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
        })
      }

      // Read file buffer to check size
      const buffer = await file.toBuffer()
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.code(400).send({ 
          message: 'File too large. Maximum size is 5MB.' 
        })
      }

      // Check if receipt already exists for this purchase
      const [existingReceipt] = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseId, purchaseId))
        .limit(1)

      // Delete old file if replacing
      if (existingReceipt) {
        try {
          const oldFilePath = path.join(process.cwd(), existingReceipt.filePath)
          await fs.unlink(oldFilePath)
        } catch (err) {
          console.warn('Failed to delete old receipt file:', err)
        }
      }

      // Generate safe filename using mime type (never trust user extension)
      const ext = MIME_TO_EXT[file.mimetype] || 'jpg'
      const randomSuffix = randomUUID().slice(0, 8) // Add randomness for security
      const timestamp = Date.now()
      const filename = `receipt_${purchaseId}_${timestamp}_${randomSuffix}.${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      const relativeFilePath = `uploads/receipts/${filename}`

      // Save file
      await fs.writeFile(filePath, buffer)

      // Upsert receipt record
      const receiptId = existingReceipt?.id || randomUUID()
      
      if (existingReceipt) {
        await db
          .update(purchaseReceipts)
          .set({
            filePath: relativeFilePath,
            originalFilename: file.filename,
            mimeType: file.mimetype,
            fileSizeBytes: buffer.length,
            uploadedByUserId: userId,
          })
          .where(eq(purchaseReceipts.id, receiptId))
      } else {
        await db.insert(purchaseReceipts).values({
          id: receiptId,
          purchaseId,
          filePath: relativeFilePath,
          originalFilename: file.filename,
          mimeType: file.mimetype,
          fileSizeBytes: buffer.length,
          uploadedByUserId: userId,
        })
      }

      return reply.send({
        message: 'Receipt uploaded successfully',
        receipt: {
          id: receiptId,
          purchaseId,
          url: getReceiptUrl(roomId, purchaseId),
          originalFilename: file.filename,
          mimeType: file.mimetype,
          fileSizeBytes: buffer.length,
          createdAt: new Date().toISOString(),
        },
      })
    },
  )

  // Get receipt metadata
  app.get<{ Params: ReceiptParams }>(
    '/rooms/:roomId/purchases/:purchaseId/receipt',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { roomId, purchaseId } = request.params
      const userId = request.user.sub

      // Verify purchase exists and belongs to room
      const [purchase] = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, purchaseId), eq(purchases.roomId, roomId)))
        .limit(1)

      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' })
      }

      // Verify user is room member
      const [membership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId),
            eq(roomMemberships.status, 'active'),
          ),
        )
        .limit(1)

      if (!membership) {
        return reply.code(403).send({ message: 'Not a member of this room' })
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseId, purchaseId))
        .limit(1)

      if (!receipt) {
        return reply.code(404).send({ message: 'No receipt found for this purchase' })
      }

      return reply.send({
        receipt: {
          id: receipt.id,
          purchaseId: receipt.purchaseId,
          url: getReceiptUrl(roomId, purchaseId),
          originalFilename: receipt.originalFilename,
          mimeType: receipt.mimeType,
          fileSizeBytes: receipt.fileSizeBytes,
          createdAt: receipt.createdAt,
        },
      })
    },
  )

  // Delete receipt
  app.delete<{ Params: ReceiptParams }>(
    '/rooms/:roomId/purchases/:purchaseId/receipt',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { roomId, purchaseId } = request.params
      const userId = request.user.sub

      // Verify purchase exists and belongs to room
      const [purchase] = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, purchaseId), eq(purchases.roomId, roomId)))
        .limit(1)

      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' })
      }

      // Verify user is room member (admin or owner)
      const [membership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId),
            eq(roomMemberships.status, 'active'),
          ),
        )
        .limit(1)

      if (!membership) {
        return reply.code(403).send({ message: 'Not a member of this room' })
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseId, purchaseId))
        .limit(1)

      if (!receipt) {
        return reply.code(404).send({ message: 'No receipt found for this purchase' })
      }

      // Delete file
      try {
        const filePath = path.join(process.cwd(), receipt.filePath)
        await fs.unlink(filePath)
      } catch (err) {
        console.warn('Failed to delete receipt file:', err)
      }

      // Delete record
      await db.delete(purchaseReceipts).where(eq(purchaseReceipts.id, receipt.id))

      return reply.send({ message: 'Receipt deleted successfully' })
    },
  )

  // Stream receipt file with authentication (SECURE)
  app.get<{ Params: ReceiptParams }>(
    '/rooms/:roomId/purchases/:purchaseId/receipt/file',
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const { roomId, purchaseId } = request.params
      const userId = request.user.sub

      // Verify purchase exists and belongs to room
      const [purchase] = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.id, purchaseId), eq(purchases.roomId, roomId)))
        .limit(1)

      if (!purchase) {
        return reply.code(404).send({ message: 'Purchase not found' })
      }

      // Verify user is room member with active status
      const [membership] = await db
        .select()
        .from(roomMemberships)
        .where(
          and(
            eq(roomMemberships.roomId, roomId),
            eq(roomMemberships.userId, userId),
            eq(roomMemberships.status, 'active'),
          ),
        )
        .limit(1)

      if (!membership) {
        return reply.code(403).send({ message: 'Not a member of this room' })
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(purchaseReceipts)
        .where(eq(purchaseReceipts.purchaseId, purchaseId))
        .limit(1)

      if (!receipt) {
        return reply.code(404).send({ message: 'No receipt found for this purchase' })
      }

      // Stream file with proper content type
      const filePath = path.join(process.cwd(), receipt.filePath)
      
      try {
        const fileStream = await fs.readFile(filePath)
        reply.type(receipt.mimeType)
        reply.header('Content-Disposition', `inline; filename="${receipt.originalFilename}"`)
        return reply.send(fileStream)
      } catch (err) {
        console.error('Failed to read receipt file:', err)
        return reply.code(404).send({ message: 'Receipt file not found' })
      }
    },
  )
}
