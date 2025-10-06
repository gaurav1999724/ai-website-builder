import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'
import { formatDateOnly } from '@/lib/utils'
import { z } from 'zod'
// import { AIProvider as PrismaAIProvider } from '@prisma/client'
import { AIProvider, generateProjectTitle } from '@/lib/ai'

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  provider: z.enum(['cerebras', 'openai', 'anthropic', 'gemini']).optional().default('cerebras'),
  title: z.string().optional(),
  images: z.array(z.string()).optional().default([]), // Base64 encoded images
})

// Helper function to determine file type from path
function getFileTypeFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'html':
    case 'htm':
      return 'HTML'
    case 'css':
      return 'CSS'
    case 'js':
    case 'jsx':
      return 'JAVASCRIPT'
    case 'ts':
    case 'tsx':
      return 'TYPESCRIPT'
    case 'json':
      return 'JSON'
    case 'md':
    case 'markdown':
      return 'MARKDOWN'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'IMAGE'
    case 'txt':
      return 'TEXT'
    default:
      return 'TEXT'
  }
}

// Streaming AI generation function
async function* streamAIResponse(prompt: string, provider: AIProvider, projectId?: string, images?: string[]) {
  // Simulate streaming by breaking the generation into chunks
  const chunks = [
    { type: 'status', data: { status: 'Reading prompt...', progress: 10 } },
    { type: 'status', data: { status: 'Connecting to AI API...', progress: 20 } },
    { type: 'status', data: { status: 'Generating project structure...', progress: 30 } },
    { type: 'status', data: { status: 'Creating HTML files...', progress: 50 } },
    { type: 'status', data: { status: 'Adding CSS styles...', progress: 70 } },
    { type: 'status', data: { status: 'Implementing JavaScript...', progress: 85 } },
    { type: 'status', data: { status: 'Finalizing project...', progress: 95 } },
  ]

  // Send status updates
  for (const chunk of chunks) {
    yield `data: ${JSON.stringify(chunk)}\n\n`
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate processing time
  }

  // Now generate the actual content
  try {
    const { generateWebsite } = await import('@/lib/ai')
    const aiResponse = await generateWebsite(prompt, provider as AIProvider, images)
    
    // Stream the files one by one
    for (let i = 0; i < aiResponse.files.length; i++) {
      const file = aiResponse.files[i]
      const fileChunk = {
        type: 'file',
        data: {
          path: file.path,
          content: file.content,
          type: getFileTypeFromPath(file.path),
          index: i,
          total: aiResponse.files.length
        }
      }
      yield `data: ${JSON.stringify(fileChunk)}\n\n`
      await new Promise(resolve => setTimeout(resolve, 200)) // Small delay between files
    }

    // Send completion
    const completionChunk = {
      type: 'complete',
      data: {
        status: 'Project generated successfully!',
        progress: 100,
        totalFiles: aiResponse.files.length,
        metadata: aiResponse.metadata,
        projectId: projectId,
        description: aiResponse.content // Include the AI response description
      }
    }
    yield `data: ${JSON.stringify(completionChunk)}\n\n`

  } catch (error) {
    const errorChunk = {
      type: 'error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'Generation failed'
      }
    }
    yield `data: ${JSON.stringify(errorChunk)}\n\n`
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    // Use session user ID if available, otherwise use the test user ID
    let userId = session?.user?.id
    
    if (!userId) {
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
        await logger.info('Using admin user for unauthenticated streaming generation', {
          endpoint: '/api/projects/generate/stream',
          method: 'POST',
          adminUserId: userId,
          adminEmail: adminUser.email,
          ...requestContext
        })
      } else {
        // Fallback to first active user if no admin found
        const fallbackUser = await prisma.user.findFirst({
          where: { isActive: true },
          select: { id: true, email: true }
        })
        
        if (fallbackUser) {
          userId = fallbackUser.id
          await logger.info('Using fallback user for unauthenticated streaming generation', {
            endpoint: '/api/projects/generate/stream',
            method: 'POST',
            fallbackUserId: userId,
            fallbackEmail: fallbackUser.email,
            ...requestContext
          })
        } else {
          throw new Error('No active users found in database')
        }
      }
    }

    const body = await request.json()
    const { prompt, provider, title, images } = generateSchema.parse(body)

    // Enhance the user prompt for better results
    const { enhanceUserPrompt } = await import('@/lib/ai/prompt-enhancer')
    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: 'create',
      projectType: 'website'
    })

    let project: any
    let generation: any

    try {
      // Verify the user exists before creating project
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true }
      })

      if (!userExists) {
        throw new Error(`User with ID ${userId} does not exist in database`)
      }

      if (!userExists.isActive) {
        throw new Error(`User with ID ${userId} is not active`)
      }

      await logger.info('User verification passed for streaming', {
        userId: userId,
        userEmail: userExists.email,
        userActive: userExists.isActive,
        ...requestContext
      })

      // Generate AI-based title if not provided
      let projectTitle = title
      if (!projectTitle) {
        try {
          projectTitle = await generateProjectTitle(prompt, provider as AIProvider)
          await logger.info('AI-generated project title', {
            originalPrompt: prompt.substring(0, 100),
            generatedTitle: projectTitle,
            provider
          })
        } catch (error) {
          await logger.warn('Failed to generate AI title, using fallback', {
            error: error instanceof Error ? error.message : 'Unknown error',
            prompt: prompt.substring(0, 100)
          })
          projectTitle = `Project-${formatDateOnly(new Date())}`
        }
      }

      // Create project record
      project = await prisma.project.create({
        data: {
          title: projectTitle,
          prompt: prompt, // Use original user prompt, not enhanced
          userId: userId,
          status: 'GENERATING',
        },
      })

      // Create generation record
      generation = await prisma.projectGeneration.create({
        data: {
          projectId: project.id,
          prompt: prompt, // Use original user prompt, not enhanced
          aiProvider: provider.toUpperCase() as any,
          status: 'PROCESSING',
        },
      })

      await logger.info('Streaming generation started', {
        projectId: project.id,
        generationId: generation.id,
        userId: userId,
        provider,
        ...requestContext
      })

      // Create a readable stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial project info
            const projectInfo = {
              type: 'project',
              data: {
                projectId: project.id,
                generationId: generation.id,
                title: project.title
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(projectInfo)}\n\n`))

            // Stream the AI response and collect files
            const generatedFiles: any[] = []
            let aiResponseDescription = ''
            for await (const chunk of streamAIResponse(enhancedPrompt, provider as AIProvider, project.id, images)) {
              controller.enqueue(encoder.encode(chunk))
              
              // Collect file data for database saving
              if (chunk.startsWith('data: ')) {
                try {
                  const chunkData = JSON.parse(chunk.slice(6))
                  if (chunkData.type === 'file') {
                    generatedFiles.push(chunkData.data)
                  } else if (chunkData.type === 'complete' && chunkData.data.description) {
                    aiResponseDescription = chunkData.data.description
                  }
                } catch (e) {
                  // Ignore parsing errors for non-JSON chunks
                }
              }
            }

            // Save generated files to database
            if (generatedFiles.length > 0) {
              try {
                // Delete existing files for this project
                await prisma.projectFile.deleteMany({
                  where: { projectId: project.id }
                })

                // Deduplicate files by path (keep the file with the most content)
                const uniqueFiles = new Map()
                generatedFiles.forEach(file => {
                  if (file && file.path && file.content !== undefined) {
                    const existingFile = uniqueFiles.get(file.path)
                    if (!existingFile || file.content.length > existingFile.content.length) {
                      uniqueFiles.set(file.path, file)
                    }
                  }
                })
                const deduplicatedFiles = Array.from(uniqueFiles.values())
                
                if (deduplicatedFiles.length === 0) {
                  await logger.warn('No valid files to save after deduplication', {
                    projectId: project.id,
                    originalFileCount: generatedFiles.length,
                    ...requestContext
                  })
                  return
                }

                // Create new files
                await prisma.projectFile.createMany({
                  data: deduplicatedFiles.map(file => ({
                    projectId: project.id,
                    path: file.path,
                    content: file.content,
                    type: file.type === 'IMAGE' ? 'OTHER' : file.type, // Map IMAGE to OTHER since it's not in FileType enum
                    size: file.content.length
                  }))
                })

                await logger.info('Files saved to database', {
                  projectId: project.id,
                  fileCount: deduplicatedFiles.length,
                  originalFileCount: generatedFiles.length,
                  ...requestContext
                })
              } catch (error) {
                await logger.error('Failed to save files to database', error as Error, {
                  projectId: project.id,
                  fileCount: generatedFiles.length,
                  ...requestContext
                })
              }
            }

            // Update project status to completed
            await prisma.project.update({
              where: { id: project.id },
              data: { status: 'COMPLETED' }
            })

            await prisma.projectGeneration.update({
              where: { id: generation.id },
              data: { 
                status: 'COMPLETED',
                response: aiResponseDescription // Store the AI response description
              }
            })

            await logger.info('Streaming generation completed', {
              projectId: project.id,
              generationId: generation.id,
              duration: Date.now() - startTime,
              ...requestContext
            })

          } catch (error) {
            // Update project status to failed
            await prisma.project.update({
              where: { id: project.id },
              data: { status: 'FAILED' }
            })

            await prisma.projectGeneration.update({
              where: { id: generation.id },
              data: { 
                status: 'FAILED',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            })

            const errorChunk = {
              type: 'error',
              data: {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'Generation failed'
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
          } finally {
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control',
        },
      })

    } catch (error) {
      await logger.error('Failed to create project for streaming', error as Error, {
        userId,
        provider,
        ...requestContext
      })
      throw error
    }

  } catch (error) {
    await logger.error('Streaming generation failed', error as Error, {
      duration: Date.now() - startTime,
      ...requestContext
    })
    
    return new Response(JSON.stringify({ 
      error: 'Generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
