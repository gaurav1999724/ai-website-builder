import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { z } from "zod"
import { logger } from "@/lib/logger"

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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authProviders = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ] : []),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  ] : []),
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      try {
        const { email, password } = loginSchema.parse(credentials)

        // Log authentication attempt (non-blocking)
        safeLog.info('Attempting credentials authentication', {
          email,
          hasPassword: !!password
        })

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            role: true,
            isActive: true
          }
        })

        if (!user) {
          safeLog.warn('User not found during authentication', { email })
          return null
        }

        if (!user.password) {
          safeLog.warn('User has no password set', { 
            email, 
            userId: user.id 
          })
          return null
        }

        const isPasswordValid = await compare(password, user.password)

        if (!isPasswordValid) {
          safeLog.warn('Invalid password provided', { 
            email, 
            userId: user.id 
          })
          return null
        }

        // Check if user is active
        if (!user.isActive) {
          safeLog.warn('User account is inactive', { 
            email, 
            userId: user.id 
          })
          return null
        }

        safeLog.info('Credentials authentication successful', {
          email,
          userId: user.id
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isActive: user.isActive,
        }
      } catch (error) {
        // Log error but don't let it block authentication
        safeLog.error('Credentials authentication failed', error as Error, {
          email: credentials?.email
        })
        
        // Return null for any authentication failure
        return null
      }
    }
  })
]
