'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import LogViewer from '@/components/logs/log-viewer'
import { AlertCircle, Shield } from 'lucide-react'

export default function AdminLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin
    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      setIsAuthorized(false)
      setLoading(false)
      return
    }

    setIsAuthorized(true)
    setLoading(false)
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Admin privileges are required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
