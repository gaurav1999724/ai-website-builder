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
  ArrowLeft
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
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Handle website generation
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return
    
    setIsGenerating(true)
    try {
      const response = await fetch('/api/projects/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: 'cerebras'
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
              } else if (data.type === 'complete') {
                if (projectId) {
                  router.push(`/projects/${projectId}`)
                }
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
    } finally {
      setIsGenerating(false)
    }
  }

  // Enhanced smoke animation component with purple/blue gradients
  const SmokeAnimation = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `smokeFloat ${20 + Math.random() * 15}s infinite linear`,
            animationDelay: `${Math.random() * 8}s`,
          }}
        >
          <div 
            className="w-48 h-48 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, rgba(59, 130, 246, 0.3) 30%, rgba(168, 85, 247, 0.2) 60%, transparent 100%)`,
              transform: `scale(${0.3 + Math.random() * 0.7})`,
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
      className="min-h-screen bg-gradient-to-br from-background to-muted/20 relative overflow-hidden"
    >
      {/* Smoke Animation Background */}
      <SmokeAnimation />
      
      {/* Mouse Follower */}
      <div
        className="fixed pointer-events-none z-10 transition-all duration-300 ease-out"
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
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
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
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 relative overflow-hidden">
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
        <div className="max-w-4xl mx-auto text-center relative z-10">
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
                  placeholder="Ask AI Website Builder to build a full featured, production-ready website..."
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
                  <button className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 group">
                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-purple-400" />
                    <span className="text-sm text-gray-400 group-hover:text-white">Attach</span>
                  </button>
                  
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

          {/* Integration Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {[
              { icon: <Code className="h-5 w-5" />, label: "Connect a repo", color: "hover:border-blue-500/50" },
              { icon: <Eye className="h-5 w-5" />, label: "Design Import", color: "hover:border-purple-500/50" },
              { icon: <Download className="h-5 w-5" />, label: "MCP Servers", color: "hover:border-green-500/50" },
              { icon: <FileText className="h-5 w-5" />, label: "Get Extension", color: "hover:border-orange-500/50" }
            ].map((item, index) => (
              <button
                key={index}
                className={`flex items-center space-x-3 px-6 py-3 bg-gray-800/30 hover:bg-gray-700/50 rounded-xl border border-gray-600/30 ${item.color} transition-all duration-300 group backdrop-blur-sm`}
              >
                <div className="text-gray-400 group-hover:text-white transition-colors duration-300">
                  {item.icon}
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-300">
                  {item.label}
                </span>
              </button>
            ))}
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
                onClick={() => router.push('/dashboard')}
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