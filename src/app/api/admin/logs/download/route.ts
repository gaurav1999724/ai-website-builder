import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { safeLog } from '@/lib/safe-logger'

export async function GET(request: NextRequest) {
  try {
    // Public access - no authentication required

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const format = searchParams.get('format') || 'json' // json, csv, txt

    const logsDir = path.join(process.cwd(), 'logs')
    
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ error: 'No logs directory found' }, { status: 404 })
    }

    let allLogs: any[] = []

    if (level) {
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
    } else {
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
    }

    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    let content = ''
    let contentType = 'application/json'
    let filename = `logs-${new Date().toISOString().split('T')[0]}.json`

    switch (format) {
      case 'csv':
        // Convert to CSV
        if (allLogs.length > 0) {
          const headers = ['timestamp', 'level', 'message', 'userId', 'endpoint', 'method', 'statusCode']
          content = headers.join(',') + '\n'
          content += allLogs.map(log => 
            headers.map(header => {
              const value = log[header] || ''
              return `"${String(value).replace(/"/g, '""')}"`
            }).join(',')
          ).join('\n')
        }
        contentType = 'text/csv'
        filename = `logs-${new Date().toISOString().split('T')[0]}.csv`
        break
      
      case 'txt':
        // Convert to plain text
        content = allLogs.map(log => 
          `[${log.timestamp}] ${log.level}: ${log.message}${log.userId ? ` (User: ${log.userId})` : ''}${log.endpoint ? ` (${log.method} ${log.endpoint})` : ''}`
        ).join('\n')
        contentType = 'text/plain'
        filename = `logs-${new Date().toISOString().split('T')[0]}.txt`
        break
      
      default:
        // JSON format
        content = JSON.stringify(allLogs, null, 2)
        contentType = 'application/json'
        filename = `logs-${new Date().toISOString().split('T')[0]}.json`
    }

    safeLog.info('Public access - logs downloaded', {
      level,
      format,
      count: allLogs.length
    })

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(content).toString()
      }
    })

  } catch (error) {
    safeLog.error('Error downloading logs', error as Error)
    return NextResponse.json(
      { error: 'Failed to download logs' },
      { status: 500 }
    )
  }
}
