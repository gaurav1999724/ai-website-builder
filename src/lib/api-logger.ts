import { NextRequest, NextResponse } from 'next/server'
import { logger, extractRequestContext } from './logger'

export async function withApiLogging(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: {
    skipLogging?: boolean
    customLogMessage?: string
  }
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()
    const requestContext = extractRequestContext(request)
    
    // Extract additional context
    const method = request.method
    const url = new URL(request.url)
    const endpoint = url.pathname
    const searchParams = url.searchParams.toString()
    const fullEndpoint = searchParams ? `${endpoint}?${searchParams}` : endpoint

    // Get user info from headers if available
    const userId = request.headers.get('x-user-id') || undefined
    const sessionId = request.headers.get('x-session-id') || undefined

    const logContext = {
      ...requestContext,
      userId,
      sessionId,
      endpoint: fullEndpoint,
      method
    }

    let response: NextResponse
    let error: Error | undefined

    try {
      // Log the incoming request
      if (!options?.skipLogging) {
        await logger.info(
          options?.customLogMessage || `API Request: ${method} ${fullEndpoint}`,
          {
            method,
            endpoint: fullEndpoint,
            userAgent: requestContext.userAgent,
            ip: requestContext.ip
          },
          logContext
        )
      }

      // Execute the handler
      response = await handler(request, context)
      
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // Calculate duration
    const duration = Date.now() - startTime
    const statusCode = response.status

    // Log the response
    if (!options?.skipLogging) {
      await logger.logApiRequest(
        method,
        fullEndpoint,
        statusCode,
        duration,
        logContext,
        error
      )
    }

    // Add request ID to response headers
    if (requestContext.requestId) {
      response.headers.set('x-request-id', requestContext.requestId)
    }

    return response
  }
}

// Helper function to log specific API events
export async function logApiEvent(
  event: string,
  request: NextRequest,
  metadata?: Record<string, any>,
  error?: Error
) {
  const requestContext = extractRequestContext(request)
  const userId = request.headers.get('x-user-id') || undefined
  const sessionId = request.headers.get('x-session-id') || undefined

  const logContext = {
    ...requestContext,
    userId,
    sessionId,
    endpoint: new URL(request.url).pathname,
    method: request.method
  }

  if (error) {
    await logger.error(event, error, metadata, logContext)
  } else {
    await logger.info(event, metadata, logContext)
  }
}
