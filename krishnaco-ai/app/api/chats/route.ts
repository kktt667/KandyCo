import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const chats = await prisma.chat.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json({ error: 'Error fetching chats' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const newChat = await prisma.chat.create({
      data: {
        name: 'New Chat',
        userId: session.user.id,
        model: 'gpt-3.5-turbo',
      },
    })

    // Delete oldest chat if user has more than 30 chats
    const chatsCount = await prisma.chat.count({ where: { userId: session.user.id } })
    if (chatsCount > 30) {
      const oldestChat = await prisma.chat.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (oldestChat) {
        await prisma.chat.delete({ where: { id: oldestChat.id } })
      }
    }

    return NextResponse.json(newChat)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json({ error: 'Error creating chat' }, { status: 500 })
  }
}

