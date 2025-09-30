import { logger } from './logger'

// Simple logging wrapper that only logs in runtime and doesn't block operations
export const safeLog = {
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
  },
  debug: (message: string, data?: any) => {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      logger.debug(message, data).catch(() => {})
    }
  }
}
