import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, provider, type, title, description, systemPrompt, isActive } = body

    const prompt = await prisma.aIPrompt.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(provider && { provider }),
        ...(type && { type }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(systemPrompt && { systemPrompt }),
        ...(isActive !== undefined && { isActive }),
        version: { increment: 1 }
      }
    })

    await logger.info('Admin updated AI prompt', {
      userId: session.user.id,
      promptId: prompt.id,
      promptName: prompt.name
    })

    return NextResponse.json({
      success: true,
      prompt
    })

  } catch (error) {
    await logger.error('Error updating AI prompt', error as Error)
    return NextResponse.json(
      { error: 'Failed to update AI prompt' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { isActive } = body

    const prompt = await prisma.aIPrompt.update({
      where: { id: params.id },
      data: { isActive }
    })

    await logger.info('Admin toggled AI prompt status', {
      userId: session.user.id,
      promptId: prompt.id,
      isActive: prompt.isActive
    })

    return NextResponse.json({
      success: true,
      prompt
    })

  } catch (error) {
    await logger.error('Error updating AI prompt status', error as Error)
    return NextResponse.json(
      { error: 'Failed to update AI prompt status' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await prisma.aIPrompt.delete({
      where: { id: params.id }
    })

    await logger.info('Admin deleted AI prompt', {
      userId: session.user.id,
      promptId: params.id
    })

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully'
    })

  } catch (error) {
    await logger.error('Error deleting AI prompt', error as Error)
    return NextResponse.json(
      { error: 'Failed to delete AI prompt' },
      { status: 500 }
    )
  }
}
