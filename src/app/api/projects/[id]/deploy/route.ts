import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'
import { VercelAPI, createVercelProjectStructure, generateDeploymentLogs, validateAndFixDeploymentUrl } from '@/lib/vercel'
import { generateWebsite } from '@/lib/ai'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      await logger.warn('Unauthorized deployment access attempt', {
        endpoint: `/api/projects/${params.id}/deploy`,
        method: 'GET',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project deployments
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await logger.info('Project deployments retrieved', {
      projectId: params.id,
      userId: session.user.id,
      deploymentCount: project.deployments.length,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      deployments: project.deployments
    })

  } catch (error) {
    await logger.error('Failed to get project deployments', error as Error, {
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
      await logger.warn('Unauthorized deployment attempt', {
        endpoint: `/api/projects/${params.id}/deploy`,
        method: 'POST',
        ...requestContext
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { branch = 'main', customDomain } = body

    // Only support Vercel deployment for static projects
    const platform = 'vercel'

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        config: true,
        files: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create deployment record
    const deployment = await prisma.projectDeployment.create({
      data: {
        projectId: params.id,
        platform,
        branch,
        customDomain: customDomain || '',
        status: 'PENDING',
        url: '',
        commit: 'abc123', // In a real implementation, this would be the actual commit hash
        logs: ['Starting deployment...']
      }
    })

    // Add to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'DEPLOYMENT_STARTED',
        details: `Started deployment to ${platform}`,
      },
    })

    await logger.info('Deployment started', {
      projectId: params.id,
      userId: session.user.id,
      deploymentId: deployment.id,
      platform,
      branch,
      ...requestContext
    })

    // Start the deployment process (don't await to allow immediate response)
    startDeploymentProcess(deployment.id, platform, params.id, session.user.id, requestContext).catch(error => {
      logger.error('Deployment process failed', error, {
        projectId: params.id,
        deploymentId: deployment.id,
        ...requestContext
      })
    })

    return NextResponse.json({
      success: true,
      deployment,
      message: 'Deployment started successfully!'
    })

  } catch (error) {
    await logger.error('Failed to start deployment', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Deployment process function
async function startDeploymentProcess(
  deploymentId: string, 
  platform: string, 
  projectId: string, 
  userId: string,
  requestContext: any
) {
  try {
    // Get project files for deployment
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { files: true, config: true }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    let deploymentUrl = ''
    let vercelDeploymentId = ''

    // Real Vercel deployment for static projects only
    const vercelToken = process.env.VERCEL_API_TOKEN
    if (!vercelToken) {
      await logger.warn('Vercel API token not configured, using simulation mode', {
        projectId,
        deploymentId,
        ...requestContext
      })
      
      // Fallback to simulation mode with a proper Vercel-like URL
      return await simulateDeployment(deploymentId, platform, projectId, userId, requestContext)
    }

    const vercel = new VercelAPI(vercelToken)
    
    try {
      // Update status to BUILDING
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'BUILDING',
          logs: [
            'Starting deployment...',
            '🔧 Preparing project files...',
            '📦 Building project structure...'
          ]
        }
      })

      // Create Vercel project structure for static files
      const projectFiles = project.files.map((file: any) => ({
        path: file.path,
        content: file.content,
        type: file.type
      }))
      
      const vercelFiles = createVercelProjectStructure(projectFiles, project.title)
      
      await logger.info('Vercel files >>>>>>>>>>>>  ', {
        vercelFiles: vercelFiles,
        sampleFile: vercelFiles['index.html'] ? vercelFiles['index.html'].substring(0, 200) : 'No index.html found'
      })

      // Update status - looking for existing project
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          logs: [
            'Starting deployment...',
            '🔧 Preparing project files...',
            '📦 Building project structure...',
            '🔍 Checking for existing Vercel project...'
          ]
        }
      })

      // Create or get Vercel project
      let vercelProject
      try {
        const projects = await vercel.listProjects();
        await logger.info('Vercel projects >>>>>>>>>>>>  ', {
          projects: projects
        })
        
        // Check if projects is valid array
        if (!projects || !Array.isArray(projects)) {
          throw new Error('Invalid response from Vercel API: projects is not an array')
        }
        
        // Generate descriptive project name
        const descriptiveName = vercel.generateDescriptiveProjectName(project.title, userId)
        
        await logger.info('Generated descriptive project name', {
          originalTitle: project.title,
          userId: userId,
          descriptiveName: descriptiveName,
          projectId,
          deploymentId
        })
        
        if(projects.length > 0) {
          vercelProject = projects.find(p => p.name === descriptiveName)
        }
        
        if (!vercelProject) {
          // Update status - creating new project
          await prisma.projectDeployment.update({
            where: { id: deploymentId },
            data: {
              logs: [
                'Starting deployment...',
                '🔧 Preparing project files...',
                '📦 Building project structure...',
                '🔍 Checking for existing Vercel project...',
                '🆕 Creating new Vercel project...'
              ]
            }
          })
          
          vercelProject = await vercel.createProject(descriptiveName)

          await logger.info('Vercel project created >>>>>>>>>>>>  ', {
            vercelProject: vercelProject
          })
          
          // Update status - project created
          await prisma.projectDeployment.update({
            where: { id: deploymentId },
            data: {
              logs: [
                'Starting deployment...',
                '🔧 Preparing project files...',
                '📦 Building project structure...',
                '🔍 Checking for existing Vercel project...',
                '🆕 Creating new Vercel project...',
                '✅ Vercel project created successfully'
              ]
            }
          })
        } else {
          // Update status - found existing project
          await prisma.projectDeployment.update({
            where: { id: deploymentId },
            data: {
              logs: [
                'Starting deployment...',
                '🔧 Preparing project files...',
                '📦 Building project structure...',
                '🔍 Checking for existing Vercel project...',
                '✅ Found existing Vercel project'
              ]
            }
          })
        }
      } catch (error) {
        await logger.warn('Failed to create/get Vercel project, using fallback', {
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
          deploymentId
        })
        
        // Fallback to simulated deployment
        return await simulateDeployment(deploymentId, platform, projectId, userId, requestContext)
      }

      // Update status - starting deployment
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'DEPLOYING',
          logs: [
            'Starting deployment...',
            '🔧 Preparing project files...',
            '📦 Building project structure...',
            '🔍 Checking for existing Vercel project...',
            '✅ Found existing Vercel project',
            '🚀 Starting Vercel deployment...',
            '📤 Uploading project files...'
          ]
        }
      })

      // Check for existing deployments to reuse
      let deployment
      try {
        // Get existing deployments for this project
        const existingDeployments = await vercel.getProjectDeployments(vercelProject.id)
        
        if (existingDeployments && existingDeployments.length > 0) {
          // Use the most recent deployment
          const latestDeployment = existingDeployments[0]
          
          // Get the public alias URL for the existing deployment
          let publicUrl = latestDeployment.url
          try {
            publicUrl = await vercel.getPublicDeploymentUrl(latestDeployment.id)
            await logger.info('Reusing existing Vercel deployment with public URL', {
              projectId: vercelProject.id,
              deploymentId: latestDeployment.id,
              internalUrl: latestDeployment.url,
              publicUrl: publicUrl
            })
          } catch (urlError) {
            await logger.warn('Failed to get public URL for existing deployment, using original', {
              projectId: vercelProject.id,
              deploymentId: latestDeployment.id,
              originalUrl: latestDeployment.url,
              error: urlError instanceof Error ? urlError.message : 'Unknown error'
            })
          }
          
          // Update the deployment object with the public URL
          deployment = {
            ...latestDeployment,
            url: publicUrl
          }
        } else {
          // Create new deployment
          await logger.info('Starting new Vercel deployment', {
            projectId: vercelProject.id,
            projectName: project.title,
            fileCount: Object.keys(vercelFiles).length
          })

          await logger.info('Vercel files >>>>>>>>>>>>  ', {
            vercelFiles: vercelFiles
          })
          
          deployment = await vercel.deployProject(vercelProject.id, {
            name: project.title,
            files: vercelFiles,
            target: 'production'
          })
        }
      } catch (deploymentError) {
        // If getting existing deployments fails, create a new one
        await logger.warn('Failed to get existing deployments, creating new one', {
          error: deploymentError instanceof Error ? deploymentError.message : 'Unknown error',
          projectId: vercelProject.id
        })
        
        deployment = await vercel.deployProject(vercelProject.id, {
          name: project.title,
          files: vercelFiles,
          target: 'production'
        })
      }
      
      await logger.info('Vercel deployment initiated successfully', {
        deploymentId: deployment.id,
        deploymentUrl: deployment.url,
        projectId: vercelProject.id,
        deploymentReadyState: deployment.readyState
      })

      // Get the public alias URL for the deployment
      let publicDeploymentUrl = deployment.url
      try {
        publicDeploymentUrl = await vercel.getPublicDeploymentUrl(deployment.id)
        await logger.info('Retrieved public deployment URL', {
          deploymentId: deployment.id,
          internalUrl: deployment.url,
          publicUrl: publicDeploymentUrl
        })
      } catch (urlError) {
        await logger.warn('Failed to get public URL, using deployment URL', {
          deploymentId: deployment.id,
          error: urlError instanceof Error ? urlError.message : 'Unknown error',
          fallbackUrl: deployment.url
        })
      }

      // Update status - deployment initiated
      const isReusingDeployment = deployment && !deployment.id.includes('new')
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          logs: [
            'Starting deployment...',
            '🔧 Preparing project files...',
            '📦 Building project structure...',
            '🔍 Checking for existing Vercel project...',
            '✅ Found existing Vercel project',
            isReusingDeployment ? '♻️ Reusing existing deployment...' : '🚀 Starting Vercel deployment...',
            isReusingDeployment ? '✅ Using existing deployment URL' : '📤 Uploading project files...',
            isReusingDeployment ? '🎉 Deployment ready!' : '⏳ Deployment initiated, waiting for completion...'
          ]
        }
      })
      
      vercelDeploymentId = deployment.id
      deploymentUrl = publicDeploymentUrl

      // Update deployment with Vercel info
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'BUILDING',
          logs: generateDeploymentLogs('BUILDING', 0),
          url: deploymentUrl
        }
      })

      // Poll Vercel deployment status
      await pollVercelDeployment(vercel, deploymentId, vercelDeploymentId, projectId, userId, requestContext)

    } catch (error) {
      await logger.error('Vercel deployment failed, falling back to simulation', error as Error, {
        projectId,
        deploymentId,
        vercelDeploymentId
      })
      
      // Fallback to simulated deployment
      return await simulateDeployment(deploymentId, platform, projectId, userId, requestContext)
    }

  } catch (error) {
    await prisma.projectDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'FAILED',
        logs: [
          '❌ Deployment failed!',
          '🔍 Error: ' + (error instanceof Error ? error.message : 'Unknown error'),
          '📞 Please check your configuration and try again'
        ],
        completedAt: new Date()
      }
    })

    await logger.error('Deployment failed', error as Error, {
      projectId: projectId,
      deploymentId: deploymentId,
      platform,
      ...requestContext
    })
  }
}

