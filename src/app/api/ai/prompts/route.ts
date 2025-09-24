import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const type = searchParams.get('type')

    const whereClause: any = {
      isActive: true
    }

    if (provider) {
      whereClause.provider = provider.toUpperCase()
    }

    if (type) {
      whereClause.type = type.toUpperCase()
    }

    const prompts = await prisma.aIPrompt.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    })

    await logger.info('Fetched AI prompts', {
      provider,
      type,
      promptCount: prompts.length
    })

    return NextResponse.json({
      success: true,
      prompts
    })

  } catch (error) {
    await logger.error('Error fetching AI prompts', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch AI prompts' },
      { status: 500 }
    )
  }
}
