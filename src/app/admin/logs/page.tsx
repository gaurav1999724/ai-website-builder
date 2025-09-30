'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LogViewer from '@/components/logs/log-viewer'
import { AlertCircle } from 'lucide-react'

export default function AdminLogsPage() {

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Log Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage application logs for debugging and system monitoring.
          </p>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>About Log Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This page allows you to view, search, and manage application logs. 
                Logs are automatically generated for various system events including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>User authentication and authorization</li>
                <li>API requests and responses</li>
                <li>Database operations</li>
                <li>AI generation requests</li>
                <li>System errors and warnings</li>
              </ul>
              <p className="pt-2">
                <strong>Note:</strong> Logs are stored locally and may be cleared during deployments. 
                For production monitoring, consider integrating with external logging services.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Log Viewer */}
        <LogViewer />
      </div>
    </div>
  )
}
