import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { safeLog } from '@/lib/safe-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logsDir = path.join(process.cwd(), 'logs')
    
    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({
        success: true,
        logs: [],
        total: 0,
        message: 'No logs directory found'
      })
    }

    let allLogs: any[] = []

    if (level === 'all') {
      // Get logs from all levels
      const levels = ['Error', 'Warn', 'Info', 'Debug']
      for (const logLevel of levels) {
        const levelDir = path.join(logsDir, logLevel)
        if (fs.existsSync(levelDir)) {
          const files = fs.readdirSync(levelDir)
          for (const file of files) {
            if (file.endsWith('.log')) {
              const filePath = path.join(levelDir, file)
              const content = fs.readFileSync(filePath, 'utf-8')
              const lines = content.split('\n').filter(line => line.trim())
              
              for (const line of lines) {
                try {
                  const logEntry = JSON.parse(line)
                  allLogs.push({
                    ...logEntry,
                    level: logLevel.toUpperCase(),
                    file: file
                  })
                } catch (e) {
                  // Skip malformed log entries
                }
              }
            }
          }
        }
      }
    } else {
      // Get logs from specific level
      const levelDir = path.join(logsDir, level.charAt(0).toUpperCase() + level.slice(1).toLowerCase())
      if (fs.existsSync(levelDir)) {
        const files = fs.readdirSync(levelDir)
        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(levelDir, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const lines = content.split('\n').filter(line => line.trim())
            
            for (const line of lines) {
              try {
                const logEntry = JSON.parse(line)
                allLogs.push({
                  ...logEntry,
                  level: level.toUpperCase(),
                  file: file
                })
              } catch (e) {
                // Skip malformed log entries
              }
            }
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    const total = allLogs.length
    const paginatedLogs = allLogs.slice(offset, offset + limit)

    safeLog.info('Admin fetched logs', {
      userId: session.user.id,
      level,
      total,
      returned: paginatedLogs.length
    })

    return NextResponse.json({
      success: true,
      logs: paginatedLogs,
      total,
      hasMore: offset + limit < total
    })

  } catch (error) {
    safeLog.error('Error fetching logs', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const olderThan = searchParams.get('olderThan') // days

    const logsDir = path.join(process.cwd(), 'logs')
    
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({
        success: true,
        message: 'No logs directory found'
      })
    }

    let deletedCount = 0
    const cutoffDate = olderThan ? new Date(Date.now() - parseInt(olderThan) * 24 * 60 * 60 * 1000) : null

    if (level) {
      // Delete specific level
      const levelDir = path.join(logsDir, level.charAt(0).toUpperCase() + level.slice(1).toLowerCase())
      if (fs.existsSync(levelDir)) {
        const files = fs.readdirSync(levelDir)
        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(levelDir, file)
            const stats = fs.statSync(filePath)
            
            if (!cutoffDate || stats.mtime < cutoffDate) {
              fs.unlinkSync(filePath)
              deletedCount++
            }
          }
        }
      }
    } else {
      // Delete all logs
      const levels = ['Error', 'Warn', 'Info', 'Debug']
      for (const logLevel of levels) {
        const levelDir = path.join(logsDir, logLevel)
        if (fs.existsSync(levelDir)) {
          const files = fs.readdirSync(levelDir)
          for (const file of files) {
            if (file.endsWith('.log')) {
              const filePath = path.join(levelDir, file)
              const stats = fs.statSync(filePath)
              
              if (!cutoffDate || stats.mtime < cutoffDate) {
                fs.unlinkSync(filePath)
                deletedCount++
              }
            }
          }
        }
      }
    }

    safeLog.info('Admin deleted logs', {
      userId: session.user.id,
      level,
      olderThan,
      deletedCount
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} log files`,
      deletedCount
    })

  } catch (error) {
    safeLog.error('Error deleting logs', error as Error)
    return NextResponse.json(
      { error: 'Failed to delete logs' },
      { status: 500 }
    )
  }
}
