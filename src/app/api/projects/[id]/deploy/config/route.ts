import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'
import { z } from 'zod'

const deploymentConfigSchema = z.object({
  platform: z.enum(['vercel', 'netlify', 'github-pages', 'aws-s3', 'firebase']),
  customDomain: z.string().optional(),
  branch: z.string().default('main'),
  buildCommand: z.string().optional(),
  outputDirectory: z.string().optional(),
  installCommand: z.string().optional(),
  environmentVariables: z.record(z.string()).optional(),
  framework: z.string().optional(),
  nodeVersion: z.string().optional(),
  enablePreview: z.boolean().default(true),
  autoDeploy: z.boolean().default(false)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized deployment config access attempt', {
        endpoint: `/api/projects/${params.id}/deploy/config`,
        method: 'GET',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project and its config
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        config: true,
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get deployment configuration
    const config = {
      platform: project.config?.platform || 'vercel',
      customDomain: project.config?.customDomain || '',
      branch: 'main',
      buildCommand: project.config?.buildCommand || 'npm run build',
      outputDirectory: project.config?.outputDirectory || 'dist',
      installCommand: 'npm install',
      environmentVariables: project.config?.environmentVariables || {},
      framework: project.config?.framework || 'nextjs',
      nodeVersion: project.config?.nodeVersion || '18',
      enablePreview: true,
      autoDeploy: false,
      recentDeployments: project.deployments.map((d: any) => ({
        id: d.id,
        platform: d.platform,
        status: d.status,
        url: d.url,
        createdAt: d.createdAt,
        completedAt: d.completedAt
      }))
    }

    await logger.info('Deployment config retrieved', {
      projectId: params.id,
      userId: session.user.id,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      config
    })

  } catch (error) {
    await logger.error('Failed to get deployment config', error as Error, {
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
      await logger.warn('Unauthorized deployment config update attempt', {
        endpoint: `/api/projects/${params.id}/deploy/config`,
        method: 'POST',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const configData = deploymentConfigSchema.parse(body)

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        config: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update or create project config
    const updatedConfig = await prisma.projectConfig.upsert({
      where: { projectId: params.id },
      update: {
        platform: configData.platform,
        customDomain: configData.customDomain || '',
        buildCommand: configData.buildCommand || 'npm run build',
        outputDirectory: configData.outputDirectory || 'dist',
        environmentVariables: configData.environmentVariables || {},
        framework: configData.framework || 'nextjs',
        nodeVersion: configData.nodeVersion || '18',
        updatedAt: new Date()
      },
      create: {
        projectId: params.id,
        platform: configData.platform,
        customDomain: configData.customDomain || '',
        buildCommand: configData.buildCommand || 'npm run build',
        outputDirectory: configData.outputDirectory || 'dist',
        environmentVariables: configData.environmentVariables || {},
        framework: configData.framework || 'nextjs',
        nodeVersion: configData.nodeVersion || '18'
      }
    })

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'DEPLOYMENT_CONFIG_UPDATED',
        details: `Updated deployment configuration for ${configData.platform}`,
      },
    })

    await logger.info('Deployment config updated', {
      projectId: params.id,
      userId: session.user.id,
      platform: configData.platform,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: 'Deployment configuration updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.errors },
        { status: 400 }
      )
    }

    await logger.error('Failed to update deployment config', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
