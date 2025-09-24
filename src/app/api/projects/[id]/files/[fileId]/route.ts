import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update file content
    const updatedFile = await prisma.projectFile.updateMany({
      where: {
        id: params.fileId,
        projectId: params.id,
      },
      data: {
        content,
        size: content.length,
        updatedAt: new Date(),
      },
    })

    if (updatedFile.count === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'FILE_UPDATED',
        details: `File ${params.fileId} was updated`,
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('File update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
