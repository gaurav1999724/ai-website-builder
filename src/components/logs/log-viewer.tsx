'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Calendar,
  User,
  Globe,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  userId?: string
  endpoint?: string
  method?: string
  statusCode?: number
  error?: {
    name: string
    message: string
    stack: string
  }
  metadata?: any
  file: string
}

interface LogViewerProps {
  initialLogs?: LogEntry[]
  initialTotal?: number
}

export default function LogViewer({ initialLogs = [], initialTotal = 0 }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const limit = 50

  const fetchLogs = async (reset = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        level: selectedLevel,
        limit: limit.toString(),
        offset: reset ? '0' : offset.toString()
      })

      const response = await fetch(`/api/admin/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        if (reset) {
          setLogs(data.logs)
          setOffset(0)
        } else {
          setLogs(prev => [...prev, ...data.logs])
        }
        setTotal(data.total)
        setHasMore(data.hasMore)
        setOffset(prev => prev + limit)
      } else {
        toast.error('Failed to fetch logs')
      }
    } catch (error) {
      toast.error('Error fetching logs')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setOffset(0)
    fetchLogs(true)
  }

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level)
    setOffset(0)
    fetchLogs(true)
  }

  const downloadLogs = async (format: string) => {
    try {
      const params = new URLSearchParams({
        level: selectedLevel,
        format
      })

      const response = await fetch(`/api/admin/logs/download?${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Logs downloaded successfully')
      } else {
        toast.error('Failed to download logs')
      }
    } catch (error) {
      toast.error('Error downloading logs')
    }
  }

  const deleteLogs = async () => {
    if (!confirm('Are you sure you want to delete all logs? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Deleted ${data.deletedCount} log files`)
        setLogs([])
        setTotal(0)
        setOffset(0)
      } else {
        toast.error('Failed to delete logs')
      }
    } catch (error) {
      toast.error('Error deleting logs')
    }
  }

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

  const filteredLogs = logs.filter(log => 
    searchTerm === '' || 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.endpoint?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    fetchLogs(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Logs</h2>
          <p className="text-muted-foreground">
            Monitor and manage application logs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadLogs('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadLogs('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteLogs}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedLevel} onValueChange={handleLevelChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Logs ({filteredLogs.length} of {total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelBadgeVariant(log.level)}>
                        {log.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(new Date(log.timestamp))}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.file}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium">{log.message}</p>
                    {log.userId && (
                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {log.userId}
                        </span>
                        {log.endpoint && (
                          <span className="flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {log.method} {log.endpoint}
                          </span>
                        )}
                        {log.statusCode && (
                          <Badge variant="outline" className="text-xs">
                            {log.statusCode}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No logs found matching your criteria.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
          
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchLogs(false)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log Details</CardTitle>
            <CardDescription>
              Detailed information about the selected log entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Timestamp</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Level</label>
                    <div className="flex items-center space-x-2">
                      {getLevelIcon(selectedLog.level)}
                      <Badge variant={getLevelBadgeVariant(selectedLog.level)}>
                        {selectedLog.level}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">File</label>
                    <p className="text-sm text-muted-foreground">{selectedLog.file}</p>
                  </div>
                  {selectedLog.userId && (
                    <div>
                      <label className="text-sm font-medium">User ID</label>
                      <p className="text-sm text-muted-foreground">{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.endpoint && (
                    <div>
                      <label className="text-sm font-medium">Endpoint</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedLog.method} {selectedLog.endpoint}
                      </p>
                    </div>
                  )}
                  {selectedLog.statusCode && (
                    <div>
                      <label className="text-sm font-medium">Status Code</label>
                      <Badge variant="outline">{selectedLog.statusCode}</Badge>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                    {selectedLog.message}
                  </p>
                </div>

                {selectedLog.error && (
                  <div>
                    <label className="text-sm font-medium">Error Details</label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        {selectedLog.error.name}: {selectedLog.error.message}
                      </p>
                      {selectedLog.error.stack && (
                        <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap">
                          {selectedLog.error.stack}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <label className="text-sm font-medium">Metadata</label>
                    <pre className="text-xs mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="raw">
                <pre className="text-xs p-4 bg-muted rounded-lg whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
