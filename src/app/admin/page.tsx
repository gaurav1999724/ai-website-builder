'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Settings, 
  FileText, 
  BarChart3, 
  Shield, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Activity,
  Database,
  Bot,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { ProfileDropdown } from '@/components/profile-dropdown'

interface AIPrompt {
  id: string
  name: string
  provider: string
  type: string
  title: string
  description?: string
  systemPrompt: string
  isActive: boolean
  version: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name?: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  projectsCount: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [aiPrompts, setAiPrompts] = useState<AIPrompt[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }
    
    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [promptsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/prompts'),
        fetch('/api/admin/users')
      ])
      
      if (promptsResponse.ok) {
        const promptsData = await promptsResponse.json()
        setAiPrompts(promptsData.prompts || [])
      }
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPrompt = (prompt: AIPrompt) => {
    setEditingPrompt(prompt)
    setIsEditing(true)
  }

  const handleSavePrompt = async () => {
    if (!editingPrompt) return

    try {
      const response = await fetch(`/api/admin/prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPrompt)
      })

      if (response.ok) {
        toast.success('Prompt updated successfully')
        setEditingPrompt(null)
        setIsEditing(false)
        fetchData()
      } else {
        toast.error('Failed to update prompt')
      }
    } catch (error) {
      console.error('Error updating prompt:', error)
      toast.error('Failed to update prompt')
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return

    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Prompt deleted successfully')
        fetchData()
      } else {
        toast.error('Failed to delete prompt')
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      toast.error('Failed to delete prompt')
    }
  }

  const handleTogglePromptStatus = async (promptId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        toast.success(`Prompt ${!isActive ? 'activated' : 'deactivated'} successfully`)
        fetchData()
      } else {
        toast.error('Failed to update prompt status')
      }
    } catch (error) {
      console.error('Error updating prompt status:', error)
      toast.error('Failed to update prompt status')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN')) {
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
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-gray-400">Manage AI prompts and users</p>
              </div>
            </div>
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="prompts" className="data-[state=active]:bg-blue-600">
              <Bot className="h-4 w-4 mr-2" />
              AI Prompts
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{users.length}</div>
                  <p className="text-xs text-gray-400">
                    {users.filter(u => u.isActive).length} active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">AI Prompts</CardTitle>
                  <Bot className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{aiPrompts.length}</div>
                  <p className="text-xs text-gray-400">
                    {aiPrompts.filter(p => p.isActive).length} active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Projects</CardTitle>
                  <FileText className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {users.reduce((sum, user) => sum + user.projectsCount, 0)}
                  </div>
                  <p className="text-xs text-gray-400">Across all users</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                  <CardTitle className="text-sm font-medium text-gray-400">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">Online</div>
                  <p className="text-xs text-gray-400">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            {/* AI API Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">OpenAI API</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-500">Active</div>
                  <p className="text-xs text-gray-400">GPT-4o-mini</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Anthropic API</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-500">Active</div>
                  <p className="text-xs text-gray-400">Claude 3.5 Sonnet</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Gemini API</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-500">Active</div>
                  <p className="text-xs text-gray-400">Gemini 2.5 Flash</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Cerebras API</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-green-500">Active</div>
                  <p className="text-xs text-gray-400">Qwen-3-Coder-480B</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Users</CardTitle>
                  <CardDescription className="text-gray-400">
                    Latest registered users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{user.name || 'No name'}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">AI Prompt Status</CardTitle>
                  <CardDescription className="text-gray-400">
                    Active prompts by provider
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['OPENAI', 'ANTHROPIC', 'GEMINI', 'CEREBRAS'].map((provider) => {
                      const count = aiPrompts.filter(p => p.provider === provider && p.isActive).length
                      return (
                        <div key={provider} className="flex items-center justify-between">
                          <span className="text-white">{provider}</span>
                          <Badge variant="outline">{count} active</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">AI Prompts Management</h2>
              <Button 
                onClick={() => {
                  setEditingPrompt({
                    id: '',
                    name: '',
                    provider: 'OPENAI',
                    type: 'WEBSITE_GENERATION',
                    title: '',
                    description: '',
                    systemPrompt: '',
                    isActive: true,
                    version: 1,
                    createdBy: session.user?.id || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })
                  setIsEditing(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Prompt
              </Button>
            </div>

            {isEditing && editingPrompt && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">
                    {editingPrompt.id ? 'Edit Prompt' : 'Create New Prompt'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Name</Label>
                      <Input
                        id="name"
                        value={editingPrompt.name}
                        onChange={(e) => setEditingPrompt({...editingPrompt, name: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="title" className="text-white">Title</Label>
                      <Input
                        id="title"
                        value={editingPrompt.title}
                        onChange={(e) => setEditingPrompt({...editingPrompt, title: e.target.value})}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="provider" className="text-white">Provider</Label>
                      <Select 
                        value={editingPrompt.provider} 
                        onValueChange={(value) => setEditingPrompt({...editingPrompt, provider: value})}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPENAI">OpenAI</SelectItem>
                          <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                          <SelectItem value="GEMINI">Gemini</SelectItem>
                          <SelectItem value="CEREBRAS">Cerebras</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type" className="text-white">Type</Label>
                      <Select 
                        value={editingPrompt.type} 
                        onValueChange={(value) => setEditingPrompt({...editingPrompt, type: value})}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEBSITE_GENERATION">Website Generation</SelectItem>
                          <SelectItem value="WEBSITE_MODIFICATION">Website Modification</SelectItem>
                          <SelectItem value="CHAT_ASSISTANT">Chat Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-white">Description</Label>
                    <Textarea
                      id="description"
                      value={editingPrompt.description || ''}
                      onChange={(e) => setEditingPrompt({...editingPrompt, description: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="systemPrompt" className="text-white">System Prompt</Label>
                    <Textarea
                      id="systemPrompt"
                      value={editingPrompt.systemPrompt}
                      onChange={(e) => setEditingPrompt({...editingPrompt, systemPrompt: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                      rows={15}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingPrompt(null)
                        setIsEditing(false)
                      }}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSavePrompt}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
              {aiPrompts.map((prompt) => (
                <Card key={prompt.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{prompt.title}</h3>
                          <Badge variant={prompt.isActive ? 'default' : 'secondary'}>
                            {prompt.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{prompt.provider}</Badge>
                          <Badge variant="outline">{prompt.type}</Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{prompt.description}</p>
                        <p className="text-gray-500 text-xs">
                          Version {prompt.version} • Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePromptStatus(prompt.id, prompt.isActive)}
                          className="text-gray-400 hover:text-white"
                        >
                          {prompt.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrompt(prompt)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Users Management</h2>
            <div className="grid grid-cols-1 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{user.name || 'No name'}</h3>
                        <p className="text-gray-400">{user.email}</p>
                        <p className="text-gray-500 text-sm">
                          Joined {new Date(user.createdAt).toLocaleDateString()} • {user.projectsCount} projects
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Settings</h2>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Database Status</CardTitle>
                <CardDescription className="text-gray-400">
                  System health and database information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Database Connection</span>
                    <Badge variant="default" className="bg-green-600">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Total Users</span>
                    <span className="text-gray-400">{users.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Total AI Prompts</span>
                    <span className="text-gray-400">{aiPrompts.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