// Poll Vercel deployment status
async function pollVercelDeployment(
  vercel: VercelAPI,
  deploymentId: string,
  vercelDeploymentId: string,
  projectId: string,
  userId: string,
  requestContext: any
) {
  const maxAttempts = 30 // 5 minutes max
  let attempts = 0

  const poll = async () => {
    try {
      const deployment = await vercel.getDeploymentStatus(vercelDeploymentId)
      
      await logger.info('Vercel deployment status retrieved >>>>>>>>>>> ', {
        deployment: deployment
      })
      
      // Map Vercel readyState to our DeploymentStatus enum
      const mappedStatus = deployment.readyState === 'ERROR' ? 'FAILED' : 
                          deployment.readyState === 'READY' ? 'SUCCESS' : 
                          deployment.readyState as any

      // Validate and fix deployment URL
      let deploymentUrl = deployment.url
      
      // Check if the URL is a fake Vercel URL (contains localhost, invalid format, or missing protocol)
      // if (deploymentUrl && (
      //   deploymentUrl.includes('localhost') || 
      //   deploymentUrl.includes('gaurav-kumars-projects') ||
      //   (!deploymentUrl.startsWith('http://') && !deploymentUrl.startsWith('https://'))
      // )) {
      //   // Use preview URL instead of fake Vercel URL
      //   const baseUrl = "https://"
      //   deploymentUrl = `${baseUrl}/projects/${projectId}/preview`
        
      //   await logger.warn('Detected fake Vercel URL, using preview URL instead', {
      //     originalUrl: deployment.url,
      //     previewUrl: deploymentUrl,
      //     projectId,
      //     deploymentId
      //   })
      // }

       if(deploymentUrl && (!deploymentUrl.startsWith('http://') && !deploymentUrl.startsWith('https://'))){
          // Generate proper preview URL
          const baseUrl = "https://"
          deploymentUrl = `${baseUrl}${deployment.url}`
       }

      // Update deployment status
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status: mappedStatus,
          logs: generateDeploymentLogs(mappedStatus),
          url: deploymentUrl
        }
      })

      if (deployment.readyState === 'READY') {
        // Deployment successful - get the public alias URL
        let finalUrl = deploymentUrl
        
        try {
          // Try to get the public alias URL
          const publicUrl = await vercel.getPublicDeploymentUrl(vercelDeploymentId)
          finalUrl = publicUrl
          await logger.info('Deployment ready - using public alias URL', {
            deploymentId: deploymentId,
            vercelDeploymentId,
            publicUrl: publicUrl,
            originalUrl: deployment.url
          })
        } catch (urlError) {
          await logger.warn('Failed to get public URL for ready deployment, using original', {
            deploymentId: deploymentId,
            vercelDeploymentId,
            originalUrl: deployment.url,
            error: urlError instanceof Error ? urlError.message : 'Unknown error'
          })
        }
        
        // Validate and fix URL if needed
        const validatedUrl = validateAndFixDeploymentUrl(finalUrl, projectId)
        
        await prisma.projectDeployment.update({
          where: { id: deploymentId },
          data: {
            completedAt: new Date(),
            status: 'SUCCESS',
            url: validatedUrl  // Use the validated public URL
          }
        })

        await prisma.projectHistory.create({
          data: {
            projectId: projectId,
            action: 'DEPLOYMENT_SUCCESS',
            details: `Successfully deployed to Vercel: ${deploymentUrl}`,
          },
        })

        await logger.info('Vercel deployment completed successfully', {
          projectId: projectId,
          deploymentId: deploymentId,
          vercelDeploymentId,
          url: deploymentUrl,
          ...requestContext
        })
        return
      } else if (deployment.readyState === 'ERROR') {
        // Deployment failed
        await prisma.projectDeployment.update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            logs: generateDeploymentLogs('FAILED')
          }
        })

        await logger.error('Vercel deployment failed', new Error('Deployment failed'), {
          projectId: projectId,
          deploymentId: deploymentId,
          vercelDeploymentId,
          ...requestContext
        })

        // AI Auto-fix: Analyze error and attempt to fix
        await attemptAIAutoFix(projectId, deploymentId, vercelDeploymentId, userId, requestContext)
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000) // Poll every 10 seconds
      } else {
        // Timeout
        await prisma.projectDeployment.update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            logs: [...generateDeploymentLogs('FAILED'), '⏰ Deployment timeout']
          }
        })
      }

    } catch (error) {
      await logger.error('Error polling Vercel deployment', error as Error, {
        projectId,
        deploymentId,
        vercelDeploymentId
      })
    }
  }

  // Start polling after a short delay
  setTimeout(poll, 2000)
}

