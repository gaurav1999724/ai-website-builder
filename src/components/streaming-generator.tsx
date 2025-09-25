'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, 
  Play, 
  Square, 
  FileText, 
  Code, 
  Palette,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface StreamingGeneratorProps {
  onComplete: (projectId: string) => void
}

interface StreamChunk {
  type: 'status' | 'file' | 'complete' | 'error' | 'project'
  data: any
}

export default function StreamingGenerator({ onComplete }: StreamingGeneratorProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<'cerebras' | 'openai' | 'anthropic' | 'gemini'>('cerebras')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setCurrentStatus('Starting generation...')
    setProgress(0)
    setGeneratedFiles([])
    setError(null)
    setProjectId(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/projects/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: selectedProvider,
          title: `Website - ${new Date().toLocaleDateString()}`,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: StreamChunk = JSON.parse(line.slice(6))
              handleStreamChunk(chunk)
            } catch (e) {
              console.error('Failed to parse chunk:', e)
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setCurrentStatus('Generation cancelled')
        toast.info('Generation cancelled')
      } else {
        console.error('Streaming error:', error)
        setError(error.message || 'Failed to generate website')
        toast.error('Failed to generate website')
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleStreamChunk = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'project':
        console.log('Project chunk received:', chunk.data)
        setProjectId(chunk.data.projectId)
        break
      
      case 'status':
        setCurrentStatus(chunk.data.status)
        setProgress(chunk.data.progress)
        break
      
      case 'file':
        setGeneratedFiles(prev => [...prev, chunk.data])
        break
      
      case 'complete':
        console.log('Complete chunk received:', chunk.data)
        console.log('Current projectId state:', projectId)
        setCurrentStatus(chunk.data.status)
        setProgress(100)
        toast.success('Website generated successfully!')
        // Use the projectId from state or from the complete chunk
        const finalProjectId = projectId || chunk.data.projectId
        console.log('Final project ID for redirect:', finalProjectId)
        if (finalProjectId) {
          setTimeout(() => {
            console.log('Redirecting to project:', finalProjectId)
            onComplete(finalProjectId)
          }, 1000)
        } else {
          console.error('No project ID available for redirect')
          toast.error('Project generated but redirect failed')
        }
        break
      
      case 'error':
        setError(chunk.data.error)
        setCurrentStatus(chunk.data.status)
        toast.error(chunk.data.error)
        break
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'HTML':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'CSS':
        return <Palette className="h-4 w-4 text-blue-500" />
      case 'JAVASCRIPT':
        return <Code className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            AI Website Generator
          </CardTitle>
          <CardDescription className="text-gray-400">
            Describe your website and watch it come to life in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Website Description</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Create a modern portfolio website for a graphic designer..."
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">AI Provider</label>
            <div className="flex space-x-2">
              {(['cerebras', 'openai', 'anthropic', 'gemini'] as const).map((provider) => (
                <Button
                  key={provider}
                  variant={selectedProvider === provider ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProvider(provider)}
                  disabled={isGenerating}
                  className="capitalize"
                >
                  {provider}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            {!isGenerating ? (
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Website
              </Button>
            ) : (
              <Button
                onClick={handleCancel}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Square className="h-4 w-4 mr-2" />
                Cancel Generation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      {isGenerating && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-500" />
              Generating Your Website
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{currentStatus}</span>
                <span className="text-gray-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Generated Files */}
            {generatedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Generated Files</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {generatedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2 bg-gray-800 rounded text-sm"
                    >
                      {getFileIcon(file.type)}
                      <span className="text-gray-300">{file.path}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Generation Failed</span>
            </div>
            <p className="text-red-300 mt-2 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Display */}
      {!isGenerating && generatedFiles.length > 0 && !error && (
        <Card className="bg-green-900/20 border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Generation Complete!</span>
            </div>
            <p className="text-green-300 mt-2 text-sm">
              Your website has been generated with {generatedFiles.length} files.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
