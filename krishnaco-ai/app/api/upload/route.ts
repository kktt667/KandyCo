import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${session.user.id}/${Date.now()}-${file.name}`

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }

    await s3Client.send(new PutObjectCommand(uploadParams))

    const attachment = await prisma.attachment.create({
      data: {
        filename: file.name,
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`,
        userId: session.user.id,
      },
    })

    // Delete oldest attachment if user has more than 10 attachments
    const attachmentsCount = await prisma.attachment.count({ where: { userId: session.user.id } })
    if (attachmentsCount > 10) {
      const oldestAttachment = await prisma.attachment.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (oldestAttachment) {
        await prisma.attachment.delete({ where: { id: oldestAttachment.id } })
        // TODO: Implement S3 file deletion here
      }
    }

    return NextResponse.json(attachment)
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}