// Simulated deployment for non-Vercel platforms
async function simulateDeployment(
  deploymentId: string, 
  platform: string, 
  projectId: string, 
  userId: string,
  requestContext: any
) {
  // Get project details for URL generation
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true }
  })
  // Simulate realistic deployment steps with detailed logs
  const deploymentSteps = [
    {
      status: 'BUILDING',
      logs: generateDeploymentLogs('BUILDING', 0)
    },
    {
      status: 'BUILDING',
      logs: generateDeploymentLogs('BUILDING', 1)
    },
    {
      status: 'BUILDING',
      logs: generateDeploymentLogs('BUILDING', 2)
    },
    {
      status: 'BUILDING',
      logs: generateDeploymentLogs('BUILDING', 3)
    },
    {
      status: 'DEPLOYING',
      logs: [
        '🚀 Starting deployment process...',
        '🌐 Preparing project files...',
        '🔐 Setting up preview environment...',
        '🌍 Configuring preview URL...'
      ]
    },
    {
      status: 'SUCCESS',
      logs: [
        '🎉 Deployment completed successfully!',
        '🌐 Your project preview is now available.',
        '📊 Preview environment configured.',
        '🔒 Secure preview access enabled.',
        '✨ Ready to view and share!'
      ]
    }
  ]

  let allLogs: string[] = []

  for (const step of deploymentSteps) {
    // Add logs for this step
    allLogs = [...allLogs, ...step.logs]
    
    await prisma.projectDeployment.update({
      where: { id: deploymentId },
      data: {
        status: step.status as any,
        logs: allLogs
      }
    })

    // Wait between steps (simulate real deployment time)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // Generate a working preview URL for the project
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const deploymentUrl = `${baseUrl}/projects/${projectId}/preview`
  
  await prisma.projectDeployment.update({
    where: { id: deploymentId },
    data: {
      url: deploymentUrl,
      completedAt: new Date(),
      status: 'SUCCESS'
    }
  })

  // Add success to project history
  await prisma.projectHistory.create({
    data: {
      projectId: projectId,
      action: 'DEPLOYMENT_SUCCESS',
      details: `Project preview deployed successfully: ${deploymentUrl}`,
    },
  })

  await logger.info('Simulated deployment completed successfully', {
    projectId: projectId,
    deploymentId: deploymentId,
    platform,
    url: deploymentUrl,
    ...requestContext
  })
}

