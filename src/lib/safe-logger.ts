import { logger } from './logger'

// Simple logging wrapper that only logs in runtime and doesn't block operations
export const safeLog = {
  info: (message: string, data?: any) => {
    // Skip logging in Vercel production environment
    if (typeof window === 'undefined' && !(process.env.NODE_ENV === 'production' && process.env.VERCEL === '1')) {
      logger.info(message, data).catch(() => {})
    }
  },
  warn: (message: string, data?: any) => {
    // Skip logging in Vercel production environment
    if (typeof window === 'undefined' && !(process.env.NODE_ENV === 'production' && process.env.VERCEL === '1')) {
      logger.warn(message, data).catch(() => {})
    }
  },
  error: (message: string, error?: Error, data?: any) => {
    // Skip logging in Vercel production environment
    if (typeof window === 'undefined' && !(process.env.NODE_ENV === 'production' && process.env.VERCEL === '1')) {
      logger.error(message, error, data).catch(() => {})
    }
  },
  debug: (message: string, data?: any) => {
    // Skip logging in Vercel production environment
    if (typeof window === 'undefined' && !(process.env.NODE_ENV === 'production' && process.env.VERCEL === '1')) {
      logger.debug(message, data).catch(() => {})
    }
  }
}
