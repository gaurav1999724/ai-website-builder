'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Zap, 
  Play, 
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  Download,
  Globe,
  GitBranch,
  Settings,
  Activity,
  Shield,
  Cloud,
  Server,
  Database,
  Monitor,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Deployment {
  id: string
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
  platform: string
  url: string
  branch: string
  commit: string
  timestamp: Date
  duration?: number
  logs: string[]
}

interface DeploymentPlatform {
  id: string
  name: string
  icon: string
  description: string
  features: string[]
  pricing: string
  setupTime: string
}

const DEPLOYMENT_PLATFORMS: DeploymentPlatform[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    description: 'The fastest way to deploy your frontend applications',
    features: ['Automatic HTTPS', 'Global CDN', 'Serverless Functions', 'Preview Deployments'],
    pricing: 'Free tier available',
    setupTime: '2 minutes'
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: '🌐',
    description: 'Build, deploy, and scale modern web projects',
    features: ['Form Handling', 'Edge Functions', 'Split Testing', 'Branch Deploys'],
    pricing: 'Free tier available',
    setupTime: '3 minutes'
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    icon: '📄',
    description: 'Host static websites directly from your GitHub repository',
    features: ['Free Hosting', 'Custom Domains', 'HTTPS', 'Jekyll Support'],
    pricing: 'Free',
    setupTime: '5 minutes'
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    icon: '☁️',
    description: 'Scalable cloud storage with static website hosting',
    features: ['99.9% Uptime', 'Global CDN', 'Custom Domains', 'SSL/TLS'],
    pricing: 'Pay as you go',
    setupTime: '10 minutes'
  },
  {
    id: 'firebase',
    name: 'Firebase Hosting',
    icon: '🔥',
    description: 'Fast and secure web hosting for static and dynamic content',
    features: ['Global CDN', 'SSL Certificates', 'Custom Domains', 'Rollback Support'],
    pricing: 'Free tier available',
    setupTime: '5 minutes'
  }
]