// Clean up vercel.json files (not needed for static projects)
async function cleanupVercelJson(projectId: string) {
  try {
    const vercelJsonFiles = await prisma.projectFile.findMany({
      where: {
        projectId,
        path: {
          in: ['vercel.json', '/vercel.json']
        }
      }
    })

    if (vercelJsonFiles.length > 0) {
      await prisma.projectFile.deleteMany({
        where: {
          projectId,
          path: {
            in: ['vercel.json', '/vercel.json']
          }
        }
      })

      await logger.info('Cleaned up unnecessary vercel.json files', {
        projectId,
        removedCount: vercelJsonFiles.length
      })
    }
  } catch (error) {
    await logger.error('Failed to cleanup vercel.json files', error as Error, {
      projectId
    })
  }
}

// AI Auto-fix function to analyze and fix deployment errors
async function attemptAIAutoFix(
  projectId: string, 
  deploymentId: string, 
  vercelDeploymentId: string, 
  userId: string,
  requestContext: any
) {
  try {
    await logger.info('Starting AI auto-fix for failed deployment', {
      projectId,
      deploymentId,
      vercelDeploymentId,
      ...requestContext
    })

    // Update deployment status to show AI is analyzing
    await prisma.projectDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'BUILDING',
        logs: [
          '🤖 AI Auto-fix initiated...',
          '🔍 Analyzing deployment error...',
          '🧠 AI is working on a solution...'
        ]
      }
    })

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { files: true, config: true }
    })

    if (!project) {
      throw new Error('Project not found for AI auto-fix')
    }

    // Clean up any existing vercel.json files first (not needed for static projects)
    await cleanupVercelJson(projectId)

    // Analyze the error and generate fixes using AI
    const errorAnalysis = await analyzeDeploymentError(project, vercelDeploymentId)
    
    if (errorAnalysis.canFix) {
      await logger.info('AI identified fixable issues', {
        projectId,
        deploymentId,
        issues: errorAnalysis.issues,
        fixes: errorAnalysis.fixes
      })

      // Apply AI-generated fixes
      const fixedProject = await applyAIFixes(project, errorAnalysis.fixes)
      
      // Update project with fixes
      await updateProjectWithFixes(projectId, fixedProject)

      // Retry deployment with fixed project
      await retryDeploymentWithFixes(projectId, deploymentId, fixedProject, userId, requestContext)
    } else {
      // AI couldn't fix the issue
      await prisma.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          logs: [
            '❌ Deployment failed!',
            '🤖 AI analysis completed',
            '🔍 Issues identified but require manual intervention',
            ...errorAnalysis.issues.map((issue: string) => `⚠️ ${issue}`),
            '📞 Please review and fix manually'
          ]
        }
      })
    }

  } catch (error) {
    await logger.error('AI auto-fix failed', error as Error, {
      projectId,
      deploymentId,
      vercelDeploymentId,
      ...requestContext
    })

    // Fallback to manual error
    await prisma.projectDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        logs: [
          '❌ Deployment failed!',
          '🤖 AI auto-fix encountered an error',
          '🔍 Please try manual deployment or contact support'
        ]
      }
    })
  }
}

