import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWebsite, generateWebsiteModification, AIProvider } from '@/lib/ai'
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
        prompt,
        aiProvider: provider,
        status: 'PROCESSING',
      },
    })

    try {
      // Generate website with AI (modification or new generation)
      const aiResponse = isModification 
        ? await generateWebsiteModification(prompt, provider as AIProvider, currentFiles || [])
        : await generateWebsite(prompt, provider as AIProvider)

      // Update generation record
      await prisma.projectGeneration.update({
        where: { id: generation.id },
        data: {
          response: JSON.stringify(aiResponse),
          status: 'COMPLETED',
        },
      })

      // Update existing files or create new ones
      for (const file of aiResponse.files) {
        await prisma.projectFile.upsert({
          where: {
            projectId_path: {
              projectId: params.id,
              path: file.path,
            },
          },
          update: {
            content: file.content,
            type: file.type.toUpperCase() as any,
            size: file.content.length,
            updatedAt: new Date(),
          },
          create: {
            projectId: params.id,
            path: file.path,
            content: file.content,
            type: file.type.toUpperCase() as any,
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
        files: aiResponse.files,
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
