import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Fetch prompt history from ProjectGeneration table
    const generations = await prisma.projectGeneration.findMany({
      where: {
        projectId: params.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Transform the data to match the frontend format
    const promptHistory = generations.map((gen) => {
      let aiResponse = null
      let status: 'success' | 'failed' | 'pending' = 'pending'
      
      if (gen.status === 'COMPLETED' && gen.response) {
        try {
          const responseData = JSON.parse(gen.response)
          aiResponse = responseData.content
          status = 'success'
        } catch (error) {
          console.error('Error parsing AI response:', error)
        }
      } else if (gen.status === 'FAILED') {
        status = 'failed'
        aiResponse = gen.error
      } else if (gen.status === 'PROCESSING') {
        status = 'pending'
      }

      return {
        id: gen.id,
        prompt: gen.prompt,
        type: 'update' as const, // All modifications are updates
        timestamp: new Date(gen.createdAt),
        status,
        aiResponse,
      }
    })

    return NextResponse.json({
      success: true,
      history: promptHistory,
    })

  } catch (error) {
    console.error('Error fetching prompt history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt history' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Delete all prompt history for this project
    await prisma.projectGeneration.deleteMany({
      where: {
        projectId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Prompt history cleared successfully',
    })

  } catch (error) {
    console.error('Error clearing prompt history:', error)
    return NextResponse.json(
      { error: 'Failed to clear prompt history' },
      { status: 500 }
    )
  }
}