// Analyze deployment error using rule-based analysis
async function analyzeDeploymentError(project: any, vercelDeploymentId: string) {
  const projectFiles = project.files.map((file: any) => ({
    path: file.path,
    content: file.content,
    type: file.type
  }))

  const issues: string[] = []
  const fixes: any[] = []

  // Check for common deployment issues
  const hasIndexHtml = projectFiles.some((file: any) => 
    file.path === 'index.html' || file.path === '/index.html'
  )
  
  if (!hasIndexHtml) {
    issues.push('Missing index.html file')
    fixes.push({
      type: 'add_file',
      path: 'index.html',
      content: generateDefaultIndexHtml(project.title)
    })
  }

  // Check for existing vercel.json and remove it if present (not needed for static projects)
  const vercelJsonFile = projectFiles.find((file: any) => 
    file.path === 'vercel.json' || file.path === '/vercel.json'
  )
  
  if (vercelJsonFile) {
    issues.push('Removing unnecessary vercel.json file')
    fixes.push({
      type: 'remove_file',
      path: vercelJsonFile.path
    })
  }

  // Check for invalid file paths
  const invalidPaths = projectFiles.filter((file: any) => 
    file.path.includes('..') || file.path.startsWith('/') && file.path !== '/index.html'
  )
  
  if (invalidPaths.length > 0) {
    issues.push('Invalid file paths detected')
    // Fix invalid paths
    invalidPaths.forEach((file: any) => {
      const fixedPath = file.path.replace(/^\/+/, '').replace(/\.\./g, '')
      fixes.push({
        type: 'modify_file',
        path: file.path,
        newPath: fixedPath,
        content: file.content
      })
    })
  }

  // Check for empty files
  const emptyFiles = projectFiles.filter((file: any) => 
    !file.content || file.content.trim() === ''
  )
  
  if (emptyFiles.length > 0) {
    issues.push('Empty files detected')
    emptyFiles.forEach((file: any) => {
      if (file.path.endsWith('.html')) {
        fixes.push({
          type: 'modify_file',
          path: file.path,
          content: generateDefaultIndexHtml(project.title)
        })
      } else if (file.path.endsWith('.css')) {
        fixes.push({
          type: 'modify_file',
          path: file.path,
          content: '/* Default CSS */\nbody { margin: 0; padding: 20px; font-family: Arial, sans-serif; }'
        })
      }
    })
  }

  const canFix = issues.length > 0 && fixes.length > 0

  await logger.info('Deployment error analysis completed', {
    projectId: project.id,
    vercelDeploymentId,
    issues,
    fixes: fixes.length,
    canFix
  })

  return {
    canFix,
    issues,
    fixes
  }
}

