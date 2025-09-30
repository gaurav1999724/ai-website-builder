import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { safeLog } from '@/lib/safe-logger'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    console.log('Signup API called')
    
    const body = await request.json()
    console.log('Request body received:', { 
      name: body.name ? 'provided' : 'missing',
      email: body.email ? 'provided' : 'missing',
      password: body.password ? 'provided' : 'missing'
    })
    
    const { name, email, password } = signupSchema.parse(body)
    console.log('Validation passed for:', { name, email })

    safeLog.info('User signup attempt', {
      email,
      name
    })

    // Check if user already exists
    console.log('Checking if user exists for email:', email)
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('User already exists:', email)
      safeLog.warn('Signup attempt with existing email', { email })
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    console.log('Hashing password...')
    const hashedPassword = await hash(password, 12)
    console.log('Password hashed successfully')

    // Create user
    console.log('Creating user in database...')
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })
    console.log('User created successfully:', { id: user.id, email: user.email })

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
    // Log error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Always log to console in production for Vercel logs
    console.error('Signup error:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    
    // Also use safeLog for local development
    safeLog.error('Signup error', error as Error)
    
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    // Log specific error types for better debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}
