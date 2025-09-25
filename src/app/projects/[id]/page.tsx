'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeViewer } from '@/components/code-editor/code-viewer'
import MonacoEditor from '@monaco-editor/react'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  Share, 
  Edit,
  History,
  Settings,
  ExternalLink,
  FileText,
  FileCode,
  FileJson,
  Code,
  Sparkles,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Wrench,
  Bell,
  HelpCircle,
  Zap,
  Star,
  MoreHorizontal,
  Square,
  X,
  Send,
  Loader2,
  Trash2,
  Copy,
  PlusCircle,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

interface Project {
  id: string
  title: string
  description?: string
  prompt: string
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
  generations: Array<{
    id: string
    prompt: string
    aiProvider: string
    status: string
    createdAt: string
  }>
  history: Array<{
    id: string
    action: string
    details?: string
    createdAt: string
  }>
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('interact')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isModifying, setIsModifying] = useState(false)
  const [modificationPrompt, setModificationPrompt] = useState('')
  const [inputMode, setInputMode] = useState<'modify' | 'chat'>('chat')
  const [isGettingSuggestion, setIsGettingSuggestion] = useState(false)
  const [suggestionResponse, setSuggestionResponse] = useState('')
  const [showSuggestion, setShowSuggestion] = useState(false)
  const       [promptHistory, setPromptHistory] = useState<Array<{
        id: string
        prompt: string
        type: 'create' | 'update'
        timestamp: Date
        status: 'success' | 'failed' | 'pending'
        aiResponse?: string
      }>>([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatProvider, setChatProvider] = useState<'openai' | 'gemini'>('openai')
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string
    type: 'user' | 'ai'
    message: string
    timestamp: Date
    provider?: string
  }>>([
    {
      id: '1',
      type: 'ai',
      message: 'Hello! I\'m here to help you with your project. What would you like to know?',
      timestamp: new Date(),
      provider: 'openai'
    }
  ])
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [fileContent, setFileContent] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState<string>('')

  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const promptHistoryRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatHistory, isChatLoading])

  // Auto-scroll prompt history to latest
  useEffect(() => {
    if (promptHistoryRef.current) {
      promptHistoryRef.current.scrollTop = promptHistoryRef.current.scrollHeight
    }
  }, [promptHistory])

  // Load prompt history from API
  const getLanguageFromType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'HTML': 'html',
      'CSS': 'css',
      'JAVASCRIPT': 'javascript',
      'TYPESCRIPT': 'typescript',
      'JSON': 'json',
      'MARKDOWN': 'markdown',
    }
    return typeMap[type] || 'plaintext'
  }

  const fetchPromptHistory = async () => {
    if (!project) return
    
    try {
      const response = await fetch(`/api/projects/${params.id}/history`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.history) {
          setPromptHistory(data.history)
        }
      }
    } catch (error) {
      console.error('Error fetching prompt history:', error)
    }
  }

  useEffect(() => {
    if (project) {
      fetchPromptHistory()
      
      // Auto-select the first file if none is selected (prioritize index files)
      if (!selectedFile && project.files && project.files.length > 0) {
        // Find index file first, otherwise use first file
        const indexFile = project.files.find(file => 
          file.path.toLowerCase().includes('index.') || 
          file.path.toLowerCase().endsWith('index.html') ||
          file.path.toLowerCase().endsWith('index.js')
        )
        const firstFile = indexFile || project.files[0]
        console.log('Auto-selecting first file:', firstFile.path, 'Content length:', firstFile.content?.length)
        setSelectedFile(firstFile)
        setFileContent(firstFile.content || '')
      }
    }
  }, [project, selectedFile])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session) {
      fetchProject()
    }
  }, [session, status, router, params.id])

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
        if (data.project.files && data.project.files.length > 0) {
          // Find index file first, otherwise use first file
          const indexFile = data.project.files.find((file: any) => 
            file.path.toLowerCase().includes('index.') || 
            file.path.toLowerCase().endsWith('index.html') ||
            file.path.toLowerCase().endsWith('index.js')
          )
          const firstFile = indexFile || data.project.files[0]
          setSelectedFile(firstFile)
          setFileContent(firstFile.content)
        }
        
        if (data.project.status === 'GENERATING') {
          setIsGenerating(true)
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

  const handleFileUpdate = async (fileId: string, content: string) => {
    if (!project) return

    setProject({
      ...project,
      files: project.files ? project.files.map(file => 
        file.id === fileId ? { ...file, content } : file
      ) : []
    })

    try {
      const response = await fetch(`/api/projects/${params.id}/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        toast.error('Failed to save changes')
        fetchProject()
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save changes')
      fetchProject()
    }
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

  const addPromptToHistory = (prompt: string, type: 'create' | 'update', status: 'success' | 'failed' | 'pending' = 'pending', aiResponse?: string) => {
    const newPrompt = {
      id: Date.now().toString(),
      prompt,
      type,
      timestamp: new Date(),
      status,
      ...(aiResponse && { aiResponse }) // Only include aiResponse if it exists
    }
    setPromptHistory(prev => [...prev, newPrompt])
    return newPrompt.id
  }

  const updatePromptStatus = (id: string, status: 'success' | 'failed', aiResponse?: string) => {
    setPromptHistory(prev => 
      prev.map(prompt => 
        prompt.id === id ? { 
          ...prompt, 
          status, 
          ...(aiResponse && { aiResponse })
        } : prompt
      )
    )
  }

  const handleAIModification = async () => {
    if (!modificationPrompt.trim()) {
      toast.error('Please enter a modification prompt')
      return
    }

    if (!project) {
      toast.error('Project not found')
      return
    }

    const promptId = addPromptToHistory(modificationPrompt, 'update', 'pending')
    setIsModifying(true)
    
    try {
      const response = await fetch(`/api/projects/${params.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: modificationPrompt,
          provider: 'cerebras', // Default to cerebras
          isModification: true,
          currentFiles: project.files.map(file => ({
            path: file.path,
            content: file.content,
            type: file.type
          }))
        }),
      })

      const data = await response.json()

          if (response.ok && data.success) {
            toast.success('Project updated successfully!')
            // Extract content from the AI response
            const aiResponseContent = data.content
            updatePromptStatus(promptId, 'success', aiResponseContent)
            
            // Refresh the project data and prompt history
            await fetchProject()
            await fetchPromptHistory()
            
            // Clear the prompt
            setModificationPrompt('')
          } else {
            toast.error(data.error || 'Failed to update project')
            updatePromptStatus(promptId, 'failed', data.error)
          }
    } catch (error) {
      console.error('Modification error:', error)
      toast.error('Failed to update project')
      updatePromptStatus(promptId, 'failed')
    } finally {
      setIsModifying(false)
    }
  }

  const clearChatHistory = () => {
    setChatHistory([
      {
        id: '1',
        type: 'ai',
        message: 'Hello! I\'m here to help you with your project. What would you like to know?',
        timestamp: new Date(),
        provider: chatProvider
      }
    ])
  }

  const clearPromptHistory = async () => {
    try {
      // Clear from database
      const response = await fetch(`/api/projects/${params.id}/history`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Clear from local state
        setPromptHistory([])
        toast.success('Prompt history cleared')
      } else {
        toast.error('Failed to clear prompt history')
      }
    } catch (error) {
      console.error('Error clearing prompt history:', error)
      toast.error('Failed to clear prompt history')
    }
  }

  const handleChatMessage = async () => {
    if (!chatMessage.trim()) {
      return
    }

    const userMessage = chatMessage.trim()
    setIsChatLoading(true)
    
    // Add user message to history
    const userMessageId = Date.now().toString()
    setChatHistory(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      message: userMessage,
      timestamp: new Date()
    }])
    
    // Clear the input
    setChatMessage('')
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          provider: chatProvider,
          projectId: params.id
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Add AI response to history
        setChatHistory(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          message: data.response,
          timestamp: new Date(),
          provider: data.provider
        }])
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      
      // Add error message to history
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        provider: chatProvider
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleAISuggestion = async () => {
    if (!modificationPrompt.trim()) {
      toast.error('Please enter a question or request')
      return
    }

    setIsGettingSuggestion(true)
    setShowSuggestion(false)
    
    try {
      const response = await fetch(`/api/projects/${params.id}/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: modificationPrompt,
          provider: 'cerebras'
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuggestionResponse(data.suggestion)
        setShowSuggestion(true)
        setModificationPrompt('')
        toast.success('AI suggestion generated successfully!')
      } else {
        throw new Error(data.error || 'Failed to get AI suggestion')
      }
    } catch (error) {
      console.error('AI suggestion error:', error)
      toast.error('Failed to get AI suggestion')
    } finally {
      setIsGettingSuggestion(false)
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Project link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleFileSelect = (file: any) => {
    console.log('Selecting file:', file.path, 'Content length:', file.content?.length)
    setSelectedFile(file)
    setFileContent(file.content || '')
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

  const getCombinedHTMLContent = (targetFile?: string) => {
    if (!project) return ''
    
    // If targetFile is specified, try to find that specific HTML file
    let htmlFile = project.files?.find(f => f.type === 'HTML' && f.path === targetFile)
    
    // If target file not found, fall back to main HTML file
    if (!htmlFile) {
      htmlFile = project.files?.find(f => f.type === 'HTML')
    }
    
    if (!htmlFile) return ''
    
    let htmlContent = htmlFile.content
    
    // Get all CSS files
    const cssFiles = project.files?.filter(f => f.type === 'CSS') || []
    const cssContent = cssFiles.map(f => f.content).join('\n')
    
    // Get all JavaScript files
    const jsFiles = project.files?.filter(f => f.type === 'JAVASCRIPT') || []
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'css':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'js':
      case 'jsx':
        return <FileCode className="h-4 w-4 text-yellow-500" />
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-blue-600" />
      case 'json':
        return <FileJson className="h-4 w-4 text-green-500" />
      case 'md':
      case 'markdown':
        return <FileText className="h-4 w-4 text-gray-500" />
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
                <span className="font-medium">{name}</span>
              </div>
            </div>
            {/* Render folder contents */}
            {hasChildren && isExpanded && (
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
            className={`flex items-center space-x-2 p-2 rounded cursor-pointer text-sm transition-colors ${
              selectedFile?.id === item.id
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-700 text-gray-300'
            }`}
          >
            <div style={{ paddingLeft: `${level * 16}px` }} className="flex items-center space-x-2">
              <div className="w-4 h-4" /> {/* Spacer for alignment */}
              {getFileIcon(item.path)}
              <span className="truncate">{name}</span>
            </div>
          </div>
        )
      }
    })
    
    return items
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session || !project) {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="text-lg font-semibold text-white">ai-website-builder</span>
            </div>
          </div>
          
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm ${
                      activeTab === 'preview' 
                        ? 'text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Design
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('interact')}
                    className={`px-4 py-2 text-sm ${
                      activeTab === 'interact' 
                        ? 'text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Interact
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-2 text-sm ${
                      activeTab === 'code' 
                        ? 'text-blue-400 border-b-2 border-blue-400' 
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Code
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(`/projects/${params.id}/code`, '_blank')}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                    title="Open Code Editor in New Window"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Code
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Open the project preview in a new tab with proper URL
                      const previewUrl = `/projects/${project?.id}/preview`
                      window.open(previewUrl, '_blank')
                    }}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                    title="Open Preview in New Window"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Open the project preview in fullscreen mode
                      const fullscreenUrl = `/projects/${project?.id}/fullscreen`
                      window.open(fullscreenUrl, '_blank')
                    }}
                    className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                    title="Open Fullscreen Preview"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Fullscreen
                  </Button>
                </div>
                
                <ProfileDropdown />
              </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex w-full pt-20">
            {/* Left Sidebar - Chat Interface */}
            <div className="w-80 bg-black border-r border-gray-800 flex flex-col h-[calc(100vh-80px)]">
          {/* Project Identifier */}
          <div className="p-4 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">{project.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{project.title}</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-b border-gray-800 flex-shrink-0">
            <div className="flex">
              <button className="flex-1 py-3 px-4 text-sm font-medium text-blue-400 border-b-2 border-blue-400">
                Chat
              </button>
              <button className="flex-1 py-3 px-4 text-sm font-medium text-gray-400 hover:text-white">
                History
              </button>
            </div>
          </div>
          
          {/* Unified Chat and History Area */}
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            <div className="space-y-4">
              {/* Sample User Message */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-800 rounded-lg p-3 max-w-md">
                    <p className="text-sm text-white">
                      Create a complete AI Website Builder platform using Next.js (latest App Router) with TypeScript, MySQL (via Prisma ORM), and best modern packages/libraries
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-gray-400">This platform</span>
                      <ArrowLeft className="h-3 w-3 text-gray-400 ml-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample AI Response */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">AI</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-800 rounded-lg p-3 max-w-md">
                    <p className="text-sm text-white">
                      Cannot proceed here: this repo is Vite + Express, but you requested Next.js (App Router). Please either:
                    </p>
                    <ul className="text-sm text-white mt-2 space-y-1">
                      <li>• Connect a Next.js repo or use our tools: GitHub repo, Local repo, or VS Code extension.</li>
                      <li>• Then I'll implement the full platform (NextAuth email/Google/GitHub, Prisma MySQL models, AI orchestration for OpenAI/Anthropic/Gemini, Monaco editor, dashboard/history, diff-based updates, S3 export, Zustand, shadcn/framer-motion) and a production homepage. Confirm AI providers to enable and your MySQL host (PlanetScale/RDS), and I'll scaffold immediately.</li>
                    </ul>
                    <div className="flex items-center space-x-2 mt-3">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Copy className="h-3 w-3 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Star className="h-3 w-3 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <CheckCircle className="h-3 w-3 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Restore Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Restore to this point
                </Button>
              </div>

              {/* Prompt History Items - Merged with Chat */}
              {promptHistory
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((prompt) => (
                <div key={prompt.id} className="space-y-3">
                  {/* User Prompt */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-800 rounded-lg p-3 max-w-md cursor-pointer hover:bg-gray-750 transition-colors"
                           onClick={() => setModificationPrompt(prompt.prompt)}>
                        <p className="text-sm text-white">{prompt.prompt}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          {/* Type Icon */}
                          {prompt.type === 'create' ? (
                            <div title="Create">
                              <PlusCircle className="h-4 w-4 text-green-500" />
                            </div>
                          ) : (
                            <div title="Update">
                              <Edit3 className="h-4 w-4 text-blue-500" />
                            </div>
                          )}
                          {/* Status Icon */}
                          {prompt.status === 'success' ? (
                            <div title="Success">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                          ) : prompt.status === 'failed' ? (
                            <div title="Failed">
                              <XCircle className="h-4 w-4 text-red-500" />
                            </div>
                          ) : (
                            <div title="Pending">
                              <Clock3 className="h-4 w-4 text-yellow-500" />
                            </div>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(prompt.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  {prompt.aiResponse && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">AI</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-lg p-3 max-w-md">
                          <p className="text-sm text-white">{prompt.aiResponse}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(prompt.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


          {/* Input Area */}
          <div className="p-4 border-t border-gray-800 flex-shrink-0">
            {/* Mode Toggle */}
            <div className="flex items-center space-x-2 mb-3">
              <Button
                variant={inputMode === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('chat')}
                className={`px-3 py-1 text-xs ${
                  inputMode === 'chat' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Chat
              </Button>
              <Button
                variant={inputMode === 'modify' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setInputMode('modify')}
                className={`px-3 py-1 text-xs ${
                  inputMode === 'modify' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Wrench className="h-3 w-3 mr-1" />
                Modify
              </Button>
            </div>

            <div className="relative">
              <textarea
                placeholder={inputMode === 'chat' ? "Ask AI for suggestions about your project..." : "Describe the changes you want to make..."}
                value={modificationPrompt}
                onChange={(e) => setModificationPrompt(e.target.value)}
                className="w-full px-4 py-3 pr-20 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-900 text-white placeholder-gray-400"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (inputMode === 'chat') {
                      handleAISuggestion()
                    } else {
                      handleAIModification()
                    }
                  }
                }}
                disabled={isModifying || isGettingSuggestion}
              />
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-gray-700"
                  title="Add attachment"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-gray-700"
                  title="Tools"
                >
                  <Wrench className="h-4 w-4 text-gray-400" />
                </Button>
                <Button
                  onClick={inputMode === 'chat' ? handleAISuggestion : handleAIModification}
                  disabled={(isModifying || isGettingSuggestion) || !modificationPrompt.trim()}
                  className={`h-8 w-8 p-0 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    inputMode === 'chat' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  title={inputMode === 'chat' ? "Get AI suggestion" : "Apply modification"}
                >
                  {(isModifying || isGettingSuggestion) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* AI Suggestion Response */}
            {showSuggestion && suggestionResponse && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">AI</span>
                    </div>
                    <h4 className="text-white font-medium">AI Suggestion</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestion(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {suggestionResponse}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInputMode('modify')
                        setModificationPrompt(suggestionResponse) // Use the actual AI suggestion content
                        setShowSuggestion(false)
                      }}
                      className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Apply Suggestions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(suggestionResponse)
                        toast.success('Suggestion copied to clipboard')
                      }}
                      className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <span className="text-xs text-gray-400">
                    Generated by AI • {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
            
            {/* <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Auto
                </Button>
                {promptHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPromptHistory}
                    className="text-gray-400 hover:text-white"
                    title="Clear prompt history"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>
             */}
          </div>

        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {activeTab === 'preview' && (
              <div className="h-full">
                <Card className="h-full bg-gray-900 border-gray-800">
                  <CardContent className="p-0 h-full">
                    {project.files?.find(f => f.type === 'HTML') ? (
                      <iframe
                        srcDoc={getCombinedHTMLContent(currentPage)}
                        className="w-full h-full border-0 rounded-lg"
                        title="Preview"
                        key={currentPage} // Force re-render when page changes
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center text-gray-400">
                          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No HTML file found for preview</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'interact' && (
              <div className="h-full">
                <Card className="h-full bg-gray-900 border-gray-800">
                  <CardContent className="p-6 h-full">
                    <div className="flex flex-col h-full">
                      <h3 className="text-2xl font-bold text-white mb-6">Project Interaction</h3>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-white">Quick Actions</h4>
                          <div className="space-y-3">
                            <Button 
                              onClick={() => setActiveTab('preview')}
                              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Live Preview
                            </Button>
                            <Button 
                              onClick={() => setActiveTab('code')}
                              className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Code className="h-4 w-4 mr-2" />
                              Edit Code
                            </Button>
                            <Button 
                              onClick={handleDownload}
                              className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Project
                            </Button>
                            <Button 
                              onClick={handleShare}
                              className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <Share className="h-4 w-4 mr-2" />
                              Share Project
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-white">Project Info</h4>
                          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                project.status === 'COMPLETED' ? 'bg-green-600 text-white' :
                                project.status === 'GENERATING' ? 'bg-blue-600 text-white' :
                                project.status === 'FAILED' ? 'bg-red-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {project.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Files:</span>
                              <span className="ml-2 text-white">{project.files?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Created:</span>
                              <span className="ml-2 text-white">{new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Last Updated:</span>
                              <span className="ml-2 text-white">{new Date(project.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="h-full flex">
                {project.files && project.files.length > 0 ? (
                  <>
                    {/* File Tree Sidebar */}
                    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Project Files</h3>
                      <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {project.files && project.files.length > 0 ? (
                          renderFolderStructure(sortFilesWithIndexFirst(organizeFilesIntoFolders(project.files)))
                        ) : (
                          <div className="text-gray-500 text-sm p-2">No files available</div>
                        )}
                      </div>
                    </div>

                    {/* Code Editor Area */}
                    <div className="flex-1 bg-gray-900 flex flex-col">
                      <div className="flex-1 p-0">
                        <div className="bg-gray-800 rounded-lg h-full flex flex-col">
                          <div className="flex items-center space-x-2 p-4 border-b border-gray-700">
                            <div className="flex space-x-1">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-sm text-gray-300">
                              {selectedFile ? (selectedFile.path.split('/').pop() || selectedFile.path) : 'No file selected'}
                            </span>
                          </div>
                          <div className="flex-1 p-4">
                            {selectedFile ? (
                              <MonacoEditor
                                height="calc(100vh - 200px)"
                                value={fileContent}
                                language={getLanguageFromType(selectedFile.type)}
                                theme="vs-dark"
                                path={selectedFile.path}
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
                                  bracketPairGuides: {
                                    bracketPairs: false,
                                    bracketPairsHorizontal: "active",
                                    highlightActiveBracketPair: true,
                                    indentation: true,
                                    highlightActiveIndentation: true,
                                  },
                                  stickyTabStops: false,
                                  codeLens: true,
                                  colorDecorators: true,
                                  colorDecoratorActivatedOn: "clickAndHover",
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
                                    globalFindClipboard: false,
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
                                  lightbulb: {
                                    enabled: "onCode",
                                  },
                                  lineDecorationsWidth: 10,
                                  lineNumbers: "on",
                                  lineNumbersMinChars: 5,
                                  links: true,
                                  matchBrackets: "always",
                                  minimap: {
                                    enabled: true,
                                    autohide: false,
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
                                onMount={(editor) => {
                                  // Set accessibility attributes
                                  const editorElement = editor.getDomNode()
                                  if (editorElement && selectedFile) {
                                    editorElement.setAttribute('id', `monaco-editor-${selectedFile.id}`)
                                    editorElement.setAttribute('name', `monaco-editor-${selectedFile.path}`)
                                    editorElement.setAttribute('role', 'textbox')
                                    editorElement.setAttribute('aria-label', `Code editor for ${selectedFile.path}`)
                                    editorElement.setAttribute('aria-multiline', 'true')
                                  }
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
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 w-full">
                    <div className="text-center text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No files available</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'next' && (
              <div className="h-full">
                <div className="text-center py-12">
                  <div className="mb-6">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-xl font-semibold text-white mb-2">Next Steps</h3>
                    <p className="text-gray-300 mb-6">
                      Continue building your project with advanced features and integrations.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-md transition-all hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => router.push(`/projects/${project.id}/components`)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          <Code className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-white">Add Components</h4>
                      </div>
                      <p className="text-sm text-gray-300">Add React components and advanced features</p>
                    </Card>
                    
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-md transition-all hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => router.push(`/projects/${project.id}/configure`)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Settings className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-white">Configure</h4>
                      </div>
                      <p className="text-sm text-gray-300">Set up build tools and deployment</p>
                    </Card>
                    
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-md transition-all hover:scale-105 bg-gray-800 border-gray-700"
                      onClick={() => router.push(`/projects/${project.id}/deploy`)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-purple-600 rounded-lg">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-white">Deploy</h4>
                      </div>
                      <p className="text-sm text-gray-300">Deploy to production with one click</p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


          {/* Fixed AI Chat Widget */}
          <div className="fixed bottom-6 right-6 z-50">
            {!isChatOpen ? (
              <Button
                onClick={() => setIsChatOpen(true)}
                className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            ) : (
              <div className="w-80 h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">AI</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">AI Assistant</h3>
                      <p className="text-xs text-gray-400">Ask me anything!</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatOpen(false)}
                    className="h-8 w-8 p-0 hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>

                {/* Chat Messages */}
                <div ref={chatMessagesRef} className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatHistory.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-white'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatRelativeTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 text-white px-3 py-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ask AI for help..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleChatMessage()
                        }
                      }}
                      disabled={isChatLoading}
                    />
                    <Button
                      onClick={handleChatMessage}
                      disabled={isChatLoading || !chatMessage.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
    </div>
  )
}