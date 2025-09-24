import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const prompts = await prisma.aIPrompt.findMany({
      orderBy: { updatedAt: 'desc' }
    })

    await logger.info('Admin fetched AI prompts', {
      userId: session.user.id,
      promptCount: prompts.length
    })

    return NextResponse.json({
      success: true,
      prompts
    })

  } catch (error) {
    await logger.error('Error fetching AI prompts', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch AI prompts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, provider, type, title, description, systemPrompt } = body

    if (!name || !provider || !type || !title || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const prompt = await prisma.aIPrompt.create({
      data: {
        name,
        provider,
        type,
        title,
        description,
        systemPrompt,
        createdBy: session.user.id
      }
    })

    await logger.info('Admin created new AI prompt', {
      userId: session.user.id,
      promptId: prompt.id,
      promptName: prompt.name
    })

    return NextResponse.json({
      success: true,
      prompt
    })

  } catch (error) {
    await logger.error('Error creating AI prompt', error as Error)
    return NextResponse.json(
      { error: 'Failed to create AI prompt' },
      { status: 500 }
    )
  }
}
