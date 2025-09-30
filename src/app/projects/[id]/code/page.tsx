'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProfileDropdown } from '@/components/profile-dropdown'
import MonacoEditor from '@monaco-editor/react'
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  Copy,
  Save,
  Maximize2,
  Minimize2,
  FileText,
  FileCode,
  FileImage,
  FileJson,
  FileArchive,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Monitor,
  Smartphone,
  Tablet,
  X,
  ExternalLink
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
    content: string
    type: string
    size: number
  }>
}

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  content?: string
  children?: FileNode[]
  fileId?: string
  fileType?: string
}

export default function CodeEditorPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [currentPage, setCurrentPage] = useState<string>('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [openTabs, setOpenTabs] = useState<Array<{id: string, name: string, path: string, content: string}>>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session) {
      fetchProject()
    }
  }, [session, status, router, params.id])

  // Update tab content when fileContent changes
  useEffect(() => {
    if (activeTab && fileContent !== undefined) {
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTab ? { ...tab, content: fileContent } : tab
      ))
    }
  }, [fileContent, activeTab])

  const getLanguageFromType = (type: string, filePath?: string): string => {
    const typeMap: Record<string, string> = {
      'HTML': 'html',
      'CSS': 'css',
      'JAVASCRIPT': 'javascript',
      'TYPESCRIPT': 'typescript',
      'JSON': 'json',
      'MARKDOWN': 'markdown',
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'TEXT': 'plaintext',
    }
    
    // If type is mapped, return it
    if (typeMap[type]) {
      return typeMap[type]
    }
    
    // Fallback: detect from file extension
    if (filePath) {
      const extension = filePath.split('.').pop()?.toLowerCase()
      const extensionMap: Record<string, string> = {
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'json': 'json',
        'md': 'markdown',
        'markdown': 'markdown',
      }
      return extensionMap[extension || ''] || 'plaintext'
    }
    
    return 'plaintext'
  }

  // Handle iframe navigation messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'NAVIGATE_TO_PAGE') {
        const { targetFile } = event.data
        setCurrentPage(targetFile)
      } else if (event.data.type === 'NAVIGATE_TO_SECTION') {
        const { hash } = event.data
        // Handle section navigation within the same page
        if (hash) {
          // Scroll to the section (this will be handled by the iframe content)
          console.log('Navigating to section:', hash)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      const data = await response.json()

      if (data.project) {
        setProject(data.project)
        
        // Select first file by default (prioritize index files)
        if (data.project.files.length > 0) {
          // Find index file first, otherwise use first file
          const indexFile = data.project.files.find((file: any) => 
            file.path.toLowerCase().includes('index.') || 
            file.path.toLowerCase().endsWith('index.html') ||
            file.path.toLowerCase().endsWith('index.js')
          )
          const firstFile = indexFile || data.project.files[0]
          setSelectedFile({
            name: firstFile.path.split('/').pop() || firstFile.path,
            type: 'file',
            path: firstFile.path,
            content: firstFile.content,
            fileId: firstFile.id,
            fileType: firstFile.type || getFileType(firstFile.path)
          })
          setFileContent(firstFile.content)
        }
      } else {
        toast.error('Project not found')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (fileName: string, isFolder: boolean = false) => {
    if (isFolder) return <Folder className="h-4 w-4 text-blue-400" />

    const extension = fileName.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'css':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'js':
      case 'jsx':
        return <FileText className="h-4 w-4 text-yellow-500" />
      case 'ts':
      case 'tsx':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'json':
        return <FileJson className="h-4 w-4 text-yellow-600" />
      case 'md':
      case 'markdown':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4 text-green-500" />
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  // Organize files into folder structure
  const organizeFilesIntoFolders = (files: any[]) => {
    const folderStructure: any = {}
    
    files.forEach(file => {
      const pathParts = file.path.split('/')
      
      // If file has explicit folder path, use it
      if (pathParts.length > 1) {
        let currentLevel = folderStructure
        
        // Navigate/create folder structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i]
          if (!currentLevel[folderName]) {
            currentLevel[folderName] = { type: 'folder', children: {} }
          }
          currentLevel = currentLevel[folderName].children
        }
        
        // Add file to the final folder
        const fileName = pathParts[pathParts.length - 1]
        currentLevel[fileName] = { type: 'file', ...file }
      } else {
        // If file is in root, organize by file type
        const fileName = pathParts[0]
        const extension = fileName.split('.').pop()?.toLowerCase()
        
        let folderName = 'Root'
        switch (extension) {
          case 'html':
          case 'htm':
            folderName = 'Pages'
            break
          case 'css':
            folderName = 'Styles'
            break
          case 'js':
          case 'jsx':
          case 'ts':
          case 'tsx':
            folderName = 'Scripts'
            break
          case 'json':
            folderName = 'Config'
            break
          case 'md':
          case 'markdown':
            folderName = 'Docs'
            break
          case 'png':
          case 'jpg':
          case 'jpeg':
          case 'gif':
          case 'svg':
            folderName = 'Assets'
            break
          default:
            folderName = 'Other'
        }
        
        // Create folder if it doesn't exist
        if (!folderStructure[folderName]) {
          folderStructure[folderName] = { type: 'folder', children: {} }
        }
        
        // Add file to the appropriate folder
        folderStructure[folderName].children[fileName] = { type: 'file', ...file }
      }
    })
    
    return folderStructure
  }

  // Sort files to prioritize index files
  const sortFilesWithIndexFirst = (structure: any) => {
    const sortedStructure: any = {}
    
    Object.entries(structure).forEach(([name, item]: [string, any]) => {
      if (item.type === 'folder') {
        // Recursively sort folder contents
        sortedStructure[name] = {
          ...item,
          children: sortFilesWithIndexFirst(item.children)
        }
      } else {
        sortedStructure[name] = item
      }
    })
    
    // Sort entries: index files first, then alphabetically
    const sortedEntries = Object.entries(sortedStructure).sort(([nameA, itemA], [nameB, itemB]) => {
      const isIndexA = nameA.toLowerCase().startsWith('index.')
      const isIndexB = nameB.toLowerCase().startsWith('index.')
      
      if (isIndexA && !isIndexB) return -1
      if (!isIndexA && isIndexB) return 1
      
      // If both are index files or both are not, sort alphabetically
      return nameA.localeCompare(nameB)
    })
    
    // Convert back to object
    const result: any = {}
    sortedEntries.forEach(([name, item]) => {
      result[name] = item
    })
    
    return result
  }

  // Render folder structure recursively
  const renderFolderStructure = (structure: any, level = 0, parentPath = '') => {
    const items: JSX.Element[] = []
    
    Object.entries(structure).forEach(([name, item]: [string, any]) => {
      const currentPath = parentPath ? `${parentPath}/${name}` : name
      
      if (item.type === 'folder') {
        const isExpanded = isFolderExpanded(currentPath)
        const hasChildren = Object.keys(item.children).length > 0
        
        // Render folder
        items.push(
          <div key={name} className="select-none">
            <div 
              className="flex items-center space-x-2 p-2 text-sm text-gray-400 cursor-pointer hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => hasChildren && toggleFolder(currentPath)}
            >
              <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center space-x-2">
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )
                ) : (
                  <div className="w-4 h-4" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-400" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-400" />
                )}
                {!sidebarCollapsed && (
                  <span className="font-medium">{name}</span>
                )}
              </div>
            </div>
            {/* Render folder contents */}
            {hasChildren && isExpanded && !sidebarCollapsed && (
              <div>
                {renderFolderStructure(item.children, level + 1, currentPath)}
              </div>
            )}
          </div>
        )
      } else {
        // Render file
        items.push(
          <div
            key={item.id}
            onClick={() => handleFileSelect(item)}
            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
              selectedFile?.fileId === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
            title={sidebarCollapsed ? (item.path.split('/').pop() || item.path) : undefined}
          >
            <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center space-x-2">
              <div className="w-4 h-4" /> {/* Spacer for alignment */}
              {getFileIcon(item.path)}
              {!sidebarCollapsed && (
                <span className="text-sm truncate">{name}</span>
              )}
            </div>
          </div>
        )
      }
    })
    
    return items
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html':
        return 'HTML'
      case 'css':
        return 'CSS'
      case 'js':
      case 'jsx':
        return 'JavaScript'
      case 'ts':
      case 'tsx':
        return 'TypeScript'
      case 'json':
        return 'JSON'
      default:
        return extension?.toUpperCase() || 'TEXT'
    }
  }






  const handleFileSelect = (file: any) => {
    try {
      const fileName = file.path.split('/').pop() || file.path
      const fileId = file.id
      
      // Ensure file has content
      if (!file.content) {
        console.error('File has no content:', file)
        toast.error('File content not available')
        return
      }
      
      console.log('Opening file:', fileName, 'Content length:', file.content.length)
      
      // Check if tab is already open
      const existingTab = openTabs.find(tab => tab.id === fileId)
      
      if (existingTab) {
        // Switch to existing tab
        setActiveTab(fileId)
        setSelectedFile({
          name: fileName,
          type: 'file',
          path: file.path,
          content: existingTab.content,
          fileId: fileId,
          fileType: file.type || getFileType(file.path)
        })
        setFileContent(existingTab.content)
      } else {
        // Open new tab
        const newTab = {
          id: fileId,
          name: fileName,
          path: file.path,
          content: file.content
        }
        
        setOpenTabs(prev => [...prev, newTab])
        setActiveTab(fileId)
        setSelectedFile({
          name: fileName,
          type: 'file',
          path: file.path,
          content: file.content,
          fileId: fileId,
          fileType: file.type || getFileType(file.path)
        })
        setFileContent(file.content)
      }
    } catch (error) {
      console.error('Error selecting file:', error)
      toast.error('Error opening file')
    }
  }

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath)
      } else {
        newSet.add(folderPath)
      }
      return newSet
    })
  }

  const isFolderExpanded = (folderPath: string) => {
    return expandedFolders.has(folderPath)
  }

  const handleTabClose = (tabId: string) => {
    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId))
    
    if (activeTab === tabId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== tabId)
      if (remainingTabs.length > 0) {
        const nextTab = remainingTabs[remainingTabs.length - 1]
        setActiveTab(nextTab.id)
        setSelectedFile({
          name: nextTab.name,
          type: 'file',
          path: nextTab.path,
          content: nextTab.content,
          fileId: nextTab.id,
          fileType: getFileType(nextTab.path)
        })
        setFileContent(nextTab.content)
      } else {
        setActiveTab(null)
        setSelectedFile(null)
        setFileContent('')
      }
    }
  }

  const handleTabSwitch = (tabId: string) => {
    try {
      const tab = openTabs.find(t => t.id === tabId)
      if (tab) {
        setActiveTab(tabId)
        setSelectedFile({
          name: tab.name,
          type: 'file',
          path: tab.path,
          content: tab.content,
          fileId: tab.id,
          fileType: getFileType(tab.path)
        })
        setFileContent(tab.content)
      }
    } catch (error) {
      console.error('Error switching tab:', error)
      toast.error('Error switching to file')
    }
  }



  const handleSave = async () => {
    if (!selectedFile?.fileId) return

    try {
      const response = await fetch(`/api/projects/${params.id}/files/${selectedFile.fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: fileContent }),
      })

      if (response.ok) {
        toast.success('File saved successfully')
        
        // Update project files
        if (project) {
          setProject({
            ...project,
            files: project.files.map(file => 
              file.id === selectedFile.fileId ? { ...file, content: fileContent } : file
            )
          })
        }
        
        // Update tab content
        setOpenTabs(prev => prev.map(tab => 
          tab.id === selectedFile.fileId ? { ...tab, content: fileContent } : tab
        ))
        
        // Update selected file content
        setSelectedFile(prev => prev ? { ...prev, content: fileContent } : null)
      } else {
        toast.error('Failed to save file')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save file')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent)
    toast.success('Code copied to clipboard')
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/export`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Project downloaded successfully!')
      } else {
        toast.error('Failed to download project')
      }
    } catch (error) {
      toast.error('Failed to download project')
    }
  }

  const getCombinedHTMLContent = (targetFile?: string) => {
    if (!project) return ''
    
    // If targetFile is specified, try to find that specific HTML file
    let htmlFile = project.files.find(f => f.type === 'HTML' && f.path === targetFile)
    
    // If target file not found, fall back to main HTML file
    if (!htmlFile) {
      htmlFile = project.files.find(f => f.type === 'HTML')
    }
    
    if (!htmlFile) return ''
    
    let htmlContent = htmlFile.content
    
    // Get all CSS files
    const cssFiles = project.files.filter(f => f.type === 'CSS')
    const cssContent = cssFiles.map(f => f.content).join('\n')
    
    // Get all JavaScript files
    const jsFiles = project.files.filter(f => f.type === 'JAVASCRIPT')
    const jsContent = jsFiles.map(f => f.content).join('\n')
    
    // Inject CSS into the HTML
    if (cssContent) {
      // Keep external CSS links (fonts, CDNs) but remove local CSS links
      htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
      htmlContent = htmlContent.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`)
    }
    
    // Create navigation handling script
    const navigationScript = `
      <script>
        // Navigation handling for AI-generated content
        document.addEventListener('DOMContentLoaded', function() {
          // Intercept all link clicks
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault();
              
              // Get the target file from href
              const href = link.getAttribute('href');
              if (href && (href.endsWith('.html') || href.includes('#'))) {
                // Send message to parent window to handle navigation
                window.parent.postMessage({
                  type: 'NAVIGATE_TO_PAGE',
                  targetFile: href,
                  projectId: '${project.id}'
                }, '*');
              }
            }
          });
          
          // Handle hash navigation
          window.addEventListener('hashchange', function() {
            const hash = window.location.hash;
            if (hash) {
              window.parent.postMessage({
                type: 'NAVIGATE_TO_SECTION',
                hash: hash
              }, '*');
            }
          });
        });
      </script>
    `
    
    // Inject JavaScript into the HTML
    if (jsContent) {
      // Remove existing script tags that reference external files
      htmlContent = htmlContent.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '')
      htmlContent = htmlContent.replace('</body>', `<script>\n${jsContent}\n</script>\n${navigationScript}\n</body>`)
    } else {
      // Add navigation script even if no other JS
      htmlContent = htmlContent.replace('</body>', `${navigationScript}\n</body>`)
    }
    
    return htmlContent
  }

  const handlePreview = () => {
    // Open the project preview in a new tab with proper URL
    const previewUrl = `/projects/${project?.id}/preview`
    window.open(previewUrl, '_blank')
  }

  const handleFullscreenPreview = () => {
    // Open the project preview in fullscreen mode
    const fullscreenUrl = `/projects/${project?.id}/fullscreen`
    window.open(fullscreenUrl, '_blank')
  }

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile':
        return 'w-80'
      case 'tablet':
        return 'w-128'
      case 'desktop':
        return 'w-full'
      default:
        return 'w-full'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session || !project) {
    return null
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${params.id}`)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <FileCode className="h-5 w-5 text-blue-400" />
            <span className="text-lg font-semibold">Code Editor</span>
            {selectedFile && (
              <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                {getFileType(selectedFile.name)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            title={sidebarCollapsed ? 'Show Project Files' : 'Hide Project Files'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="text-gray-300 hover:text-white hover:bg-gray-700 border border-blue-600"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreenPreview}
            className="text-gray-300 hover:text-white hover:bg-gray-700 border border-green-600"
            title="Open Fullscreen Preview"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
          
          {selectedFile && selectedFile.name.endsWith('.html') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewCollapsed(!previewCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              title={previewCollapsed ? 'Show Preview' : 'Hide Preview'}
            >
              {previewCollapsed ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4 rotate-90" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-gray-300 hover:text-white hover:bg-gray-700 border border-blue-600"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <ProfileDropdown />
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)] min-h-0">
        {/* Left Sidebar - Project Files */}
        <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col h-full min-h-0 relative ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        }`}>
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-4 -right-3 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-1 rounded-full border border-gray-600 transition-colors"
            title={sidebarCollapsed ? 'Expand Project Files' : 'Collapse Project Files'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Project Files</h3>
                <span className="text-xs text-gray-500">{project.files.length} files</span>
              </div>
            </div>
          )}
          
          <div className="flex-1 p-2 overflow-y-auto">
            {project.files && project.files.length > 0 ? (
              renderFolderStructure(sortFilesWithIndexFirst(organizeFilesIntoFolders(project.files)))
            ) : (
              <div className="text-gray-500 text-sm p-2">No files available</div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-h-0">
          {/* Combined File Header and Tabs */}
          {selectedFile && (
            <div className="bg-gray-800 border-b border-gray-700">
              {/* File Header */}
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-sm text-gray-300 font-medium">{selectedFile.name}</span>
                  {selectedFile.name.endsWith('.html') && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">HTML</span>
                  )}
                  {selectedFile.name.endsWith('.css') && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">CSS</span>
                  )}
                  {selectedFile.name.endsWith('.js') && (
                    <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">JS</span>
                  )}
                  {selectedFile.name.endsWith('.md') && (
                    <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">MD</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {fileContent.split('\n').length} lines
                  </span>
                  <span className="text-xs text-gray-500">
                    {fileContent.length} characters
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreenPreview}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                    title="Open Fullscreen Preview"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Fullscreen
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              {/* File Tabs */}
              {openTabs.length > 0 && (
                <div className="flex overflow-x-auto border-t border-gray-700">
                  {openTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`flex items-center space-x-2 px-4 py-2 border-r border-gray-700 cursor-pointer min-w-0 ${
                        activeTab === tab.id 
                          ? 'bg-gray-900 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      onClick={() => handleTabSwitch(tab.id)}
                    >
                      {getFileIcon(tab.name)}
                      <span className="text-sm truncate max-w-32">{tab.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTabClose(tab.id)
                        }}
                        className="ml-2 text-gray-500 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 flex h-full min-h-0">
            <div className="flex-1 bg-gray-900 h-full min-h-0">
              {selectedFile ? (
                <div className="h-full flex flex-col min-h-0">

                  {/* Line Numbers and Editor */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Line Numbers */}
                    {/* <div 
                      className="bg-gray-800 border-r border-gray-700 px-3 py-4 text-gray-500 text-sm font-mono select-none overflow-hidden"
                      style={{
                        transform: `translateY(-${scrollPosition.scrollTop}px)`,
                        minHeight: `${fileContent.split('\n').length * 24}px`
                      }}
                    >
                      {fileContent.split('\n').map((_, index) => (
                        <div key={index} className="leading-6 text-right h-6">
                          {index + 1}
                        </div>
                      ))}
                    </div> */}

                    {/* Code Editor */}                    
                    <div className="flex-1 relative overflow-hidden">
                      
                      {selectedFile ? (
                        <MonacoEditor
                          key={selectedFile.fileId || selectedFile.path}
                          height="100%"
                          value={fileContent}
                          language={getLanguageFromType(selectedFile.fileType || selectedFile.type, selectedFile.path)}
                          theme="vs-dark"
                          path={selectedFile.path}
                          loading={<div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>}
                          options={{
                            automaticLayout: true,
                            acceptSuggestionOnCommitCharacter: true,
                            acceptSuggestionOnEnter: "on",
                            accessibilitySupport: "auto",
                            accessibilityPageSize: 10,
                            ariaLabel: `Code editor for ${selectedFile.path}`,
                            ariaRequired: false,
                            screenReaderAnnounceInlineSuggestion: true,
                            autoClosingBrackets: "languageDefined",
                            autoClosingComments: "languageDefined",
                            autoClosingDelete: "auto",
                            autoClosingOvertype: "auto",
                            autoClosingQuotes: "languageDefined",
                            autoIndent: "full",
                            autoSurround: "languageDefined",
                            bracketPairColorization: {
                              enabled: true,
                              independentColorPoolPerBracketType: false,
                            },
                            stickyTabStops: false,
                            codeLens: true,
                            colorDecorators: true,
                            colorDecoratorsActivatedOn: "clickAndHover",
                            colorDecoratorsLimit: 500,
                            comments: {
                              insertSpace: true,
                              ignoreEmptyLines: true,
                            },
                            cursorBlinking: "blink",
                            cursorSmoothCaretAnimation: "off",
                            cursorStyle: "line",
                            dragAndDrop: true,
                            emptySelectionClipboard: true,
                            dropIntoEditor: {
                              enabled: true,
                              showDropSelector: "afterDrop",
                            },
                            stickyScroll: {
                              enabled: true,
                              maxLineCount: 5,
                              defaultModel: "outlineModel",
                              scrollWithEditor: true,
                            },
                            experimentalWhitespaceRendering: "svg",
                            fastScrollSensitivity: 5,
                            find: {
                              cursorMoveOnType: true,
                              seedSearchStringFromSelection: "always",
                              autoFindInSelection: "never",
                              addExtraSpaceOnTop: true,
                              loop: true,
                            },
                            folding: true,
                            foldingStrategy: "auto",
                            foldingHighlight: true,
                            fontFamily: "Consolas, 'Courier New', monospace",
                            fontSize: 14,
                            fontWeight: "normal",
                            glyphMargin: true,
                            gotoLocation: {
                              multipleDefinitions: "peek",
                              multipleTypeDefinitions: "peek",
                              multipleDeclarations: "peek",
                              multipleImplementations: "peek",
                              multipleReferences: "peek",
                              alternativeDefinitionCommand: "editor.action.goToReferences",
                              alternativeTypeDefinitionCommand: "editor.action.goToReferences",
                              alternativeDeclarationCommand: "editor.action.goToReferences",
                            },
                            hover: {
                              enabled: true,
                              delay: 300,
                              sticky: true,
                              hidingDelay: 300,
                              above: true,
                            },
                            lineDecorationsWidth: 10,
                            lineNumbers: "on",
                            lineNumbersMinChars: 5,
                            links: true,
                            matchBrackets: "always",
                            minimap: {
                              enabled: true,
                              autohide: "none", // @ts-ignore
                              size: "proportional",
                              side: "right",
                              showSlider: "mouseover",
                              scale: 1,
                              renderCharacters: true,
                              maxColumn: 120,
                              showRegionSectionHeaders: true,
                              showMarkSectionHeaders: true,
                              sectionHeaderFontSize: 9,
                              sectionHeaderLetterSpacing: 1,
                            },
                            mouseStyle: "text",
                            multiCursorMergeOverlapping: true,
                            multiCursorModifier: "alt",
                            multiCursorPaste: "spread",
                            multiCursorLimit: 10000,
                            occurrencesHighlight: "singleFile",
                            overviewRulerBorder: true,
                            overviewRulerLanes: 2,
                            parameterHints: {
                              enabled: true,
                              cycle: true,
                            },
                            peekWidgetDefaultFocus: "tree",
                            quickSuggestions: {
                              other: "on",
                              comments: "off",
                              strings: "off",
                            },
                            quickSuggestionsDelay: 10,
                            readOnly: false,
                            renderControlCharacters: true,
                            renderFinalNewline: "on",
                            renderLineHighlight: "line",
                            renderValidationDecorations: "editable",
                            renderWhitespace: "selection",
                            revealHorizontalRightPadding: 15,
                            roundedSelection: true,
                            scrollbar: {
                              vertical: "auto",
                              horizontal: "auto",
                              verticalScrollbarSize: 14,
                              horizontalScrollbarSize: 12,
                            },
                            scrollBeyondLastLine: true,
                            selectionClipboard: true,
                            selectionHighlight: true,
                            selectOnLineNumbers: true,
                            showFoldingControls: "mouseover",
                            showUnused: true,
                            showDeprecated: true,
                            inlayHints: {
                              enabled: "on",
                              fontSize: 0,
                              fontFamily: "",
                              padding: false,
                            },
                            snippetSuggestions: "inline",
                            smoothScrolling: false,
                            suggest: {
                              insertMode: "insert",
                              filterGraceful: true,
                              showIcons: true,
                              showInlineDetails: true,
                              showMethods: true,
                              showFunctions: true,
                              showClasses: true,
                              showVariables: true,
                              showModules: true,
                              showProperties: true,
                              showEvents: true,
                              showOperators: true,
                              showValues: true,
                              showEnums: true,
                              showEnumMembers: true,
                              showKeywords: true,
                              showSnippets: true,
                            },
                            inlineSuggest: {
                              enabled: true,
                              showToolbar: "onHover",
                              suppressSuggestions: false,
                              fontFamily: "default",
                            },
                            wordWrap: "off",
                            wordWrapColumn: 80,
                          }}
                          onChange={(value) => {
                            if (value !== undefined) {
                              setFileContent(value)
                            }
                          }}
                          onMount={(editor, monaco) => {
                            // Set accessibility attributes
                            const editorElement = editor.getDomNode()
                            if (editorElement && selectedFile) {
                              editorElement.setAttribute('id', `monaco-editor-${selectedFile.fileId || selectedFile.path}`)
                              editorElement.setAttribute('name', `monaco-editor-${selectedFile.path}`)
                              editorElement.setAttribute('role', 'textbox')
                              editorElement.setAttribute('aria-label', `Code editor for ${selectedFile.path}`)
                              editorElement.setAttribute('aria-multiline', 'true')
                            }
                            
                            // Ensure syntax highlighting is enabled
                            const language = getLanguageFromType(selectedFile.fileType || selectedFile.type, selectedFile.path)
                            console.log('Monaco Editor mounted with language:', language, 'for file:', selectedFile.path, 'fileType:', selectedFile.fileType)
                            
                            // Force re-highlighting
                            editor.getAction('editor.action.formatDocument')?.run()
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Select a file to start editing...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                      <span>Ln {fileContent.split('\n').length}, Col {fileContent.length}</span>
                      <span>{getFileType(selectedFile.name)}</span>
                      <span>UTF-8</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span>Spaces: 2</span>
                      <span>{selectedFile.name}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a file to start editing</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {selectedFile && selectedFile.name.endsWith('.html') && (
              <div className={`bg-gray-800 border-l border-gray-700 flex flex-col h-full transition-all duration-300 relative ${
                previewCollapsed ? 'w-12' : 'w-[900px]'
              }`}>
                {/* Collapse Button */}
                <button
                  onClick={() => setPreviewCollapsed(!previewCollapsed)}
                  className="absolute top-4 -left-3 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-1 rounded-full border border-gray-600 transition-colors"
                  title={previewCollapsed ? 'Expand Preview' : 'Collapse Preview'}
                >
                  {previewCollapsed ? (
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  ) : (
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  )}
                </button>

                {!previewCollapsed && (
                  <>
                    <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-300">Preview</h3>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('desktop')}
                          className={`p-1 ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Desktop View"
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('tablet')}
                          className={`p-1 ${previewMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Tablet View"
                        >
                          <Tablet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('mobile')}
                          className={`p-1 ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Mobile View"
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-auto">
                      <div className={`mx-auto bg-white rounded-lg shadow-lg ${getPreviewWidth()}`}>
                        <iframe
                          srcDoc={getCombinedHTMLContent(currentPage)}
                          className="w-full h-full border-0 rounded-lg"
                          title="Preview"
                          key={currentPage} // Force re-render when page changes
                          style={{ minHeight: '800px' }}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
                        />
                      </div>
                    </div>
                  </>
                )}

                {previewCollapsed && (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Eye className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">Preview</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