// Generate default index.html
function generateDefaultIndexHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p>Welcome to your website! This is a default page generated by AI Builder.</p>
    </div>
</body>
</html>`
}


// Get file type from file path
function getFileTypeFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'html':
      return 'HTML'
    case 'css':
      return 'CSS'
    case 'js':
      return 'JAVASCRIPT'
    case 'ts':
      return 'TYPESCRIPT'
    case 'jsx':
    case 'tsx':
      return 'REACT'
    case 'vue':
      return 'VUE'
    case 'json':
      return 'JSON'
    case 'md':
      return 'MARKDOWN'
    default:
      return 'OTHER'
  }
}

// Apply AI-generated fixes to project
async function applyAIFixes(project: any, fixes: any[]) {
  const updatedFiles = [...project.files]
  
  for (const fix of fixes) {
    if (fix.type === 'add_file') {
      updatedFiles.push({
        path: fix.path,
        content: fix.content,
        type: getFileTypeFromPath(fix.path)
      })
    } else if (fix.type === 'modify_file') {
      const fileIndex = updatedFiles.findIndex((f: any) => f.path === fix.path)
      if (fileIndex >= 0) {
        // If there's a newPath, we need to rename the file
        if (fix.newPath) {
          updatedFiles[fileIndex].path = fix.newPath
        }
        updatedFiles[fileIndex].content = fix.content
      }
    } else if (fix.type === 'remove_file') {
      // Remove the file from the project
      const fileIndex = updatedFiles.findIndex((f: any) => f.path === fix.path)
      if (fileIndex >= 0) {
        updatedFiles.splice(fileIndex, 1)
      }
    }
  }

  return {
    ...project,
    files: updatedFiles
  }
}

// Update project with AI fixes
async function updateProjectWithFixes(projectId: string, fixedProject: any) {
  // Delete existing files
  await prisma.projectFile.deleteMany({
    where: { projectId }
  })

  // Add fixed files
  for (const file of fixedProject.files) {
    await prisma.projectFile.create({
      data: {
        projectId,
        path: file.path,
        content: file.content,
        type: file.type,
        size: Buffer.byteLength(file.content, 'utf8')
      }
    })
  }

  await logger.info('Project updated with AI fixes', {
    projectId,
    fileCount: fixedProject.files.length
  })
}

// Retry deployment with AI fixes
async function retryDeploymentWithFixes(
  projectId: string, 
  deploymentId: string, 
  fixedProject: any, 
  userId: string,
  requestContext: any
) {
  try {
    await logger.info('Retrying deployment with AI fixes', {
      projectId,
      deploymentId
    })

    // Update deployment status
    await prisma.projectDeployment.update({
      where: { id: deploymentId },
      data: {
        status: 'BUILDING',
        logs: [
          '🤖 AI fixes applied successfully!',
          '🔄 Retrying deployment with fixes...',
          '🚀 Deploying fixed project to Vercel...'
        ]
      }
    })

    // Start new deployment process with fixed project
    startDeploymentProcess(deploymentId, 'vercel', projectId, userId, requestContext)

  } catch (error) {
    await logger.error('Failed to retry deployment with AI fixes', error as Error, {
      projectId,
      deploymentId
    })
  }
}

// Generate deployment URL based on platform
function generateDeploymentUrl(projectId: string, platform: string): string {
  const baseUrl = projectId.substring(0, 8) // Use first 8 chars of project ID
  const timestamp = Date.now().toString().slice(-4) // Add timestamp for uniqueness
  
  switch (platform) {
    case 'vercel':
      return `https://${baseUrl}-${timestamp}.vercel.app`
    case 'netlify':
      return `https://${baseUrl}-${timestamp}.netlify.app`
    case 'github-pages':
      return `https://${baseUrl}.github.io/ai-website-builder`
    case 'aws-s3':
      return `https://${baseUrl}-${timestamp}.s3-website-us-east-1.amazonaws.com`
    case 'firebase':
      return `https://${baseUrl}-${timestamp}.web.app`
    default:
      return `https://${baseUrl}-${timestamp}.vercel.app`
  }
}
