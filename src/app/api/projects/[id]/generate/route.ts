import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWebsite, generateWebsiteModification, AIProvider } from '@/lib/ai'
import { enhanceUserPrompt } from '@/lib/ai/prompt-enhancer'
import { sortFilesByPriority } from '@/lib/utils'
import { z } from 'zod'

const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  provider: z.enum(['cerebras', 'openai', 'anthropic', 'gemini']).optional().default('cerebras'),
  isModification: z.boolean().optional().default(false),
  currentFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.string()
  })).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, provider, isModification, currentFiles } = generateSchema.parse(body)

    // Enhance the user prompt for better results
    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: isModification ? 'modify' : 'update',
      projectType: 'website',
      currentFiles: currentFiles || []
    })

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create generation record
    const generation = await prisma.projectGeneration.create({
      data: {
        projectId: params.id,
        prompt: prompt, // Use original user prompt, not enhanced
        aiProvider: provider.toUpperCase() as any, // Ensure uppercase for Prisma enum
        status: 'PROCESSING',
      },
    })

    try {
      // Generate website with AI (modification or new generation) using enhanced prompt
      const aiResponse = isModification 
        ? await generateWebsiteModification(enhancedPrompt, provider as AIProvider, currentFiles || [])
        : await generateWebsite(enhancedPrompt, provider as AIProvider)

      // Update generation record
      await prisma.projectGeneration.update({
        where: { id: generation.id },
        data: {
          response: JSON.stringify(aiResponse),
          status: 'COMPLETED',
        },
      })

      // Update existing files or create new ones with deduplication
      const uniqueFiles = new Map()
      aiResponse.files.forEach(file => {
        if (file && file.path && file.content !== undefined) {
          const existingFile = uniqueFiles.get(file.path)
          if (!existingFile || file.content.length > existingFile.content.length) {
            uniqueFiles.set(file.path, file)
          }
        }
      })
      const deduplicatedFiles = Array.from(uniqueFiles.values())

      for (const file of deduplicatedFiles) {
        await prisma.projectFile.upsert({
          where: {
            projectId_path: {
              projectId: params.id,
              path: file.path,
            },
          },
          update: {
            content: file.content,
            type: file.type === 'IMAGE' ? 'OTHER' : file.type.toUpperCase() as any,
            size: file.content.length,
            updatedAt: new Date(),
          },
          create: {
            projectId: params.id,
            path: file.path,
            content: file.content,
            type: file.type === 'IMAGE' ? 'OTHER' : file.type.toUpperCase() as any,
            size: file.content.length,
          },
        })
      }

      // Update project status
      await prisma.project.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          description: aiResponse.content,
        },
      })

      // Add to project history
      await prisma.projectHistory.create({
        data: {
          projectId: params.id,
          action: 'UPDATED',
          details: `Project updated with new prompt: ${prompt}`,
        },
      })

      return NextResponse.json({
        success: true,
        content: aiResponse.content,
        files: sortFilesByPriority(aiResponse.files),
        metadata: aiResponse.metadata,
      })

    } catch (aiError) {
      // Update generation record with error
      await prisma.projectGeneration.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
        },
      })

      return NextResponse.json(
        { error: 'AI generation failed', details: aiError instanceof Error ? aiError.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Project generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
