'use client'

import { useState } from 'react'
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
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'cerebras' | 'openai' | 'anthropic' | 'gemini'>('cerebras')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!session) {
      toast.error('Please sign in to generate websites')
      router.push('/auth/signin')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/projects/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: selectedProvider,
          title: `Website - ${new Date().toLocaleDateString()}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Website generated successfully!')
        router.push(`/projects/${data.project.id}`)
      } else {
        toast.error(data.error || 'Failed to generate website')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate website')
    } finally {
      setIsGenerating(false)
    }
  }

  const examplePrompts = [
    "Create a modern portfolio website for a graphic designer",
    "Build a landing page for a SaaS startup with pricing plans",
    "Design a restaurant website with menu and reservation system",
    "Create a blog website with dark mode and responsive design",
    "Build an e-commerce store for selling handmade crafts",
    "Design a corporate website for a tech company",
  ]

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
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
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">AI Website Builder</h1>
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

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="opacity-100 transform-none">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Build Websites with AI
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Generate beautiful, responsive websites from simple text prompts. 
              No coding required - just describe what you want and watch the magic happen.
            </p>
          </div>

          {/* Generation Form */}
          <div className="max-w-4xl mx-auto opacity-100 transform-none">
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Generate Your Website</span>
                </CardTitle>
                <CardDescription>
                  Describe the website you want to create and our AI will build it for you
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Provider</label>
                  <Tabs value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as any)}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="cerebras">Cerebras Qwen</TabsTrigger>
                      <TabsTrigger value="openai">OpenAI GPT-4</TabsTrigger>
                      <TabsTrigger value="anthropic">Claude</TabsTrigger>
                      <TabsTrigger value="gemini">Gemini</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Website Description</label>
                  <textarea
                    placeholder="Describe the website you want to create... (e.g., 'Create a modern portfolio website for a photographer with a dark theme and image gallery')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full min-h-[120px] p-3 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>

                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Website
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Example Prompts */}
          <div className="mt-12 opacity-100 transform-none">
            <h3 className="text-2xl font-semibold mb-6">Example Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {examplePrompts.map((example, index) => (
                <div key={index} className="opacity-100 transform-none">
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setPrompt(example)}
                  >
                    <p className="text-sm text-muted-foreground">{example}</p>
                  </Card>
                </div>
              ))}
            </div>
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
              <div key={index} className="opacity-100 transform-none">
                <Card className="p-6 h-full">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    <h4 className="text-lg font-semibold">{feature.title}</h4>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
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
              <Button size="lg" onClick={() => router.push('/auth/signup')}>
                Get Started Free
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push('/dashboard')}>
                View Examples
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-semibold">AI Website Builder</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}