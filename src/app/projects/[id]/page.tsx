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
import { formatRelativeTime, formatDateTime, formatTime, formatDateOnly } from '@/lib/utils'
// Removed HTML completion imports - using AI-generated content directly

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
  const [enhancePrompt, setEnhancePrompt] = useState(false)
  
  // Streaming status state
  const [streamingStatus, setStreamingStatus] = useState('')
  const [streamingProgress, setStreamingProgress] = useState(0)
  const [streamingFiles, setStreamingFiles] = useState<any[]>([])
  const [streamingStatusHistory, setStreamingStatusHistory] = useState<string[]>([])
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
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [fileContent, setFileContent] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState<string>('')

  const promptHistoryRef = useRef<HTMLDivElement>(null)


  // Auto-scroll prompt history to latest
  useEffect(() => {
    if (promptHistoryRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      setTimeout(() => {
        if (promptHistoryRef.current) {
          // Smooth scroll to bottom
          promptHistoryRef.current.scrollTo({
            top: promptHistoryRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [promptHistory])

  // Auto-scroll when modification status changes
  useEffect(() => {
    if (promptHistoryRef.current && isModifying) {
      // Scroll to bottom when modification starts
      setTimeout(() => {
        if (promptHistoryRef.current) {
          promptHistoryRef.current.scrollTo({
            top: promptHistoryRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [isModifying])

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
      // File selection is now handled by the separate useEffect below
    }
  }, [project])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session) {
      fetchProject()
    }
  }, [session, status, router, params.id])

  // Reset to index/home file on page load/reload
  useEffect(() => {
    // Reset selected file when component mounts or project ID changes
    setSelectedFile(null)
    setFileContent('')
  }, [params.id])

  // Auto-select index/home file only when project first loads (not when user manually selects files)
  useEffect(() => {
    if (project && project.files && project.files.length > 0 && !selectedFile) {
      // Only auto-select when no file is currently selected (initial load)
      const indexHtmlFile = project.files.find(file => 
        file.path.toLowerCase().endsWith('index.html')
      )
      const homeHtmlFile = project.files.find(file => 
        file.path.toLowerCase().endsWith('home.html')
      )
      const indexJsFile = project.files.find(file => 
        file.path.toLowerCase().endsWith('index.js')
      )
      const firstHtmlFile = project.files.find(file => 
        file.path.toLowerCase().endsWith('.html')
      )
      
      const priorityFile = indexHtmlFile || homeHtmlFile || indexJsFile || firstHtmlFile || project.files[0]
      
      console.log('Auto-selecting priority file on initial load:', priorityFile.path)
      setSelectedFile(priorityFile)
      setFileContent(priorityFile.content || '')
    }
  }, [project]) // Removed selectedFile from dependencies to prevent re-running when user selects files

  // Auto-refresh when project is generating
  useEffect(() => {
    if (project?.status === 'GENERATING') {
      const interval = setInterval(() => {
        fetchProject()
      }, 2000) // Poll every 2 seconds

      return () => clearInterval(interval)
    }
  }, [project?.status])

  // Handle streaming status updates from the API
  useEffect(() => {
    if (project?.status === 'GENERATING') {
      // Set up EventSource to listen for streaming updates
      const eventSource = new EventSource(`/api/projects/${params.id}/stream`)
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'status') {
            // Update status and progress from API response
            setStreamingStatus(data.data.status)
            setStreamingProgress(data.data.progress)
            
            // Add to status history
            setStreamingStatusHistory(prev => {
              const newHistory = [...prev, data.data.status]
              return newHistory.slice(-8) // Keep last 8 status updates
            })
          } else if (data.type === 'file') {
            // Add new file to streaming files
            setStreamingFiles(prev => [...prev, data.data])
          } else if (data.type === 'complete') {
            // Generation completed
            setStreamingStatus('Generation completed!')
            setStreamingProgress(100)
            setStreamingStatusHistory(prev => [...prev, 'Generation completed!'])
            
            // Close the event source
            eventSource.close()
            
            // Refresh the project data to get the latest files
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          } else if (data.type === 'error') {
            // Handle error
            setStreamingStatus('Generation failed')
            setStreamingStatusHistory(prev => [...prev, 'Generation failed'])
            eventSource.close()
          }
        } catch (error) {
          console.error('Error parsing streaming data:', error)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error)
        eventSource.close()
      }
      
      return () => {
        eventSource.close()
      }
    } else if (project?.status === 'COMPLETED') {
      setStreamingStatus('Generation completed!')
      setStreamingProgress(100)
    }
  }, [project?.status, params.id])

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

    let finalPrompt = modificationPrompt
    const promptId = addPromptToHistory(modificationPrompt, 'update', 'pending')
    setIsModifying(true)
    
    try {
      // If enhance is enabled, enhance the prompt first
      if (enhancePrompt) {
        try {
          const enhanceResponse = await fetch('/api/ai/enhance-prompt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: modificationPrompt,
              context: 'website-modification',
              projectType: 'website'
            }),
          })

          if (enhanceResponse.ok) {
            const enhanceData = await enhanceResponse.json()
            if (enhanceData.success && enhanceData.enhancedPrompt) {
              finalPrompt = enhanceData.enhancedPrompt
              // Don't add enhanced prompt to history - keep only user's original prompt
            }
          }
        } catch (enhanceError) {
          console.warn('Prompt enhancement failed, using original prompt:', enhanceError)
          // Continue with original prompt if enhancement fails
        }
      }

      const response = await fetch(`/api/projects/${params.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
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
            // Show different message based on whether enhancement was used
            const statusMessage = enhancePrompt 
              ? `Enhanced prompt applied: ${aiResponseContent}` 
              : aiResponseContent
            updatePromptStatus(promptId, 'success', statusMessage)
            
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
    console.log('File content preview:', file.content?.substring(0, 200) + '...')
    console.log('File type:', file.type)
    
    // Use the original AI-generated content directly
    let content = file.content || ''
    console.log('Using original AI-generated content for', file.path, 'length:', content.length)
    
    setSelectedFile(file)
    setFileContent(content)
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
    
    // Advanced project detection and logging
    const htmlFiles = project.files?.filter(f => f.type === 'HTML') || []
    const isAdvancedProject = htmlFiles.length >= 5 && cssFiles.length >= 2 && jsFiles.length >= 2
    
    if (isAdvancedProject) {
      console.log(`🚀 Advanced project detected: ${htmlFiles.length} HTML files, ${cssFiles.length} CSS files, ${jsFiles.length} JS files`)
      console.log(`📁 HTML files: ${htmlFiles.map(f => f.path).join(', ')}`)
      console.log(`🎨 CSS files: ${cssFiles.map(f => f.path).join(', ')}`)
      console.log(`⚡ JS files: ${jsFiles.map(f => f.path).join(', ')}`)
      console.log(`📊 Total files: ${project.files?.length || 0}`)
    }
    
    // Inject CSS into the HTML
    if (cssContent) {
      // Keep external CSS links (fonts, CDNs) but remove local CSS links
      htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
      
      // Add Bootstrap CSS and Icons if the HTML references Bootstrap
      let bootstrapCSS = ''
      if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
        bootstrapCSS = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">'
      }
      
      // Add all popular CDN libraries if the HTML uses them
      let cdnLibraries = ''
      
      // Icon Libraries
      if (htmlContent.includes('bi bi-') || htmlContent.includes('bootstrap-icons')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">\n'
      }
      if (htmlContent.includes('fa fa-') || htmlContent.includes('fas fa-') || htmlContent.includes('far fa-') || htmlContent.includes('fab fa-') || htmlContent.includes('font-awesome')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">\n'
      }
      if (htmlContent.includes('material-icons') || htmlContent.includes('material-symbols')) {
        cdnLibraries += '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">\n'
      }
      if (htmlContent.includes('feather-') || htmlContent.includes('feather-icons')) {
        cdnLibraries += '<script src="https://unpkg.com/feather-icons"></script>\n'
      }
      if (htmlContent.includes('heroicon') || htmlContent.includes('heroicons')) {
        cdnLibraries += '<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline/index.js"></script>\n'
      }
      if (htmlContent.includes('lucide') || htmlContent.includes('lucide-react')) {
        cdnLibraries += '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>\n'
      }
      
      // CSS Frameworks
      if (htmlContent.includes('tailwind') || htmlContent.includes('tw-') || htmlContent.includes('bg-blue-')) {
        cdnLibraries += '<script src="https://cdn.tailwindcss.com"></script>\n'
      }
      if (htmlContent.includes('bulma') || htmlContent.includes('is-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">\n'
      }
      if (htmlContent.includes('foundation') || htmlContent.includes('foundation-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/foundation-sites@6.7.5/dist/css/foundation.min.css">\n'
      }
      if (htmlContent.includes('semantic-ui') || htmlContent.includes('ui ')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">\n'
      }
      if (htmlContent.includes('materialize') || htmlContent.includes('materialize-css')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">\n'
      }
      
      // Animation Libraries
      if (htmlContent.includes('animate') || htmlContent.includes('animated') || htmlContent.includes('fadeIn')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">\n'
      }
      if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
        cdnLibraries += '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">\n'
      }
      if (htmlContent.includes('gsap') || htmlContent.includes('TweenMax') || htmlContent.includes('TimelineMax')) {
        cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n'
      }
      if (htmlContent.includes('lottie') || htmlContent.includes('lottie-player')) {
        cdnLibraries += '<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>\n'
      }
      
      // Chart Libraries
      if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
      }
      if (htmlContent.includes('d3') || htmlContent.includes('d3-')) {
        cdnLibraries += '<script src="https://d3js.org/d3.v7.min.js"></script>\n'
      }
      if (htmlContent.includes('plotly') || htmlContent.includes('Plotly')) {
        cdnLibraries += '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n'
      }
      if (htmlContent.includes('highcharts') || htmlContent.includes('Highcharts')) {
        cdnLibraries += '<script src="https://code.highcharts.com/highcharts.js"></script>\n'
      }
      
      // UI Component Libraries
      if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css">\n'
      }
      if (htmlContent.includes('slick') || htmlContent.includes('slick-carousel')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css">\n'
      }
      if (htmlContent.includes('owl-carousel') || htmlContent.includes('owl-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">\n'
      }
      if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/css/lightbox.min.css">\n'
      }
      if (htmlContent.includes('fancybox') || htmlContent.includes('data-fancybox')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css">\n'
      }
      
      // Form Libraries
      if (htmlContent.includes('select2') || htmlContent.includes('select2-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">\n'
      }
      if (htmlContent.includes('flatpickr') || htmlContent.includes('flatpickr-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n'
      }
      if (htmlContent.includes('quill') || htmlContent.includes('ql-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.6/quill.snow.css">\n'
      }
      
      // Utility Libraries
      if (htmlContent.includes('lodash') || htmlContent.includes('_.')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n'
      }
      if (htmlContent.includes('moment') || htmlContent.includes('moment.js')) {
        cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>\n'
      }
      if (htmlContent.includes('dayjs') || htmlContent.includes('day.js')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>\n'
      }
      
      // Google Fonts
      if (htmlContent.includes('google-fonts') || htmlContent.includes('fonts.googleapis.com')) {
        cdnLibraries += '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      }
      
      htmlContent = htmlContent.replace('</head>', `${bootstrapCSS}\n${cdnLibraries}<style>\n${cssContent}\n</style>\n</head>`)
    } else {
      // Add Bootstrap CSS and Icons if needed even without custom CSS
      let bootstrapCSS = ''
      if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
        bootstrapCSS = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">'
      }
      
      // Add all popular CDN libraries if the HTML uses them (same as above)
      let cdnLibraries = ''
      
      // Icon Libraries
      if (htmlContent.includes('bi bi-') || htmlContent.includes('bootstrap-icons')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">\n'
      }
      if (htmlContent.includes('fa fa-') || htmlContent.includes('fas fa-') || htmlContent.includes('far fa-') || htmlContent.includes('fab fa-') || htmlContent.includes('font-awesome')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">\n'
      }
      if (htmlContent.includes('material-icons') || htmlContent.includes('material-symbols')) {
        cdnLibraries += '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">\n'
      }
      if (htmlContent.includes('feather-') || htmlContent.includes('feather-icons')) {
        cdnLibraries += '<script src="https://unpkg.com/feather-icons"></script>\n'
      }
      if (htmlContent.includes('heroicon') || htmlContent.includes('heroicons')) {
        cdnLibraries += '<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline/index.js"></script>\n'
      }
      if (htmlContent.includes('lucide') || htmlContent.includes('lucide-react')) {
        cdnLibraries += '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>\n'
      }
      
      // CSS Frameworks
      if (htmlContent.includes('tailwind') || htmlContent.includes('tw-') || htmlContent.includes('bg-blue-')) {
        cdnLibraries += '<script src="https://cdn.tailwindcss.com"></script>\n'
      }
      if (htmlContent.includes('bulma') || htmlContent.includes('is-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">\n'
      }
      if (htmlContent.includes('foundation') || htmlContent.includes('foundation-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/foundation-sites@6.7.5/dist/css/foundation.min.css">\n'
      }
      if (htmlContent.includes('semantic-ui') || htmlContent.includes('ui ')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">\n'
      }
      if (htmlContent.includes('materialize') || htmlContent.includes('materialize-css')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">\n'
      }
      
      // Animation Libraries
      if (htmlContent.includes('animate') || htmlContent.includes('animated') || htmlContent.includes('fadeIn')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">\n'
      }
      if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
        cdnLibraries += '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">\n'
      }
      if (htmlContent.includes('gsap') || htmlContent.includes('TweenMax') || htmlContent.includes('TimelineMax')) {
        cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n'
      }
      if (htmlContent.includes('lottie') || htmlContent.includes('lottie-player')) {
        cdnLibraries += '<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>\n'
      }
      
      // Chart Libraries
      if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
      }
      if (htmlContent.includes('d3') || htmlContent.includes('d3-')) {
        cdnLibraries += '<script src="https://d3js.org/d3.v7.min.js"></script>\n'
      }
      if (htmlContent.includes('plotly') || htmlContent.includes('Plotly')) {
        cdnLibraries += '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n'
      }
      if (htmlContent.includes('highcharts') || htmlContent.includes('Highcharts')) {
        cdnLibraries += '<script src="https://code.highcharts.com/highcharts.js"></script>\n'
      }
      
      // UI Component Libraries
      if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css">\n'
      }
      if (htmlContent.includes('slick') || htmlContent.includes('slick-carousel')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css">\n'
      }
      if (htmlContent.includes('owl-carousel') || htmlContent.includes('owl-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">\n'
      }
      if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/css/lightbox.min.css">\n'
      }
      if (htmlContent.includes('fancybox') || htmlContent.includes('data-fancybox')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css">\n'
      }
      
      // Form Libraries
      if (htmlContent.includes('select2') || htmlContent.includes('select2-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">\n'
      }
      if (htmlContent.includes('flatpickr') || htmlContent.includes('flatpickr-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n'
      }
      if (htmlContent.includes('quill') || htmlContent.includes('ql-')) {
        cdnLibraries += '<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.6/quill.snow.css">\n'
      }
      
      // Utility Libraries
      if (htmlContent.includes('lodash') || htmlContent.includes('_.')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n'
      }
      if (htmlContent.includes('moment') || htmlContent.includes('moment.js')) {
        cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>\n'
      }
      if (htmlContent.includes('dayjs') || htmlContent.includes('day.js')) {
        cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>\n'
      }
      
      // Google Fonts
      if (htmlContent.includes('google-fonts') || htmlContent.includes('fonts.googleapis.com')) {
        cdnLibraries += '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      }
      
      if (bootstrapCSS || cdnLibraries) {
        htmlContent = htmlContent.replace('</head>', `${bootstrapCSS}\n${cdnLibraries}</head>`)
      }
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
      // Remove existing script tags that reference external files, but keep essential CDNs
      htmlContent = htmlContent.replace(/<script[^>]*src=["'][^"']*(?!bootstrap|jquery|popper|chart|d3|plotly|highcharts|gsap|lottie|feather|heroicon|lucide|lodash|moment|dayjs|select2|flatpickr|quill|swiper|slick|owl|lightbox|fancybox|aos|animate)[^"']*["'][^>]*><\/script>/gi, '')
      
      // Add JavaScript CDN libraries if the HTML references them
      let jsLibraries = ''
      
      // Core Libraries
      if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
        jsLibraries += '<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>\n'
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>\n'
        jsLibraries += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>\n'
      }
      
      // Animation Libraries
      if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
        jsLibraries += '<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>\n'
      }
      if (htmlContent.includes('gsap') || htmlContent.includes('TweenMax') || htmlContent.includes('TimelineMax')) {
        jsLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n'
      }
      if (htmlContent.includes('lottie') || htmlContent.includes('lottie-player')) {
        jsLibraries += '<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>\n'
      }
      
      // Chart Libraries
      if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
      }
      if (htmlContent.includes('d3') || htmlContent.includes('d3-')) {
        jsLibraries += '<script src="https://d3js.org/d3.v7.min.js"></script>\n'
      }
      if (htmlContent.includes('plotly') || htmlContent.includes('Plotly')) {
        jsLibraries += '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n'
      }
      if (htmlContent.includes('highcharts') || htmlContent.includes('Highcharts')) {
        jsLibraries += '<script src="https://code.highcharts.com/highcharts.js"></script>\n'
      }
      
      // UI Component Libraries
      if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"></script>\n'
      }
      if (htmlContent.includes('slick') || htmlContent.includes('slick-carousel')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>\n'
      }
      if (htmlContent.includes('owl-carousel') || htmlContent.includes('owl-')) {
        jsLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/owl.carousel.min.js"></script>\n'
      }
      if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
        jsLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/js/lightbox.min.js"></script>\n'
      }
      if (htmlContent.includes('fancybox') || htmlContent.includes('data-fancybox')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js"></script>\n'
      }
      
      // Form Libraries
      if (htmlContent.includes('select2') || htmlContent.includes('select2-')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>\n'
      }
      if (htmlContent.includes('flatpickr') || htmlContent.includes('flatpickr-')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>\n'
      }
      if (htmlContent.includes('quill') || htmlContent.includes('ql-')) {
        jsLibraries += '<script src="https://cdn.quilljs.com/1.3.6/quill.min.js"></script>\n'
      }
      
      // Utility Libraries
      if (htmlContent.includes('lodash') || htmlContent.includes('_.')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n'
      }
      if (htmlContent.includes('moment') || htmlContent.includes('moment.js')) {
        jsLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>\n'
      }
      if (htmlContent.includes('dayjs') || htmlContent.includes('day.js')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>\n'
      }
      
      // Icon Libraries (JavaScript)
      if (htmlContent.includes('feather-') || htmlContent.includes('feather-icons')) {
        jsLibraries += '<script src="https://unpkg.com/feather-icons"></script>\n'
      }
      if (htmlContent.includes('heroicon') || htmlContent.includes('heroicons')) {
        jsLibraries += '<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline/index.js"></script>\n'
      }
      if (htmlContent.includes('lucide') || htmlContent.includes('lucide-react')) {
        jsLibraries += '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>\n'
      }
      
      htmlContent = htmlContent.replace('</body>', `<script>\n${jsContent}\n</script>\n${jsLibraries}${navigationScript}\n</body>`)
    } else {
      // Add JavaScript CDN libraries if needed even without custom JS
      let jsLibraries = ''
      
      // Core Libraries
      if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
        jsLibraries += '<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>\n'
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.3/dist/umd/popper.min.js"></script>\n'
        jsLibraries += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>\n'
      }
      
      // Add other JavaScript libraries as needed (same logic as above)
      if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
        jsLibraries += '<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>\n'
      }
      if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
      }
      if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
        jsLibraries += '<script src="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"></script>\n'
      }
      if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
        jsLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/js/lightbox.min.js"></script>\n'
      }
      
      htmlContent = htmlContent.replace('</body>', `${jsLibraries}${navigationScript}\n</body>`)
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
        const isMainFile = name.toLowerCase().endsWith('index.html') || 
                          name.toLowerCase().endsWith('home.html') ||
                          (name.toLowerCase().endsWith('index.js') && !name.toLowerCase().includes('index.html'))
        
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
              {isMainFile && (
                <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">
                  Main
                </span>
              )}
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

  // Show streaming progress if project is still generating
  if (project.status === 'GENERATING') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <p className="text-gray-400">Generating your website...</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Generating</span>
              </div>
            </div>
          </div>

          {/* Streaming Progress */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <span>AI Generation in Progress</span>
                </CardTitle>
                <CardDescription>
                  Your website is being generated with advanced AI technology
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{streamingProgress}% - {streamingStatus || 'Preparing...'}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${streamingProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Current Status */}
                  {streamingStatus && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                      <span>{streamingStatus}</span>
                    </div>
                  )}

                  {/* Status History */}
                  {streamingStatusHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">Progress History</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {streamingStatusHistory.map((status, index) => (
                          <div key={index} className="flex items-center space-x-3 p-2 bg-gray-800/30 rounded text-sm">
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300">{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300">
                      Generated Files ({project.files.length + streamingFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {/* Existing project files */}
                      {project.files.map((file, index) => (
                        <div key={`existing-${index}`} className="flex items-center space-x-2 p-2 bg-gray-800/30 rounded">
                          <FileText className="h-4 w-4 text-blue-400" />
                          <span className="text-sm">{file.path}</span>
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        </div>
                      ))}
                      {/* Streaming files */}
                      {streamingFiles.map((file, index) => (
                        <div key={`streaming-${index}`} className="flex items-center space-x-2 p-2 bg-gray-800/30 rounded">
                          <FileText className="h-4 w-4 text-purple-400" />
                          <span className="text-sm">{file.path}</span>
                          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Auto-refresh notice */}
                  <div className="text-center text-sm text-gray-400">
                    <p>This page will automatically update when generation is complete</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
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
          <div ref={promptHistoryRef} className="flex-1 p-4 overflow-y-auto min-h-0 scroll-smooth">
            <div className="space-y-4">
          

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
            {/* Enhance Option */}
            <div className="flex items-center space-x-2 mb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhancePrompt}
                  onChange={(e) => setEnhancePrompt(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">Enhance prompt with AI</span>
              </label>
            </div>

            <div className="relative">
              <textarea
                placeholder="Describe the changes you want to make to your project..."
                value={modificationPrompt}
                onChange={(e) => setModificationPrompt(e.target.value)}
                className="w-full px-4 py-3 pr-20 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-900 text-white placeholder-gray-400"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                      handleAIModification()
                  }
                }}
                disabled={isModifying}
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
                  onClick={handleAIModification}
                  disabled={isModifying || !modificationPrompt.trim()}
                  className="h-8 w-8 p-0 text-white disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
                  title="Apply modification"
                >
                  {isModifying ? (
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
                    Generated by AI • {formatTime(new Date())}
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
                                (project.status as string) === 'GENERATING' ? 'bg-blue-600 text-white' :
                                project.status === 'FAILED' ? 'bg-red-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {project.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Files:</span>
                              <span className="ml-2 text-white">{project.files?.length || 0}</span>
                              {(() => {
                                const htmlFiles = project.files?.filter(f => f.type === 'HTML') || []
                                const cssFiles = project.files?.filter(f => f.type === 'CSS') || []
                                const jsFiles = project.files?.filter(f => f.type === 'JAVASCRIPT') || []
                                const isAdvanced = htmlFiles.length >= 5 && cssFiles.length >= 2 && jsFiles.length >= 2
                                
                                return isAdvanced ? (
                                  <span className="ml-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs rounded-full flex items-center">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Advanced
                                  </span>
                                ) : null
                              })()}
                            </div>
                            <div>
                              <span className="text-gray-400">Created:</span>
                              <span className="ml-2 text-white">{formatDateOnly(project.createdAt)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Last Updated:</span>
                              <span className="ml-2 text-white">{formatDateOnly(project.updatedAt)}</span>
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
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-white">Project Files</h3>
                        {(() => {
                          const htmlFiles = project.files?.filter(f => f.type === 'HTML') || []
                          const cssFiles = project.files?.filter(f => f.type === 'CSS') || []
                          const jsFiles = project.files?.filter(f => f.type === 'JAVASCRIPT') || []
                          const isAdvanced = htmlFiles.length >= 5 && cssFiles.length >= 2 && jsFiles.length >= 2
                          
                          return isAdvanced ? (
                            <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs rounded-full flex items-center">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Advanced
                            </span>
                          ) : null
                        })()}
                      </div>
                      {/* Advanced Project File Breakdown */}
                      {(() => {
                        const htmlFiles = project.files?.filter(f => f.type === 'HTML') || []
                        const cssFiles = project.files?.filter(f => f.type === 'CSS') || []
                        const jsFiles = project.files?.filter(f => f.type === 'JAVASCRIPT') || []
                        const otherFiles = project.files?.filter(f => !['HTML', 'CSS', 'JAVASCRIPT'].includes(f.type)) || []
                        const isAdvanced = htmlFiles.length >= 5 && cssFiles.length >= 2 && jsFiles.length >= 2
                        
                        return isAdvanced ? (
                          <div className="mb-3 p-2 bg-gray-700/50 rounded text-xs">
                            <div className="text-gray-300 mb-1">File Breakdown:</div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-blue-400">HTML:</span>
                                <span className="text-white">{htmlFiles.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-400">CSS:</span>
                                <span className="text-white">{cssFiles.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-yellow-400">JS:</span>
                                <span className="text-white">{jsFiles.length}</span>
                              </div>
                              {otherFiles.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Other:</span>
                                  <span className="text-white">{otherFiles.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null
                      })()}
                      
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


    </div>
  )
}