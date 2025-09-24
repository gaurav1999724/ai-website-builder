import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized component access attempt', {
        endpoint: `/api/projects/${params.id}/components`,
        method: 'GET',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project components
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        components: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await logger.info('Project components retrieved', {
      projectId: params.id,
      userId: session.user.id,
      componentCount: project.components.length,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      components: project.components
    })

  } catch (error) {
    await logger.error('Failed to get project components', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized component addition attempt', {
        endpoint: `/api/projects/${params.id}/components`,
        method: 'POST',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { components } = body

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: 'Components array is required' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Add components to project
    const createdComponents = await Promise.all(
      components.map(async (componentData: any) => {
        return await prisma.projectComponent.create({
          data: {
            projectId: params.id,
            componentId: componentData.id,
            name: componentData.name,
            category: componentData.category,
            code: componentData.code,
            preview: componentData.preview,
            tags: componentData.tags,
            addedAt: new Date()
          }
        })
      })
    )

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'COMPONENTS_ADDED',
        details: `Added ${components.length} component${components.length > 1 ? 's' : ''} to project`,
      },
    })

    await logger.info('Components added to project', {
      projectId: params.id,
      userId: session.user.id,
      componentCount: components.length,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      components: createdComponents,
      message: `Successfully added ${components.length} component${components.length > 1 ? 's' : ''} to your project!`
    })

  } catch (error) {
    await logger.error('Failed to add components to project', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
