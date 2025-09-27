'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileDropdown } from '@/components/profile-dropdown'
import StreamingGenerator from '@/components/streaming-generator'
import FluidEffect from '@/components/fluid-effect'
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
  ArrowLeft,
  X,
  Image as ImageIcon,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [webglSupported, setWebglSupported] = useState(true)
  const [attachedImages, setAttachedImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedAIProvider, setSelectedAIProvider] = useState('cerebras')
  
  // Streaming progress states
  const [streamingStatus, setStreamingStatus] = useState('')
  const [streamingProgress, setStreamingProgress] = useState(0)
  const [streamingFiles, setStreamingFiles] = useState<any[]>([])
  const [streamingStatusHistory, setStreamingStatusHistory] = useState<string[]>([])
  const [currentProjectId, setCurrentProjectId] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebGL detection
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        setWebglSupported(!!gl)
      } catch (e) {
        setWebglSupported(false)
      }
    }

    checkWebGLSupport()
  }, [])

  // Mouse tracking effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => setIsHovering(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // Handle image upload
  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    
    setIsUploading(true)
    try {
      const validFiles: File[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`)
          continue
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`)
          continue
        }
        
        validFiles.push(file)
      }
      
      if (validFiles.length > 0) {
        setAttachedImages(prev => [...prev, ...validFiles])
        toast.success(`${validFiles.length} image(s) attached successfully`)
      }
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Failed to upload images')
    } finally {
      setIsUploading(false)
    }
  }

  // Remove attached image
  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Convert images to base64 for API
  const convertImagesToBase64 = async (files: File[]): Promise<string[]> => {
    const base64Images: string[] = []
    
    for (const file of files) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            // Remove data:image/...;base64, prefix
            const base64Data = result.split(',')[1]
            resolve(base64Data)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        base64Images.push(base64)
      } catch (error) {
        console.error('Error converting image to base64:', error)
        toast.error(`Failed to process ${file.name}`)
      }
    }
    
    return base64Images
  }

  // Handle website generation
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return
    
    setIsGenerating(true)
    // Reset streaming states
    setStreamingStatus('')
    setStreamingProgress(0)
    setStreamingFiles([])
    setStreamingStatusHistory([])
    setCurrentProjectId('')
    
    try {
      // Convert images to base64 if any are attached
      const imageData = attachedImages.length > 0 ? await convertImagesToBase64(attachedImages) : []
      
      const response = await fetch('/api/projects/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: selectedAIProvider,
          images: imageData // Include image data
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate website')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) return

      let projectId = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'project' && data.data.projectId) {
                projectId = data.data.projectId
                setCurrentProjectId(projectId)
                setStreamingStatus('Project created, starting generation...')
                setStreamingProgress(10)
                setStreamingStatusHistory(prev => [...prev, 'Project created, starting generation...'])
              } else if (data.type === 'status') {
                // Update streaming status and progress
                setStreamingStatus(data.data.status)
                setStreamingProgress(data.data.progress)
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
                
                // Redirect to project page after completion
                if (projectId) {
                  setTimeout(() => {
                  router.push(`/projects/${projectId}`)
                  }, 2000) // Wait 2 seconds to show completion status
                }
              } else if (data.type === 'error') {
                // Handle error
                setStreamingStatus('Generation failed')
                setStreamingStatusHistory(prev => [...prev, 'Generation failed'])
                toast.error(data.data.error || 'Generation failed')
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate website')
      setStreamingStatus('Generation failed')
      setStreamingStatusHistory(prev => [...prev, 'Generation failed'])
    } finally {
      setIsGenerating(false)
    }
  }

  // Enhanced smoke animation component with purple/blue gradients (fallback)
  const SmokeAnimation = () => {
    // Use deterministic values to avoid hydration mismatch
    const smokeElements = [
      { left: 15, top: 20, duration: 25, delay: 2, scale: 0.6 },
      { left: 85, top: 10, duration: 30, delay: 0, scale: 0.8 },
      { left: 25, top: 70, duration: 22, delay: 4, scale: 0.5 },
      { left: 75, top: 60, duration: 28, delay: 1, scale: 0.7 },
      { left: 45, top: 15, duration: 26, delay: 3, scale: 0.9 },
      { left: 10, top: 50, duration: 24, delay: 5, scale: 0.4 },
      { left: 90, top: 40, duration: 32, delay: 1.5, scale: 0.6 },
      { left: 35, top: 85, duration: 27, delay: 2.5, scale: 0.8 },
      { left: 65, top: 25, duration: 23, delay: 4.5, scale: 0.5 },
      { left: 20, top: 35, duration: 29, delay: 0.5, scale: 0.7 },
      { left: 80, top: 75, duration: 25, delay: 3.5, scale: 0.9 },
      { left: 55, top: 45, duration: 31, delay: 1.2, scale: 0.6 }
    ]

    return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {smokeElements.map((element, i) => (
        <div
          key={i}
          className="absolute opacity-30"
          style={{
              left: `${element.left}%`,
              top: `${element.top}%`,
              animation: `smokeFloat ${element.duration}s infinite linear`,
              animationDelay: `${element.delay}s`,
          }}
        >
          <div 
            className="w-48 h-48 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, rgba(59, 130, 246, 0.3) 30%, rgba(168, 85, 247, 0.2) 60%, transparent 100%)`,
                transform: `scale(${element.scale})`,
            }}
          />
        </div>
      ))}
      
      {/* Large central glow effect */}
      <div className="absolute left-1/4 top-1/3 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse">
        <div 
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(147, 51, 234, 0.6) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 100%)`,
          }}
        />
      </div>
    </div>
  )
  }

  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "AI-Powered Generation",
      description: "Generate complete websites from simple text prompts using advanced AI models"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Live Code Editor",
      description: "Edit and customize your generated code with our built-in Monaco editor"
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Real-time Preview",
      description: "See your changes instantly with live preview functionality"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export & Deploy",
      description: "Download your projects as ZIP files or deploy directly to hosting platforms"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Modern Design",
      description: "Beautiful, responsive designs that work on all devices"
    },
    {
      icon: <Code className="h-6 w-6" />,
      title: "Fast & Efficient",
      description: "Generate professional websites in seconds, not hours"
    }
  ]

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-gradient-to-br from-background to-muted/20 relative overflow-hidden ${webglSupported ? 'webgl-supported' : 'no-webgl'}`}
    >
      {/* Fluid Effect Background - Primary Effect */}
      <FluidEffect />
      
      {/* Fallback Smoke Animation - Only shows if WebGL is not supported */}
      {!webglSupported && (
        <div className="webgl-fallback">
      <SmokeAnimation />
        </div>
      )}
      
      {/* Mouse Follower */}
      <div
        className="fixed pointer-events-none z-40 transition-all duration-300 ease-out"
        style={{
          left: mousePosition.x - 50,
          top: mousePosition.y - 50,
          opacity: isHovering ? 1 : 0,
          transform: `scale(${isHovering ? 1 : 0.5})`,
        }}
      >
        <div className="w-24 h-24 rounded-full blur-xl bg-gradient-to-r from-purple-500/40 via-blue-500/30 to-purple-500/40 animate-mousePulse" />
      </div>

      {/* Sticky Back Button */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="bg-background/80 backdrop-blur-sm text-foreground hover:bg-muted hover:text-foreground p-3 rounded-full shadow-lg border border-border"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-red-500/5 opacity-0 hover:opacity-100 transition-opacity duration-1000" />
        
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 group">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Sparkles className="h-8 w-8 text-primary group-hover:animate-spin transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-red-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <h1 className="text-2xl font-bold group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-red-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
                  AI Website Builder
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {session ? (
                <div className="flex items-center space-x-4">
                  <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Dashboard
                  </Button>
                  <ProfileDropdown />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => router.push('/auth/signin')}>
                    Sign In
                  </Button>
                  <Button onClick={() => router.push('/auth/signup')}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - FUSION Style */}
      <section className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="max-w-4xl mx-auto text-center relative z-20">
          {/* Title Section */}
          <div className="mb-12 group">
            <div className="text-sm font-medium text-gray-400 mb-4 tracking-wider uppercase">
              Introducing AI Website Builder
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-white group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-1000">
              What should we build?
            </h1>
            <p className="text-lg text-gray-300 mb-12 group-hover:text-white transition-colors duration-500">
              using your design & code context
            </p>
          </div>

          {/* Main Input Area - FUSION Style */}
          <div className="relative mb-8">
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-500 group">
              {/* Gradient border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="absolute inset-[1px] rounded-2xl bg-gray-900/50" />
              
              <div className="relative z-10">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={attachedImages.length > 0 
                    ? `Ask AI Website Builder to build a full featured, production-ready website... (${attachedImages.length} image${attachedImages.length > 1 ? 's' : ''} attached as reference)`
                    : "Ask AI Website Builder to build a full featured, production-ready website..."
                  }
                  className="w-full h-32 bg-transparent text-white placeholder-gray-400 resize-none outline-none text-lg"
                  style={{ fontFamily: 'inherit' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleGenerate()
                    }
                  }}
                />
                
                {/* Bottom controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                      ) : (
                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-purple-400" />
                      )}
                      <span className="text-sm text-gray-400 group-hover:text-white">
                        {isUploading ? 'Uploading...' : 'Attach Images'}
                      </span>
                  </button>
                    
                    {/* AI Provider Selector */}
                    <div className="relative group">
                      <select
                        value={selectedAIProvider}
                        onChange={(e) => setSelectedAIProvider(e.target.value)}
                        className="appearance-none flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 text-sm text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer pr-8"
                      >
                        <option value="cerebras" className="bg-gray-800 text-white">🧠 Cerebras</option>
                        <option value="openai" className="bg-gray-800 text-white">🤖 OpenAI</option>
                        <option value="anthropic" className="bg-gray-800 text-white">🔮 Anthropic</option>
                        <option value="gemini" className="bg-gray-800 text-white">✨ Gemini</option>
                      </select>
                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* AI Provider Badge */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                      <span className="text-xs text-blue-300">
                        {selectedAIProvider === 'cerebras' && '🧠'}
                        {selectedAIProvider === 'openai' && '🤖'}
                        {selectedAIProvider === 'anthropic' && '🔮'}
                        {selectedAIProvider === 'gemini' && '✨'}
                      </span>
                      <span className="text-xs text-blue-300 capitalize">{selectedAIProvider}</span>
                    </div>
                    
                    {/* Image count badge */}
                    {attachedImages.length > 0 && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                        <ImageIcon className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-purple-300">{attachedImages.length}</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-full transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    {isGenerating ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowLeft className="h-5 w-5 text-white rotate-90" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2 text-purple-400" />
                  Attached Images ({attachedImages.length})
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
                  {attachedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-800/50 rounded-lg border border-gray-600/30 overflow-hidden">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Attached image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <button
                            onClick={() => removeImage(index)}
                            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors duration-200"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 truncate" title={image.name}>
                        {image.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Streaming Progress Display */}
          {isGenerating && (
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <div className="h-4 w-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mr-3" />
                      Generating Website
                    </h3>
                    <div className="text-sm text-gray-400">
                      {streamingProgress}%
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-800/50 rounded-full h-2 mb-4">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${streamingProgress}%` }}
                    />
                  </div>
                  
                  {/* Current Status */}
                  {streamingStatus && (
                    <div className="text-sm text-gray-300 mb-4">
                      {streamingStatus}
                    </div>
                  )}
                  
                  {/* Status History */}
                  {streamingStatusHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-400">Progress History:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {streamingStatusHistory.map((status, index) => (
                          <div key={index} className="text-xs text-gray-500 flex items-center">
                            <div className="h-1 w-1 bg-gray-500 rounded-full mr-2" />
                            {status}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Generated Files */}
                  {streamingFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Generated Files:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {streamingFiles.map((file, index) => (
                          <div key={index} className="flex items-center space-x-2 text-xs text-gray-300 bg-gray-800/30 rounded px-2 py-1">
                            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="truncate">{file.path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Project ID */}
                  {currentProjectId && (
                    <div className="mt-4 text-xs text-gray-500">
                      Project ID: {currentProjectId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Example Projects */}
          <div className="mb-16" data-examples>
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-white mb-2">Try these examples</h3>
              <p className="text-gray-400 text-sm">Click any example to get started instantly</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                {
                  title: "Portfolio Website",
                  description: "Modern portfolio with animations and contact form",
                  prompt: "Create a modern portfolio website for a graphic designer with smooth animations, project showcase, and contact form",
                  icon: "🎨"
                },
                {
                  title: "E-commerce Store",
                  description: "Complete online store with product catalog",
                  prompt: "Build a complete e-commerce website with product catalog, shopping cart, and checkout functionality",
                  icon: "🛒"
                },
                {
                  title: "Restaurant Website",
                  description: "Beautiful restaurant site with menu and reservations",
                  prompt: "Create a beautiful restaurant website with menu display, online reservations, and location information",
                  icon: "🍽️"
                },
                {
                  title: "Tech Startup",
                  description: "Professional landing page for tech company",
                  prompt: "Design a professional landing page for a tech startup with features section, pricing, and team showcase",
                  icon: "🚀"
                },
                {
                  title: "Blog Platform",
                  description: "Clean blog with article management",
                  prompt: "Build a clean and modern blog platform with article management, categories, and search functionality",
                  icon: "📝"
                },
                {
                  title: "Fitness App",
                  description: "Health and fitness tracking website",
                  prompt: "Create a fitness and health tracking website with workout plans, progress tracking, and nutrition guides",
                  icon: "💪"
                }
              ].map((example, index) => (
              <button
                key={index}
                  onClick={() => {
                    setPrompt(example.prompt)
                    // Scroll to input area
                    const inputArea = document.querySelector('textarea')
                    if (inputArea) {
                      inputArea.focus()
                      inputArea.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  className="group p-4 bg-gray-800/30 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm text-left hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{example.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1 group-hover:text-purple-300 transition-colors">
                        {example.title}
                      </h4>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                        {example.description}
                      </p>
                    </div>
                </div>
              </button>
            ))}
            </div>
          </div>

          {/* Streaming Generation Form - Hidden but functional */}
          <div className="hidden">
            <StreamingGenerator 
              onComplete={(projectId) => {
                router.push(`/projects/${projectId}`)
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 opacity-100 transform-none">
            <h3 className="text-3xl font-bold mb-4">Why Choose Our AI Website Builder?</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features that make website creation effortless and enjoyable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="opacity-100 transform-none group">
                <Card className="p-6 h-full relative overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 hover:border-transparent bg-gradient-to-br from-gray-900/50 to-gray-800/30 hover:from-purple-500/10 hover:to-blue-500/10 backdrop-blur-sm">
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                  
                  {/* Animated border */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                  <div className="absolute inset-[1px] rounded-lg bg-gray-900/50" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-gradient-to-r group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-500 group-hover:scale-110">
                        {feature.icon}
                      </div>
                      <h4 className="text-lg font-semibold text-white group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
                        {feature.title}
                      </h4>
                    </div>
                    <p className="text-gray-400 group-hover:text-gray-200 transition-colors duration-500">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="opacity-100 transform-none">
            <h3 className="text-3xl font-bold mb-4">Ready to Build Your Website?</h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of creators who are already building amazing websites with AI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => router.push('/auth/signup')}
                className="relative overflow-hidden group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10">Get Started Free</span>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => {
                  // Scroll to examples section
                  const examplesSection = document.querySelector('[data-examples]')
                  if (examplesSection) {
                    examplesSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
                className="relative overflow-hidden group border-2 hover:border-transparent bg-transparent hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-all duration-500 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="absolute inset-[1px] bg-gray-900 rounded-md" />
                <span className="relative z-10 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
                  View Examples
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 border-t border-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-400 mb-8">Trusted by leading companies</p>
          </div>
          
          {/* Company logos */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {[
              "Papier", "J.CREW", "HARRY'S", "Serasa Experian", "FAIRE", 
              "Vistaprint", "alo yoga", "afterpay", "FABLETICS", "Vimeo"
            ].map((company, index) => (
              <div
                key={index}
                className="text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer group"
              >
                <span className="text-sm font-medium tracking-wide group-hover:scale-105 transition-transform duration-300">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-black/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Sparkles className="h-6 w-6 text-purple-400" />
              <span className="font-semibold text-white">AI Website Builder</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}