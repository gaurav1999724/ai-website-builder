import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { extractRequestContext } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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
      await logger.info('Using test user for unauthenticated prompt enhancement', {
        endpoint: '/api/ai/enhance-prompt',
        testUserId: userId,
        ...requestContext
      })
    }

    const body = await request.json()
    const { prompt, context = 'website-modification', projectType = 'website' } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Prompt is required' 
      }, { status: 400 })
    }

    await logger.info('Enhancing user prompt', {
      originalPrompt: prompt,
      context,
      projectType,
      userId,
      ...requestContext
    })

    // Enhance the prompt using AI
    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: 'modify' as const,
      projectType,
      context
    })

    await logger.info('Prompt enhanced successfully', {
      originalPrompt: prompt,
      enhancedPrompt,
      userId,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      originalPrompt: prompt,
      enhancedPrompt,
      context,
      projectType
    })

  } catch (error) {
    await logger.error('Failed to enhance prompt', error as Error, {
      ...requestContext
    })
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to enhance prompt' 
    }, { status: 500 })
  }
}

async function enhanceUserPrompt(
  prompt: string, 
  options: {
    userIntent: 'create' | 'modify' | 'update'
    projectType: string
    context: string
  }
): Promise<string> {
  // Import the prompt enhancer
  const { enhanceUserPrompt: enhancePrompt } = await import('@/lib/ai/prompt-enhancer')
  
  return await enhancePrompt(prompt, options)
}
