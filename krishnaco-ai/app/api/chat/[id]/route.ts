import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { RedPillAPI } from '@/lib/redpill-api'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const prisma = new PrismaClient()
const redPillAPI = new RedPillAPI(process.env.REDPILL_API_KEY)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const messages = await prisma.message.findMany({
      where: { chatId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Error fetching messages' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message, model, attachmentIds } = await req.json()

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: params.id, userId: session.user.id },
      include: { messages: true },
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        chatId: chat.id,
      },
    })

    // Handle file attachments
    const files = []
    if (attachmentIds && attachmentIds.length > 0) {
      for (const attachmentId of attachmentIds) {
        const attachment = await prisma.attachment.findUnique({
          where: { id: attachmentId, userId: session.user.id },
        })
        if (attachment) {
          const getObjectParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: attachment.url.split('/').pop(),
          }
          const { Body } = await s3Client.send(new GetObjectCommand(getObjectParams))
          const fileContent = await Body.transformToByteArray()
          files.push(new File([fileContent], attachment.filename, { type: 'application/octet-stream' }))
        }
      }
    }

    // Get AI response
    const aiResponse = await redPillAPI.getCompletion(model, [
      ...chat.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ], files)

    // Save AI response
    const savedAiMessage = await prisma.message.create({
      data: {
        content: aiResponse.content,
        role: 'assistant',
        chatId: chat.id,
      },
    })

    // Update chat name if it's the first message
    if (chat.messages.length === 0) {
      await prisma.chat.update({
        where: { id: chat.id },
        data: { name: aiResponse.content.slice(0, 30) + '...' },
      })
    }

    return NextResponse.json(savedAiMessage)
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json({ error: 'Error processing message' }, { status: 500 })
  }
}