export default function DeployPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [currentDeployment, setCurrentDeployment] = useState<Deployment | null>(null)
  const [deploymentProgress, setDeploymentProgress] = useState(0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [branch, setBranch] = useState('main')
  const [activeTab, setActiveTab] = useState('platforms')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    // Load existing deployments
    if (session?.user?.id) {
      loadDeployments()
    }
  }, [session, status, router])

  const loadDeployments = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/deploy`)
      if (response.ok) {
        const data = await response.json()
        
        // Transform deployment data to match the expected interface
        const transformedDeployments = (data.deployments || []).map((d: any) => ({
          id: d.id,
          status: d.status.toLowerCase(),
          platform: d.platform,
          url: d.url || '',
          branch: d.branch || 'main',
          commit: d.commit || 'abc123',
          timestamp: d.createdAt ? new Date(d.createdAt) : new Date(),
          logs: d.logs || [],
          duration: d.completedAt ? 
            new Date(d.completedAt).getTime() - new Date(d.createdAt).getTime() : 
            undefined
        }))
        
        setDeployments(transformedDeployments)
        
        // Debug logging
        console.log('Deployments loaded:', transformedDeployments)
        
        // Check if there's an active deployment
        const activeDeployment = data.deployments?.find((d: any) => 
          d.status === 'PENDING' || d.status === 'BUILDING' || d.status === 'DEPLOYING'
        )
        
        if (activeDeployment) {
          setCurrentDeployment({
            id: activeDeployment.id,
            status: activeDeployment.status.toLowerCase(),
            platform: activeDeployment.platform,
            url: activeDeployment.url,
            branch: activeDeployment.branch,
            commit: activeDeployment.commit,
            timestamp: activeDeployment.createdAt ? new Date(activeDeployment.createdAt) : new Date(),
            logs: activeDeployment.logs || [],
            duration: activeDeployment.completedAt ? 
              new Date(activeDeployment.completedAt).getTime() - new Date(activeDeployment.createdAt).getTime() : 
              undefined
          })
          setIsDeploying(true)
          setActiveTab('deployments')
        }
      }
    } catch (error) {
      console.error('Failed to load deployments:', error)
    }
  }

  const handleDeploy = async (platformId: string) => {
    setIsDeploying(true)
    setDeploymentProgress(0)
    
    // Switch to deployments tab immediately
    setActiveTab('deployments')
    
    const deployment: Deployment = {
      id: `deploy-${Date.now()}`,
      status: 'pending',
      platform: platformId,
      url: '',
      branch: branch,
      commit: 'abc123',
      timestamp: new Date(),
      logs: ['🚀 Starting deployment process...']
    }
    
    setCurrentDeployment(deployment)
    setDeployments(prev => [deployment, ...prev])

    try {
      // Call the actual deployment API
      const response = await fetch(`/api/projects/${params.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: platformId,
          branch: branch,
          customDomain: customDomain
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start deployment')
      }

      const result = await response.json()
      const deploymentId = result.deployment.id

      // Start polling for deployment status
      pollDeploymentStatus(deploymentId, platformId)
      
    } catch (error) {
      setCurrentDeployment(prev => prev ? { 
        ...prev, 
        status: 'failed',
        logs: [...(prev.logs || []), '❌ Failed to start deployment!', error instanceof Error ? error.message : 'Unknown error']
      } : null)
      toast.error('Deployment failed to start!')
      setIsDeploying(false)
    }
  }

  const pollDeploymentStatus = async (deploymentId: string, platformId: string) => {
    const maxAttempts = 30 // 5 minutes max
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/projects/${params.id}/deployments/${deploymentId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch deployment status')
        }

        const data = await response.json()
        const deployment = data.deployment

        // Update current deployment with latest status
        setCurrentDeployment(prev => prev ? {
          ...prev,
          status: deployment.status.toLowerCase(),
          logs: deployment.logs || [],
          url: deployment.url || '',
          timestamp: deployment.createdAt ? new Date(deployment.createdAt) : prev.timestamp,
          duration: deployment.completedAt ? 
            new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime() : 
            undefined
        } : null)

        // Update deployments list
        setDeployments(prev => prev.map(d => 
          d.id === deploymentId ? {
            ...d,
            status: deployment.status.toLowerCase(),
            logs: deployment.logs || [],
            url: deployment.url || '',
            timestamp: deployment.createdAt ? new Date(deployment.createdAt) : d.timestamp,
            duration: deployment.completedAt ? 
              new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime() : 
              undefined
          } : d
        ))

        // Update current deployment if it matches
        if (currentDeployment && currentDeployment.id === deploymentId) {
          setCurrentDeployment(prev => prev ? {
            ...prev,
            status: deployment.status.toLowerCase(),
            logs: deployment.logs || [],
            url: deployment.url || '',
            timestamp: deployment.createdAt ? new Date(deployment.createdAt) : prev.timestamp,
            duration: deployment.completedAt ? 
              new Date(deployment.completedAt).getTime() - new Date(deployment.createdAt).getTime() : 
              undefined
          } : null)
        }

        // Update progress based on status
        switch (deployment.status) {
          case 'PENDING':
            setDeploymentProgress(10)
            break
          case 'BUILDING':
            setDeploymentProgress(50)
            break
          case 'DEPLOYING':
            setDeploymentProgress(80)
            break
          case 'SUCCESS':
            setDeploymentProgress(100)
            setIsDeploying(false)
            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === platformId)
            toast.success(`Successfully deployed to ${platform?.name}!`)
            
            // Clear current deployment after 10 seconds to allow users to start new deployments
            setTimeout(() => {
              setCurrentDeployment(null)
            }, 10000)
            return
          case 'FAILED':
            setDeploymentProgress(0)
            setIsDeploying(false)
            toast.error('Deployment failed!')
            return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000) // Poll every 2 seconds
        } else {
          setIsDeploying(false)
          toast.error('Deployment timeout!')
        }

      } catch (error) {
        console.error('Error polling deployment status:', error)
        setIsDeploying(false)
        toast.error('Failed to check deployment status!')
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'building':
      case 'deploying':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'building':
      case 'deploying':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/projects/${params.id}`)}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
            
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <h1 className="text-xl font-semibold text-white">Deploy Project</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
              {deployments.length} Deployment{deployments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-400 font-medium">Preview Mode</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              This is a preview deployment system. Deployments generate local preview URLs that allow you to view your project. 
              In a production environment, this would deploy to actual hosting platforms.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-800 mb-6">
            <TabsTrigger value="platforms" className="text-gray-300 data-[state=active]:text-white">
              <Cloud className="h-4 w-4 mr-2" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="deployments" className="text-gray-300 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" />
              Deployments
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEPLOYMENT_PLATFORMS.map((platform) => (
                <Card 
                  key={platform.id} 
                  className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:bg-gray-750 ${
                    selectedPlatform === platform.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => setSelectedPlatform(platform.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{platform.icon}</div>
                        <div>
                          <CardTitle className="text-white">{platform.name}</CardTitle>
                          <CardDescription className="text-gray-400">
                            {platform.description}
                          </CardDescription>
                        </div>
                      </div>
                      {selectedPlatform === platform.id && (
                        <CheckCircle className="h-5 w-5 text-purple-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {platform.features.map((feature) => (
                            <Badge key={feature} variant="secondary" className="bg-gray-700 text-gray-300">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Setup Time:</span>
                        <span className="text-white">{platform.setupTime}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Pricing:</span>
                        <span className="text-white">{platform.pricing}</span>
                      </div>
                      
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeploy(platform.id)
                        }}
                        disabled={isDeploying}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Deploy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Deployments Tab */}
          <TabsContent value="deployments" className="space-y-6">
            {/* Current Deployment */}
            {currentDeployment && currentDeployment.timestamp && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Current Deployment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(currentDeployment.status)}
                        <span className="text-white font-medium">
                          {DEPLOYMENT_PLATFORMS.find(p => p.id === currentDeployment.platform)?.name}
                        </span>
                        <Badge className={getStatusColor(currentDeployment.status)}>
                          {currentDeployment.status}
                        </Badge>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {currentDeployment.timestamp ? currentDeployment.timestamp.toLocaleTimeString() : 'Unknown time'}
                      </span>
                    </div>
                    
                    <Progress value={deploymentProgress} className="w-full" />
                    
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Deployment Logs</h4>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {currentDeployment.logs.map((log, index) => (
                          <div key={index} className="text-sm text-gray-400 font-mono flex items-start space-x-2">
                            <span className="text-gray-600 text-xs mt-0.5 flex-shrink-0">
                              {new Date().toLocaleTimeString()}
                            </span>
                            <span className="flex-1">
                              {log}
                            </span>
                          </div>
                        ))}
                        {isDeploying && (
                          <div className="text-sm text-blue-400 font-mono flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                            <span>Deployment in progress...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {currentDeployment.status === 'success' && (
                      <div className="space-y-4">
                        {currentDeployment.url ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-green-400 font-medium">Deployment Successful!</span>
                              </div>
                              <p className="text-gray-300 text-sm mb-3">
                                Your website preview is now available at:
                              </p>
                              <div className="flex items-center space-x-2 p-2 bg-gray-800 rounded border">
                                <code className="text-blue-400 text-sm flex-1">{currentDeployment.url}</code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(currentDeployment.url)
                                    toast.success('URL copied to clipboard!')
                                  }}
                                  className="text-gray-400 hover:text-white"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <Button
                                onClick={() => window.open(currentDeployment.url, '_blank')}
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Preview
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(currentDeployment.url)
                                  toast.success('URL copied to clipboard!')
                                }}
                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy URL
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setCurrentDeployment(null)}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Clear
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                              <span className="text-yellow-400 font-medium">Deployment Complete</span>
                            </div>
                            <p className="text-gray-300 text-sm">
                              Deployment finished successfully, but the URL is not available yet. Please check back in a few minutes.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {currentDeployment.status === 'failed' && (
                      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span className="text-red-400 font-medium">Deployment Failed</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          The deployment encountered an error. Please check the logs above and try again.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const platform = DEPLOYMENT_PLATFORMS.find(p => p.id === currentDeployment.platform)
                            if (platform) {
                              handleDeploy(platform.id)
                            }
                          }}
                          className="mt-3 border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Retry Deployment
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deployment History */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Deployment History</CardTitle>
                <CardDescription className="text-gray-400">
                  Previous deployments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deployments.length === 0 ? (
                  <div className="text-center py-8">
                    <Cloud className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No deployments yet</p>
                    <p className="text-gray-500 text-sm">Deploy your project to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deployments.map((deployment) => (
                      <div key={deployment.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(deployment.status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {DEPLOYMENT_PLATFORMS.find(p => p.id === deployment.platform)?.name}
                              </span>
                              <Badge className={getStatusColor(deployment.status)}>
                                {deployment.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-400">
                              {deployment.branch} • {deployment.commit} • {deployment.timestamp ? deployment.timestamp.toLocaleString() : 'Unknown time'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {deployment.url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(deployment.url, '_blank')}
                                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(deployment.url)
                                  toast.success('Deployment URL copied to clipboard!')
                                }}
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {deployment.status === 'success' && !deployment.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="border-gray-700 text-gray-500"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              URL Not Available
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <GitBranch className="h-5 w-5 mr-2" />
                    Git Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure your Git repository settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Branch</Label>
                    <Input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="main"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Repository URL</Label>
                    <Input
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="https://github.com/username/repo"
                      disabled
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Domain Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure custom domain and SSL settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Custom Domain</Label>
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="example.com"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-300">SSL Certificate</Label>
                    <Badge className="bg-green-500">Auto-enabled</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-300">CDN</Label>
                    <Badge className="bg-blue-500">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
