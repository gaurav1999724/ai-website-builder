import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: any = {
      userId: session.user.id,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { prompt: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          files: {
            select: {
              id: true,
              path: true,
              type: true,
              size: true,
            },
          },
          _count: {
            select: {
              files: true,
              generations: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Projects fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, prompt } = body

    // Verify the user exists before creating project
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, isActive: true }
    })

    if (!userExists) {
      console.error(`User with ID ${session.user.id} does not exist in database`)
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 400 }
      )
    }

    if (!userExists.isActive) {
      console.error(`User with ID ${session.user.id} is not active`)
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 400 }
      )
    }

    console.log('User verification passed:', {
      userId: session.user.id,
      userEmail: userExists.email,
      userActive: userExists.isActive
    })

    const project = await prisma.project.create({
      data: {
        title,
        description,
        prompt,
        userId: session.user.id,
        status: 'GENERATING',
      },
    })

    return NextResponse.json({ project })

  } catch (error) {
    console.error('Project creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
