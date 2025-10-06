import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; deploymentId: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized deployment URL fix attempt', {
        endpoint: `/api/projects/${params.id}/deployments/${params.deploymentId}/fix-url`,
        method: 'POST',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get deployment and project details
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
            title: true
          }
        }
      }
    })

    if (!deployment || !deployment.url) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
    }

    // Generate proper preview URL
    const baseUrl = "https://"
    const properUrl = `${baseUrl}${deployment.url}`

    // Update deployment with correct URL
    await prisma.projectDeployment.update({
      where: { id: params.deploymentId },
      data: {
        url: properUrl
      }
    })

    await logger.info('Deployment URL fixed', {
      projectId: params.id,
      deploymentId: params.deploymentId,
      userId: session.user.id,
      oldUrl: deployment.url,
      newUrl: properUrl,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      message: 'Deployment URL updated successfully',
      url: properUrl
    })

  } catch (error) {
    await logger.error('Failed to fix deployment URL', error as Error, {
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
