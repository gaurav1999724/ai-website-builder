'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Eye, 
  Code, 
  Copy,
  Download,
  Filter,
  Grid,
  List,
  Sparkles,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { COMPONENT_LIBRARY, Component, getComponentsByCategory, searchComponents } from '@/lib/components'

export default function ComponentsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set())
  const [previewComponent, setPreviewComponent] = useState<Component | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const categories = [
    { id: 'all', name: 'All Components', count: COMPONENT_LIBRARY.length },
    { id: 'ui', name: 'UI Components', count: getComponentsByCategory('ui').length },
    { id: 'layout', name: 'Layout', count: getComponentsByCategory('layout').length },
    { id: 'form', name: 'Forms', count: getComponentsByCategory('form').length },
    { id: 'navigation', name: 'Navigation', count: getComponentsByCategory('navigation').length },
    { id: 'media', name: 'Media', count: getComponentsByCategory('media').length },
    { id: 'data', name: 'Data', count: getComponentsByCategory('data').length }
  ]

  const filteredComponents = searchQuery 
    ? searchComponents(searchQuery)
    : selectedCategory === 'all' 
      ? COMPONENT_LIBRARY 
      : getComponentsByCategory(selectedCategory)

  const handleComponentSelect = (componentId: string) => {
    const newSelected = new Set(selectedComponents)
    if (newSelected.has(componentId)) {
      newSelected.delete(componentId)
    } else {
      newSelected.add(componentId)
    }
    setSelectedComponents(newSelected)
  }

  const handleAddComponents = async () => {
    if (selectedComponents.size === 0) {
      toast.error('Please select at least one component')
      return
    }

    setLoading(true)
    try {
      const componentsToAdd = Array.from(selectedComponents).map(id => 
        COMPONENT_LIBRARY.find(c => c.id === id)
      ).filter(Boolean) as Component[]

      // Here you would typically send the components to your API
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success(`Successfully added ${componentsToAdd.length} components to your project!`)
      setSelectedComponents(new Set())
      
      // Redirect back to the project
      router.push(`/projects/${params.id}`)
    } catch (error) {
      toast.error('Failed to add components to project')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (component: Component) => {
    setPreviewComponent(component)
  }

  const handleCopyCode = (component: Component, type: 'html' | 'css' | 'js') => {
    const code = component.code[type]
    if (code) {
      navigator.clipboard.writeText(code)
      toast.success(`${type.toUpperCase()} code copied to clipboard!`)
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
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h1 className="text-xl font-semibold text-white">Component Library</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-gray-300 hover:text-white"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="text-gray-300 hover:text-white"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {selectedComponents.size > 0 && (
              <Button
                onClick={handleAddComponents}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {selectedComponents.size} Component{selectedComponents.size > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-900 border-r border-gray-800 p-6">
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Categories</h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span>{category.name}</span>
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Components */}
            {selectedComponents.size > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Selected ({selectedComponents.size})
                </h3>
                <div className="space-y-2">
                  {Array.from(selectedComponents).map((componentId) => {
                    const component = COMPONENT_LIBRARY.find(c => c.id === componentId)
                    if (!component) return null
                    
                    return (
                      <div key={componentId} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-300">{component.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleComponentSelect(componentId)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {previewComponent ? (
            <div className="space-y-6">
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{previewComponent.name}</h2>
                  <p className="text-gray-400">{previewComponent.description}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setPreviewComponent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Preview Tabs */}
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="bg-gray-800">
                  <TabsTrigger value="preview" className="text-gray-300 data-[state=active]:text-white">Preview</TabsTrigger>
                  <TabsTrigger value="html" className="text-gray-300 data-[state=active]:text-white">HTML</TabsTrigger>
                  <TabsTrigger value="css" className="text-gray-300 data-[state=active]:text-white">CSS</TabsTrigger>
                  {previewComponent.code.js && (
                    <TabsTrigger value="js" className="text-gray-300 data-[state=active]:text-white">JavaScript</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="preview" className="mt-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Live Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-white p-8 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: previewComponent.code.html }} />
                        <style dangerouslySetInnerHTML={{ __html: previewComponent.code.css }} />
                        {previewComponent.code.js && (
                          <script dangerouslySetInnerHTML={{ __html: previewComponent.code.js }} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="html" className="mt-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-white">HTML Code</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(previewComponent, 'html')}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                        <code className="text-green-400 text-sm">{previewComponent.code.html}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="css" className="mt-6">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-white">CSS Code</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(previewComponent, 'css')}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                        <code className="text-blue-400 text-sm">{previewComponent.code.css}</code>
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                {previewComponent.code.js && (
                  <TabsContent value="js" className="mt-6">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white">JavaScript Code</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(previewComponent, 'js')}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-yellow-400 text-sm">{previewComponent.code.js}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'All Components'}
                  </h2>
                  <p className="text-gray-400">
                    {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>

              {/* Components Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredComponents.map((component) => (
                    <Card 
                      key={component.id} 
                      className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:bg-gray-750 ${
                        selectedComponents.has(component.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleComponentSelect(component.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white text-lg">{component.name}</CardTitle>
                            <CardDescription className="text-gray-400">
                              {component.description}
                            </CardDescription>
                          </div>
                          {selectedComponents.has(component.id) && (
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {component.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="bg-gray-700 text-gray-300">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreview(component)
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleComponentSelect(component.id)
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {selectedComponents.has(component.id) ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComponents.map((component) => (
                    <Card 
                      key={component.id} 
                      className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:bg-gray-750 ${
                        selectedComponents.has(component.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleComponentSelect(component.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">{component.name}</h3>
                              {selectedComponents.has(component.id) && (
                                <CheckCircle className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            <p className="text-gray-400 mb-3">{component.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {component.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="bg-gray-700 text-gray-300">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePreview(component)
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleComponentSelect(component.id)
                              }}
                              className="text-gray-400 hover:text-white"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {selectedComponents.has(component.id) ? 'Remove' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
