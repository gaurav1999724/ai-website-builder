import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; deploymentId: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized deployment status access attempt', {
        endpoint: `/api/projects/${params.id}/deployments/${params.deploymentId}`,
        method: 'GET',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get deployment details
    const deployment = await prisma.projectDeployment.findFirst({
      where: {
        id: params.deploymentId,
        project: {
          id: params.id,
          userId: session.user.id
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            userId: true
          }
        }
      }
    })

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    await logger.info('Deployment status retrieved', {
      projectId: params.id,
      deploymentId: params.deploymentId,
      userId: session.user.id,
      status: deployment.status,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        status: deployment.status,
        platform: deployment.platform,
        url: deployment.url,
        branch: deployment.branch,
        commit: deployment.commit,
        logs: deployment.logs,
        createdAt: deployment.createdAt,
        completedAt: deployment.completedAt,
        customDomain: deployment.customDomain
      }
    })

  } catch (error) {
    await logger.error('Failed to get deployment status', error as Error, {
      projectId: params.id,
      deploymentId: params.deploymentId,
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
  { params }: { params: { id: string; deploymentId: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized deployment deletion attempt', {
        endpoint: `/api/projects/${params.id}/deployments/${params.deploymentId}`,
        method: 'DELETE',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify deployment exists and user has access
    const deployment = await prisma.projectDeployment.findFirst({
      where: {
        id: params.deploymentId,
        project: {
          id: params.id,
          userId: session.user.id
        }
      }
    })

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    // Delete deployment
    await prisma.projectDeployment.delete({
      where: { id: params.deploymentId }
    })

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'DEPLOYMENT_DELETED',
        details: `Deleted deployment to ${deployment.platform}`,
      },
    })

    await logger.info('Deployment deleted', {
      projectId: params.id,
      deploymentId: params.deploymentId,
      userId: session.user.id,
      platform: deployment.platform,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      message: 'Deployment deleted successfully'
    })

  } catch (error) {
    await logger.error('Failed to delete deployment', error as Error, {
      projectId: params.id,
      deploymentId: params.deploymentId,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}