'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bug,
  TrendingUp,
  Clock,
  Users,
  Activity
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

interface LogStats {
  total: number
  error: number
  warn: number
  info: number
  debug: number
  recentLogs: Array<{
    timestamp: string
    level: string
    message: string
    userId?: string
  }>
}

export default function LogsDashboard() {
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    recentLogs: []
  })
  const [loading, setLoading] = useState(true)

  const fetchLogStats = async () => {
    try {
      const response = await fetch('/api/admin/logs?limit=10')
      const data = await response.json()

      if (data.success) {
        const logs = data.logs
        const errorCount = logs.filter((log: any) => log.level === 'ERROR').length
        const warnCount = logs.filter((log: any) => log.level === 'WARN').length
        const infoCount = logs.filter((log: any) => log.level === 'INFO').length
        const debugCount = logs.filter((log: any) => log.level === 'DEBUG').length

        setStats({
          total: data.total,
          error: errorCount,
          warn: warnCount,
          info: infoCount,
          debug: debugCount,
          recentLogs: logs.slice(0, 5)
        })
      }
    } catch (error) {
      console.error('Error fetching log stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogStats()
  }, [])

  const getLevelIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'WARN':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'DEBUG':
        return <Bug className="h-4 w-4 text-gray-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getLevelBadgeVariant = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'destructive'
      case 'WARN':
        return 'secondary'
      case 'INFO':
        return 'default'
      case 'DEBUG':
        return 'outline'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Loading log statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Logs</span>
            </CardTitle>
            <CardDescription>
              Monitor application logs and system health
            </CardDescription>
          </div>
          <Link href="/admin/logs">
            <Button variant="outline" size="sm">
              View All Logs
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Log Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-500">{stats.error}</span>
              </div>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-500">{stats.warn}</span>
              </div>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Info className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-500">{stats.info}</span>
              </div>
              <p className="text-sm text-muted-foreground">Info</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Bug className="h-5 w-5 text-gray-500" />
                <span className="text-2xl font-bold text-gray-500">{stats.debug}</span>
              </div>
              <p className="text-sm text-muted-foreground">Debug</p>
            </div>
          </div>

          {/* Recent Logs */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Recent Activity</span>
            </h4>
            <div className="space-y-2">
              {stats.recentLogs.length > 0 ? (
                stats.recentLogs.map((log, index) => (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelBadgeVariant(log.level)}>
                        {log.level}
                      </Badge>
                      <span className="text-sm truncate max-w-md">
                        {log.message}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {log.userId && (
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{log.userId.slice(0, 8)}...</span>
                        </span>
                      )}
                      <span>{formatRelativeTime(new Date(log.timestamp))}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent logs found</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total logs: <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogStats}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Link href="/admin/logs">
                <Button size="sm">
                  View All Logs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
