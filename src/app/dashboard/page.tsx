'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Calendar,
  FileText,
  Code,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Star,
  MessageCircle,
  Settings,
  Bell,
  HelpCircle,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

interface Project {
  id: string
  title: string
  description?: string
  status: 'GENERATING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
  files: Array<{
    id: string
    path: string
    type: string
    size: number
  }>
  _count: {
    files: number
    generations: number
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session) {
      fetchProjects()
    }
  }, [session, status, router])

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/projects?${params}`)
      const data = await response.json()

      if (data.projects) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchProjects()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, statusFilter])

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
        toast.success('Project deleted successfully')
      } else {
        toast.error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete project')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'GENERATING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true
    if (activeTab === 'recent') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return new Date(project.updatedAt) > oneWeekAgo
    }
    return project.status === activeTab.toUpperCase()
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-grey-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky Back Button */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="bg-gray-800/80 backdrop-blur-sm text-white hover:bg-gray-700 hover:text-white p-3 rounded-full shadow-lg border border-gray-700"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b-2 border-grey-900">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-white">AI Website Builder</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            
            {(session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN') && (
              <Button 
                onClick={() => router.push('/admin')}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Welcome back, {session.user?.name}!</h2>
          <p className="text-gray-600">Manage your AI-generated websites and create new projects.</p>
          
          {/* Admin Section */}
          {(session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN') && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Admin Access</h3>
                    <p className="text-sm text-gray-400">Manage AI prompts, users, and system settings</p>
                  </div>
                </div>
                <Button 
                  onClick={() => router.push('/admin')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Open Admin Panel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="holo-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300">{projects.length}</p>
                  <p className="text-sm text-gray-500 font-medium">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="holo-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300">
                    {projects.filter(p => p.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="holo-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300">
                    {projects.filter(p => p.status === 'GENERATING').length}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">Generating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="holo-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-300">
                    {projects.filter(p => {
                      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      return new Date(p.updatedAt) > oneWeekAgo
                    }).length}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="neon-border hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300">Create New Website</h4>
                    <p className="text-sm text-gray-500 font-medium">Generate a website with AI</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>

            <Card className="neon-border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Code className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300">Browse Templates</h4>
                    <p className="text-sm text-gray-500 font-medium">Explore pre-built designs</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>

            <Card className="neon-border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300">Get Support</h4>
                    <p className="text-sm text-gray-500 font-medium">Chat with our team</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Projects Section */}
        <Card className="cyber-border hover:shadow-md transition-shadow bg-card">
          <CardHeader className="border-b border-grey-900">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-300">Your Projects</CardTitle>
                <CardDescription className="text-gray-300 font-medium">
                  Manage and view all your AI-generated websites
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 border-gray-600 bg-black text-white focus:border-grey-900 focus:ring-blue-600"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-600 rounded-md bg-black text-white focus:border-grey-900 focus:ring-blue-600"
                >
                  <option value="">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="GENERATING">Generating</option>
                  <option value="FAILED">Failed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-grey-900">
                <TabsList className="bg-transparent p-0 h-auto w-full">
                  <TabsTrigger 
                    value="all" 
                    className="flex-1 py-4 text-sm border-b-2 border-transparent data-[state=active]:border-grey-900 data-[state=active]:text-blue-300 font-bold"
                  >
                    All Projects
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recent" 
                    className="flex-1 py-4 text-sm border-b-2 border-transparent data-[state=active]:border-grey-900 data-[state=active]:text-blue-300 font-bold"
                  >
                    Recent
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="flex-1 py-4 text-sm border-b-2 border-transparent data-[state=active]:border-grey-900 data-[state=active]:text-blue-300 font-bold"
                  >
                    Completed
                  </TabsTrigger>
                  <TabsTrigger 
                    value="generating" 
                    className="flex-1 py-4 text-sm border-b-2 border-transparent data-[state=active]:border-grey-900 data-[state=active]:text-blue-300 font-bold"
                  >
                    Generating
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="p-6">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery || statusFilter 
                        ? 'Try adjusting your search or filters'
                        : 'Get started by creating your first AI-generated website'
                      }
                    </p>
                    <Button 
                      onClick={() => router.push('/')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                      <Card key={project.id} className="gradient-border hover:shadow-md transition-shadow cursor-pointer group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg text-white truncate">
                                {project.title}
                              </CardTitle>
                              {project.description && (
                                <CardDescription className="mt-1 text-gray-300 line-clamp-2">
                                  {project.description}
                                </CardDescription>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <Badge className={getStatusColor(project.status)}>
                                {project.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{project._count.files} files</span>
                              <span>{formatRelativeTime(new Date(project.updatedAt))}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/projects/${project.id}`)}
                                className="flex-1 border-gray-600 hover:border-grey-900 hover:text-white bg-black text-white"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              
                              {project.status === 'COMPLETED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/projects/${project.id}/edit`)}
                                  className="border-gray-600 hover:border-grey-900 hover:text-white bg-black text-white"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteProject(project.id)}
                                className="border-gray-600 hover:border-red-500 hover:text-red-500 bg-black text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Help Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-black hover:bg-gray-800 border-2 border-grey-900"
      >
        <HelpCircle className="h-5 w-5 text-white" />
      </Button>
    </div>
  )
}