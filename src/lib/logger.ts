import fs from 'fs'
import path from 'path'

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  error?: Error
  metadata?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
  endpoint?: string
  method?: string
  userAgent?: string
  ip?: string
}

class Logger {
  private logDir: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxFiles: number = 5

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.ensureLogDirectory()
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`)
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        }
      }),
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.endpoint && { endpoint: entry.endpoint }),
      ...(entry.method && { method: entry.method }),
      ...(entry.userAgent && { userAgent: entry.userAgent }),
      ...(entry.ip && { ip: entry.ip })
    }

    return JSON.stringify(baseLog) + '\n'
  }

  private async writeToFile(fileName: string, content: string): Promise<void> {
    try {
      // Check if file exists and rotate if needed
      if (fs.existsSync(fileName)) {
        const stats = fs.statSync(fileName)
        if (stats.size > this.maxFileSize) {
          await this.rotateLogFile(fileName)
        }
      }

      fs.appendFileSync(fileName, content)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private async rotateLogFile(fileName: string): Promise<void> {
    try {
      const baseName = path.basename(fileName, '.log')
      const dir = path.dirname(fileName)

      // Rotate existing files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`)
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`)
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile) // Delete the oldest file
          } else {
            fs.renameSync(oldFile, newFile)
          }
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(dir, `${baseName}.1.log`)
      fs.renameSync(fileName, rotatedFile)
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      endpoint?: string
      method?: string
      userAgent?: string
      ip?: string
    }
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      error,
      metadata,
      ...context
    }
  }

  async error(
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      endpoint?: string
      method?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.ERROR, message, error, metadata, context)
    const logContent = this.formatLogEntry(entry)
    
    await this.writeToFile(this.getLogFileName(LogLevel.ERROR), logContent)
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${entry.timestamp}] ERROR: ${message}`, error, metadata)
    }
  }

  async warn(
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      endpoint?: string
      method?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.WARN, message, undefined, metadata, context)
    const logContent = this.formatLogEntry(entry)
    
    await this.writeToFile(this.getLogFileName(LogLevel.WARN), logContent)
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${entry.timestamp}] WARN: ${message}`, metadata)
    }
  }

  async info(
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      endpoint?: string
      method?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.INFO, message, undefined, metadata, context)
    const logContent = this.formatLogEntry(entry)
    
    await this.writeToFile(this.getLogFileName(LogLevel.INFO), logContent)
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`[${entry.timestamp}] INFO: ${message}`, metadata)
    }
  }

  async debug(
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      endpoint?: string
      method?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, undefined, metadata, context)
    const logContent = this.formatLogEntry(entry)
    
    await this.writeToFile(this.getLogFileName(LogLevel.DEBUG), logContent)
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${entry.timestamp}] DEBUG: ${message}`, metadata)
    }
  }

  // Specialized logging methods for common scenarios
  async logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      userAgent?: string
      ip?: string
    },
    error?: Error
  ): Promise<void> {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const message = `API Request: ${method} ${endpoint} - ${statusCode} (${duration}ms)`
    
    const metadata = {
      method,
      endpoint,
      statusCode,
      duration,
      ...context
    }

    if (error) {
      await this.error(message, error, metadata, context)
    } else {
      await this.info(message, metadata, context)
    }
  }

  async logAiGeneration(
    provider: string,
    prompt: string,
    success: boolean,
    duration: number,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      projectId?: string
    },
    error?: Error
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    const message = `AI Generation: ${provider} - ${success ? 'Success' : 'Failed'} (${duration}ms)`
    
    const metadata = {
      provider,
      promptLength: prompt.length,
      success,
      duration,
      ...context
    }

    if (error) {
      await this.error(message, error, metadata, context)
    } else {
      await this.info(message, metadata, context)
    }
  }

  async logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    duration: number,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
    },
    error?: Error
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    const message = `Database: ${operation} on ${table} - ${success ? 'Success' : 'Failed'} (${duration}ms)`
    
    const metadata = {
      operation,
      table,
      success,
      duration,
      ...context
    }

    if (error) {
      await this.error(message, error, metadata, context)
    } else {
      await this.info(message, metadata, context)
    }
  }

  async logAuthentication(
    action: string,
    success: boolean,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      provider?: string
      userAgent?: string
      ip?: string
    },
    error?: Error
  ): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.WARN
    const message = `Authentication: ${action} - ${success ? 'Success' : 'Failed'}`
    
    const metadata = {
      action,
      success,
      ...context
    }

    if (error) {
      await this.error(message, error, metadata, context)
    } else {
      await this.info(message, metadata, context)
    }
  }
}

// Create singleton instance
export const logger = new Logger()

// Utility function to extract request context
export function extractRequestContext(request: Request): {
  userAgent?: string
  ip?: string
  requestId?: string
} {
  const userAgent = request.headers.get('user-agent') || undefined
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const requestId = request.headers.get('x-request-id') || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  return {
    userAgent,
    ip,
    requestId
  }
}

// Error boundary helper
export function logError(error: Error, context?: Record<string, any>): void {
  logger.error('Unhandled error', error, context).catch(console.error)
}

// Global error handlers
if (typeof window === 'undefined') {
  // Server-side error handlers
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error).catch(console.error)
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', new Error(String(reason)), {
      promise: promise.toString()
    }).catch(console.error)
  })
} else {
  // Client-side error handlers
  window.addEventListener('error', (event) => {
    logger.error('Client Error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }).catch(console.error)
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Client Unhandled Rejection', new Error(String(event.reason)), {
      promise: event.promise.toString()
    }).catch(console.error)
  })
}
