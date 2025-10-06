import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWebsite, AIProvider, generateProjectTitle } from '@/lib/ai'
import { enhanceUserPrompt } from '@/lib/ai/prompt-enhancer'
import { logger, extractRequestContext } from '@/lib/logger'
import { formatDateOnly } from '@/lib/utils'
import { z } from 'zod'

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

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  provider: z.enum(['cerebras', 'openai', 'anthropic', 'gemini']).optional().default('cerebras'),
  title: z.string().optional(),
})

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
        await logger.info('Using admin user for unauthenticated project generation', {
          endpoint: '/api/projects/generate',
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
          await logger.info('Using fallback user for unauthenticated project generation', {
            endpoint: '/api/projects/generate',
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
    const { prompt, provider, title } = generateSchema.parse(body)

    // Enhance the user prompt for better results
    await logger.info('Enhancing user prompt', {
      originalPromptLength: prompt.length,
      provider,
      ...requestContext
    })

    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: 'create',
      projectType: 'website'
    })

    await logger.info('Prompt enhancement completed', {
      originalPromptLength: prompt.length,
      enhancedPromptLength: enhancedPrompt.length,
      enhancementRatio: enhancedPrompt.length / prompt.length,
      ...requestContext
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

      await logger.info('User verification passed', {
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

      await logger.info('Project created', {
        projectId: project.id,
        userId: userId,
        title: project.title,
        ...requestContext
      })

      // Create generation record
      generation = await prisma.projectGeneration.create({
        data: {
          projectId: project.id,
          prompt: prompt, // Use original user prompt, not enhanced
          aiProvider: provider.toUpperCase() as any, // Ensure uppercase for Prisma enum
          status: 'PROCESSING',
        },
      })

      await logger.info('Generation record created', {
        generationId: generation.id,
        projectId: project.id,
        provider,
        ...requestContext
      })

      try {
        // Generate website with AI using enhanced prompt
        const aiStartTime = Date.now()
        const aiResponse = await generateWebsite(enhancedPrompt, provider as AIProvider)
        const aiDuration = Date.now() - aiStartTime

        await logger.logAiGeneration(
          provider,
          enhancedPrompt,
          true,
          aiDuration,
          {
            userId: userId,
            projectId: project.id,
            ...requestContext
          }
        )

        // Update generation record
        await prisma.projectGeneration.update({
          where: { id: generation.id },
          data: {
            response: aiResponse.content, // Store just the description as plain string
            status: 'COMPLETED',
          },
        })

        // Use upsert to handle existing files properly
        const filePromises = aiResponse.files.map(async (file, index) => {
          try {
            // Validate file object has required properties
            if (!file || !file.path || !file.content) {
              throw new Error(`Invalid file object at index ${index}: missing required properties`)
            }
            
            // Determine file type from path if not provided
            let fileType = file.type || getFileTypeFromPath(file.path)
            
            // Normalize file type to match enum values
            const normalizedType = fileType.toLowerCase()
            if (normalizedType === 'md' || normalizedType === 'markdown') {
              fileType = 'MARKDOWN'
            } else if (normalizedType === 'html' || normalizedType === 'htm') {
              fileType = 'HTML'
            } else if (normalizedType === 'css') {
              fileType = 'CSS'
            } else if (normalizedType === 'js' || normalizedType === 'javascript') {
              fileType = 'JAVASCRIPT'
            } else if (normalizedType === 'ts' || normalizedType === 'typescript') {
              fileType = 'TYPESCRIPT'
            } else if (normalizedType === 'json') {
              fileType = 'JSON'
            } else if (normalizedType === 'jsx' || normalizedType === 'react') {
              fileType = 'REACT'
            } else if (normalizedType === 'vue') {
              fileType = 'VUE'
            } else if (normalizedType === 'angular') {
              fileType = 'ANGULAR'
            } else {
              // All other types (LICENSE, TXT, XML, etc.) map to OTHER
              fileType = 'OTHER'
            }
            
            // Use upsert to either create or update the file
            return await prisma.projectFile.upsert({
              where: {
                projectId_path: {
                  projectId: project.id,
                  path: file.path
                }
              },
              update: {
                content: file.content,
                type: fileType as any,
                size: file.content.length,
                updatedAt: new Date()
              },
              create: {
                projectId: project.id,
                path: file.path,
                content: file.content,
                type: fileType as any,
                size: file.content.length,
              },
            })
          } catch (error) {
            await logger.error(`Failed to upsert file ${index}: ${file?.path || 'unknown'}`, error as Error, {
              projectId: project.id,
              filePath: file?.path || 'unknown',
              fileType: file?.type || 'UNKNOWN',
              fileSize: file?.content?.length || 0,
              fileObject: JSON.stringify(file),
              ...requestContext
            })
            throw error
          }
        })

        // Wait for all files to be processed
        const processedFiles = await Promise.all(filePromises)

        // Get the list of file paths from the AI response
        const newFilePaths = aiResponse.files.map(file => file.path)

        // Remove any existing files that are not in the new response
        const deletedFiles = await prisma.projectFile.deleteMany({
          where: {
            projectId: project.id,
            path: {
              notIn: newFilePaths
            }
          }
        })

        await logger.info('Project files processed', {
          projectId: project.id,
          fileCount: processedFiles.length,
          deletedCount: deletedFiles.count,
          ...requestContext
        })

        // Update project status
        const description = aiResponse.content || 'Website generated successfully'
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'COMPLETED',
            description: description.length > 1000 ? description.substring(0, 1000) + '...' : description,
          },
        })

        // Add to project history
        await prisma.projectHistory.create({
          data: {
            projectId: project.id,
            action: 'GENERATED',
            details: `Website generated using ${provider} AI`,
          },
        })

        const totalDuration = Date.now() - startTime
        await logger.info('Project generation completed successfully', {
          projectId: project.id,
          userId: userId,
          totalDuration,
          fileCount: aiResponse.files.length,
          provider,
          ...requestContext
        })

        return NextResponse.json({
          success: true,
          project: {
            id: project.id,
            title: project.title,
            status: 'COMPLETED',
            files: aiResponse.files,
            metadata: aiResponse.metadata,
          },
        })

      } catch (aiError) {
        const aiDuration = Date.now() - startTime
        
        // Log AI generation failure
        await logger.logAiGeneration(
          provider,
          prompt,
          false,
          aiDuration,
          {
            userId: userId,
            projectId: project.id,
            ...requestContext
          },
          aiError instanceof Error ? aiError : new Error(String(aiError))
        )

        // Update generation record with error
        await prisma.projectGeneration.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            error: aiError instanceof Error ? aiError.message : 'Unknown error',
          },
        })

        // Update project status
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'FAILED',
          },
        })

        return NextResponse.json(
          { error: 'AI generation failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
          { status: 500 }
        )
      }

    } catch (error) {
      const duration = Date.now() - startTime
      
      if (error instanceof z.ZodError) {
        await logger.warn('Invalid request data for project generation', {
          errors: error.issues,
          userId: session?.user?.id,
          duration,
          ...requestContext
        })
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        )
      }

      // Log the error
      await logger.error('Project generation failed', error as Error, {
        projectId: project?.id,
        generationId: generation?.id,
        userId: session?.user?.id,
        provider,
        prompt: prompt?.substring(0, 100), // Log first 100 chars of prompt
        duration,
        ...requestContext
      })

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error('API route error', error as Error, {
      endpoint: '/api/projects/generate',
      method: 'POST',
      duration,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}