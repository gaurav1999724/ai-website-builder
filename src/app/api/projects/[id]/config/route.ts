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
      await logger.warn('Unauthorized config access attempt', {
        endpoint: `/api/projects/${params.id}/config`,
        method: 'GET',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project configuration
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

    await logger.info('Project configuration retrieved', {
      projectId: params.id,
      userId: session.user.id,
      hasConfig: !!project.config,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      config: project.config || {
        buildTool: 'vite',
        framework: 'vanilla',
        bundler: 'esbuild',
        outputDir: 'dist',
        publicPath: '/',
        minify: true,
        sourceMap: false,
        hotReload: true,
        platform: 'vercel',
        domain: '',
        customDomain: '',
        environment: 'production',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        nodeVersion: '18',
        environmentVariables: {}
      }
    })

  } catch (error) {
    await logger.error('Failed to get project configuration', error as Error, {
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
      await logger.warn('Unauthorized config update attempt', {
        endpoint: `/api/projects/${params.id}/config`,
        method: 'POST',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { build, deploy } = body

    if (!build || !deploy) {
      return NextResponse.json(
        { error: 'Build and deploy configuration are required' },
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

    // Upsert project configuration
    const config = await prisma.projectConfig.upsert({
      where: { projectId: params.id },
      update: {
        buildTool: build.buildTool,
        framework: build.framework,
        bundler: build.bundler,
        outputDir: build.outputDir,
        publicPath: build.publicPath,
        minify: build.minify,
        sourceMap: build.sourceMap,
        hotReload: build.hotReload,
        platform: deploy.platform,
        domain: deploy.domain,
        customDomain: deploy.customDomain,
        environment: deploy.environment,
        buildCommand: deploy.buildCommand,
        outputDirectory: deploy.outputDirectory,
        nodeVersion: deploy.nodeVersion,
        environmentVariables: deploy.environmentVariables,
        updatedAt: new Date()
      },
      create: {
        projectId: params.id,
        buildTool: build.buildTool,
        framework: build.framework,
        bundler: build.bundler,
        outputDir: build.outputDir,
        publicPath: build.publicPath,
        minify: build.minify,
        sourceMap: build.sourceMap,
        hotReload: build.hotReload,
        platform: deploy.platform,
        domain: deploy.domain,
        customDomain: deploy.customDomain,
        environment: deploy.environment,
        buildCommand: deploy.buildCommand,
        outputDirectory: deploy.outputDirectory,
        nodeVersion: deploy.nodeVersion,
        environmentVariables: deploy.environmentVariables
      }
    })

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'CONFIG_UPDATED',
        details: 'Project configuration updated',
      },
    })

    await logger.info('Project configuration updated', {
      projectId: params.id,
      userId: session.user.id,
      buildTool: build.buildTool,
      platform: deploy.platform,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration saved successfully!'
    })

  } catch (error) {
    await logger.error('Failed to update project configuration', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
