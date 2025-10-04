import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    // Use session user ID if available, otherwise use the test user ID
    let userId = session?.user?.id
    
    if (!userId) {
      // Use the test user ID for unauthenticated requests
      // Find the first active admin user for unauthenticated requests
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          isActive: true
        },
        select: { id: true, email: true }
      })
      
      if (adminUser) {
        userId = adminUser.id
      } else {
        // Fallback to first active user if no admin found
        const fallbackUser = await prisma.user.findFirst({
          where: { isActive: true },
          select: { id: true, email: true }
        })
        
        if (fallbackUser) {
          userId = fallbackUser.id
        } else {
          throw new Error('No active users found in database')
        }
      }
    }

    // Get project with files and history
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: userId
      },
      include: {
        files: true,
        history: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await logger.info('Project retrieved', {
      projectId: params.id,
      userId: userId,
      fileCount: project.files.length,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        prompt: project.prompt,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        files: project.files.map((file: any) => ({
          id: file.id,
          path: file.path,
          content: file.content,
          type: file.type,
          size: file.size
        })),
        history: project.history.map((item: any) => ({
          id: item.id,
          action: item.action,
          details: item.details,
          createdAt: item.createdAt
        }))
      }
    })

  } catch (error) {
    await logger.error('Failed to get project', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const updateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      await logger.warn('Unauthorized attempt to update project', requestContext)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description } = updateProjectSchema.parse(body)

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      await logger.warn('Project not found for update', {
        projectId: params.id,
        userId: session.user.id,
        ...requestContext
      })
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update project
    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        title,
        description,
        updatedAt: new Date()
      }
    })

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'UPDATED',
        details: `Project details updated: title changed to "${title}"`,
      },
    })

    await logger.info('Project updated successfully', {
      projectId: params.id,
      userId: session.user.id,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Project updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      await logger.warn('Invalid request data for project update', {
        errors: error.issues,
        projectId: params.id,
        ...requestContext
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    await logger.error('Failed to update project', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      await logger.warn('Unauthorized attempt to delete project', requestContext)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      await logger.warn('Project not found for deletion', {
        projectId: params.id,
        userId: session.user.id,
        ...requestContext
      })
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: params.id }
    })

    await logger.info('Project deleted successfully', {
      projectId: params.id,
      userId: session.user.id,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    await logger.error('Failed to delete project', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}