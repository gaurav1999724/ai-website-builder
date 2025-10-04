import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'
import { z } from 'zod'
import { AIProvider } from '@prisma/client'

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  provider: z.enum(['cerebras', 'openai', 'anthropic', 'gemini']).optional().default('cerebras'),
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

// Streaming AI modification function
async function* streamAIModification(prompt: string, provider: AIProvider, currentFiles: any[]) {
  // Simulate streaming by breaking the modification into chunks
  const chunks = [
    { type: 'status', data: { status: 'Analyzing current project...', progress: 10 } },
    { type: 'status', data: { status: 'Understanding modification request...', progress: 25 } },
    { type: 'status', data: { status: 'Connecting to AI API...', progress: 40 } },
    { type: 'status', data: { status: 'Generating modifications...', progress: 60 } },
    { type: 'status', data: { status: 'Updating project files...', progress: 80 } },
    { type: 'status', data: { status: 'Finalizing changes...', progress: 95 } },
  ]

  // Send status updates
  for (const chunk of chunks) {
    yield `data: ${JSON.stringify(chunk)}\n\n`
    await new Promise(resolve => setTimeout(resolve, 400)) // Simulate processing time
  }

  // Now generate the actual modifications
  try {
    const { generateWebsiteModification } = await import('@/lib/ai')
    const aiResponse = await generateWebsiteModification(prompt, provider.toLowerCase() as any, currentFiles)
    
    // Stream the modified files one by one
    for (let i = 0; i < aiResponse.files.length; i++) {
      const file = aiResponse.files[i]
      const fileChunk = {
        type: 'file',
        data: {
          path: file.path,
          content: file.content,
          type: getFileTypeFromPath(file.path),
          index: i,
          total: aiResponse.files.length,
          isModification: true
        }
      }
      yield `data: ${JSON.stringify(fileChunk)}\n\n`
      await new Promise(resolve => setTimeout(resolve, 150)) // Small delay between files
    }

    // Send completion
    const completionChunk = {
      type: 'complete',
      data: {
        status: 'Project modified successfully!',
        progress: 100,
        totalFiles: aiResponse.files.length,
        metadata: aiResponse.metadata
      }
    }
    yield `data: ${JSON.stringify(completionChunk)}\n\n`

  } catch (error) {
    const errorChunk = {
      type: 'error',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'Modification failed'
      }
    }
    yield `data: ${JSON.stringify(errorChunk)}\n\n`
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      await logger.info('Using test user for unauthenticated streaming modification', {
        endpoint: '/api/projects/[id]/generate/stream',
        method: 'POST',
        testUserId: userId,
        projectId: params.id,
        ...requestContext
      })
    }

    const body = await request.json()
    const { prompt, provider } = generateSchema.parse(body)

    // Get the existing project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: userId
      },
      include: {
        files: true
      }
    })

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Enhance the user prompt for better results
    const { enhanceUserPrompt } = await import('@/lib/ai/prompt-enhancer')
    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: 'modify',
      projectType: 'website'
    })

    // Convert project files to the format expected by AI
    const currentFiles = project.files.map(file => ({
      path: file.path,
      content: file.content,
      type: file.type
    }))

    let generation: any

    try {
      // Create generation record
      generation = await prisma.projectGeneration.create({
        data: {
          projectId: project.id,
          prompt: prompt, // Use original user prompt, not enhanced
          aiProvider: provider.toUpperCase() as any, // Ensure uppercase for Prisma enum
          status: 'PROCESSING',
        },
      })

      await logger.info('Streaming modification started', {
        projectId: project.id,
        generationId: generation.id,
        userId: userId,
        provider,
        currentFileCount: currentFiles.length,
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
                title: project.title,
                isModification: true
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(projectInfo)}\n\n`))

            // Stream the AI modification and collect files
            const modifiedFiles: any[] = []
            for await (const chunk of streamAIModification(enhancedPrompt, provider as AIProvider, currentFiles)) {
              controller.enqueue(encoder.encode(chunk))
              
              // Collect file data for database saving
              if (chunk.startsWith('data: ')) {
                try {
                  const chunkData = JSON.parse(chunk.slice(6))
                  if (chunkData.type === 'file') {
                    modifiedFiles.push(chunkData.data)
                  }
                } catch (e) {
                  // Ignore parsing errors for non-JSON chunks
                }
              }
            }

            // Save modified files to database
            if (modifiedFiles.length > 0) {
              try {
                // Delete existing files for this project
                await prisma.projectFile.deleteMany({
                  where: { projectId: project.id }
                })

                // Deduplicate files by path (keep the file with the most content)
                const uniqueFiles = new Map()
                modifiedFiles.forEach(file => {
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
                    originalFileCount: modifiedFiles.length,
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

                await logger.info('Modified files saved to database', {
                  projectId: project.id,
                  fileCount: deduplicatedFiles.length,
                  originalFileCount: modifiedFiles.length,
                  ...requestContext
                })
              } catch (error) {
                await logger.error('Failed to save modified files to database', error as Error, {
                  projectId: project.id,
                  fileCount: modifiedFiles.length,
                  ...requestContext
                })
              }
            }

            // Update generation status to completed
            await prisma.projectGeneration.update({
              where: { id: generation.id },
              data: { status: 'COMPLETED' }
            })

            await logger.info('Streaming modification completed', {
              projectId: project.id,
              generationId: generation.id,
              duration: Date.now() - startTime,
              ...requestContext
            })

          } catch (error) {
            // Update generation status to failed
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
                status: 'Modification failed'
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
      await logger.error('Failed to create generation record for streaming', error as Error, {
        projectId: params.id,
        userId,
        provider,
        ...requestContext
      })
      throw error
    }

  } catch (error) {
    await logger.error('Streaming modification failed', error as Error, {
      projectId: params.id,
      duration: Date.now() - startTime,
      ...requestContext
    })
    
    return new Response(JSON.stringify({ 
      error: 'Modification failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
