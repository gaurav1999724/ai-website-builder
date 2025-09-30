import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Simple logging wrapper that only logs in runtime
const safeLog = {
  info: (message: string, data?: any) => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      logger.info(message, data).catch(() => {})
    }
  },
  warn: (message: string, data?: any) => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      logger.warn(message, data).catch(() => {})
    }
  },
  error: (message: string, error?: Error, data?: any) => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      logger.error(message, error, data).catch(() => {})
    }
  }
}

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = signupSchema.parse(body)

    safeLog.info('User signup attempt', {
      email,
      name
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      safeLog.warn('Signup attempt with existing email', { email })
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    // Also create a session or handle immediate login if needed
    // For now, just return the user data

    safeLog.info('User created successfully', {
      userId: user.id,
      email: user.email,
      name: user.name
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    })

  } catch (error) {
    safeLog.error('Signup error', error as Error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
