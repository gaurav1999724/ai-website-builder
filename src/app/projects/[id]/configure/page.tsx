'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Settings, 
  Save, 
  Download,
  Play,
  CheckCircle,
  AlertCircle,
  Info,
  Package,
  Globe,
  Database,
  Shield,
  Zap,
  Code,
  FileText,
  GitBranch,
  Cloud,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'

interface BuildConfig {
  buildTool: 'vite' | 'webpack' | 'parcel' | 'rollup'
  framework: 'react' | 'vue' | 'angular' | 'vanilla'
  bundler: 'esbuild' | 'swc' | 'babel'
  outputDir: string
  publicPath: string
  minify: boolean
  sourceMap: boolean
  hotReload: boolean
}

interface DeployConfig {
  platform: 'vercel' | 'netlify' | 'github-pages' | 'aws' | 'firebase'
  domain: string
  customDomain: string
  environment: 'production' | 'staging' | 'development'
  buildCommand: string
  outputDirectory: string
  nodeVersion: string
  environmentVariables: Record<string, string>
}

export default function ConfigurePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [buildConfig, setBuildConfig] = useState<BuildConfig>({
    buildTool: 'vite',
    framework: 'vanilla',
    bundler: 'esbuild',
    outputDir: 'dist',
    publicPath: '/',
    minify: true,
    sourceMap: false,
    hotReload: true
  })
  
  const [deployConfig, setDeployConfig] = useState<DeployConfig>({
    platform: 'vercel',
    domain: '',
    customDomain: '',
    environment: 'production',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    nodeVersion: '18',
    environmentVariables: {}
  })

  const [envVars, setEnvVars] = useState<Array<{key: string, value: string}>>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const handleBuildConfigChange = (key: keyof BuildConfig, value: any) => {
    setBuildConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleDeployConfigChange = (key: keyof DeployConfig, value: any) => {
    setDeployConfig(prev => ({ ...prev, [key]: value }))
  }

  const addEnvVar = () => {
    setEnvVars(prev => [...prev, { key: '', value: '' }])
  }

  const updateEnvVar = (index: number, key: string, value: string) => {
    setEnvVars(prev => prev.map((item, i) => 
      i === index ? { key, value } : item
    ))
  }

  const removeEnvVar = (index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveConfig = async () => {
    setLoading(true)
    try {
      // Convert env vars array to object
      const envVarsObj = envVars.reduce((acc, { key, value }) => {
        if (key.trim()) acc[key.trim()] = value.trim()
        return acc
      }, {} as Record<string, string>)

      const config = {
        build: buildConfig,
        deploy: { ...deployConfig, environmentVariables: envVarsObj }
      }

      // Here you would typically save to your API
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Configuration saved successfully!')
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateConfig = () => {
    const config = {
      build: buildConfig,
      deploy: { ...deployConfig, environmentVariables: envVars.reduce((acc, { key, value }) => {
        if (key.trim()) acc[key.trim()] = value.trim()
        return acc
      }, {} as Record<string, string>) }
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project-config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Configuration file downloaded!')
  }

  const handleTestBuild = async () => {
    setLoading(true)
    try {
      // Simulate build process
      await new Promise(resolve => setTimeout(resolve, 3000))
      toast.success('Build test completed successfully!')
    } catch (error) {
      toast.error('Build test failed')
    } finally {
      setLoading(false)
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
              <Settings className="h-5 w-5 text-green-500" />
              <h1 className="text-xl font-semibold text-white">Project Configuration</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleTestBuild}
              disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Play className="h-4 w-4 mr-2" />
              Test Build
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateConfig}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Config
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="build" className="w-full">
          <TabsList className="bg-gray-800 mb-6">
            <TabsTrigger value="build" className="text-gray-300 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              Build Tools
            </TabsTrigger>
            <TabsTrigger value="deploy" className="text-gray-300 data-[state=active]:text-white">
              <Cloud className="h-4 w-4 mr-2" />
              Deployment
            </TabsTrigger>
            <TabsTrigger value="env" className="text-gray-300 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />
              Environment
            </TabsTrigger>
          </TabsList>

          {/* Build Tools Tab */}
          <TabsContent value="build" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Build Tool Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Build Tool
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Choose your preferred build tool and framework
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Build Tool</Label>
                    <select
                      value={buildConfig.buildTool}
                      onChange={(e) => handleBuildConfigChange('buildTool', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="vite">Vite</option>
                      <option value="webpack">Webpack</option>
                      <option value="parcel">Parcel</option>
                      <option value="rollup">Rollup</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Framework</Label>
                    <select
                      value={buildConfig.framework}
                      onChange={(e) => handleBuildConfigChange('framework', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="vanilla">Vanilla JS</option>
                      <option value="react">React</option>
                      <option value="vue">Vue.js</option>
                      <option value="angular">Angular</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Bundler</Label>
                    <select
                      value={buildConfig.bundler}
                      onChange={(e) => handleBuildConfigChange('bundler', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="esbuild">ESBuild</option>
                      <option value="swc">SWC</option>
                      <option value="babel">Babel</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Build Options */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Build Options
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure build output and optimization settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Output Directory</Label>
                    <Input
                      value={buildConfig.outputDir}
                      onChange={(e) => handleBuildConfigChange('outputDir', e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="dist"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Public Path</Label>
                    <Input
                      value={buildConfig.publicPath}
                      onChange={(e) => handleBuildConfigChange('publicPath', e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="/"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Minify Output</Label>
                      <input
                        type="checkbox"
                        checked={buildConfig.minify}
                        onChange={(e) => handleBuildConfigChange('minify', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Generate Source Maps</Label>
                      <input
                        type="checkbox"
                        checked={buildConfig.sourceMap}
                        onChange={(e) => handleBuildConfigChange('sourceMap', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300">Hot Reload</Label>
                      <input
                        type="checkbox"
                        checked={buildConfig.hotReload}
                        onChange={(e) => handleBuildConfigChange('hotReload', e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Deployment Tab */}
          <TabsContent value="deploy" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Deployment Platform
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Choose where to deploy your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Platform</Label>
                    <select
                      value={deployConfig.platform}
                      onChange={(e) => handleDeployConfigChange('platform', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="vercel">Vercel</option>
                      <option value="netlify">Netlify</option>
                      <option value="github-pages">GitHub Pages</option>
                      <option value="aws">AWS S3</option>
                      <option value="firebase">Firebase Hosting</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Environment</Label>
                    <select
                      value={deployConfig.environment}
                      onChange={(e) => handleDeployConfigChange('environment', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Node Version</Label>
                    <select
                      value={deployConfig.nodeVersion}
                      onChange={(e) => handleDeployConfigChange('nodeVersion', e.target.value)}
                      className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="16">Node 16</option>
                      <option value="18">Node 18</option>
                      <option value="20">Node 20</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Deployment Settings */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Deployment Settings
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure deployment commands and paths
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Build Command</Label>
                    <Input
                      value={deployConfig.buildCommand}
                      onChange={(e) => handleDeployConfigChange('buildCommand', e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="npm run build"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Output Directory</Label>
                    <Input
                      value={deployConfig.outputDirectory}
                      onChange={(e) => handleDeployConfigChange('outputDirectory', e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="dist"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Custom Domain</Label>
                    <Input
                      value={deployConfig.customDomain}
                      onChange={(e) => handleDeployConfigChange('customDomain', e.target.value)}
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      placeholder="example.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Environment Variables Tab */}
          <TabsContent value="env" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Environment Variables
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure environment variables for your deployment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {envVars.map((envVar, index) => (
                    <div key={index} className="flex space-x-4">
                      <Input
                        placeholder="Variable Name"
                        value={envVar.key}
                        onChange={(e) => updateEnvVar(index, e.target.value, envVar.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <Input
                        placeholder="Variable Value"
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(index, envVar.key, e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        type="password"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => removeEnvVar(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addEnvVar}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Environment Variable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
