'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Square, 
  FileText, 
  Code, 
  Palette,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wrench
} from 'lucide-react'
import { toast } from 'sonner'

interface StreamingModifierProps {
  projectId: string
  onComplete: () => void
  onError: (error: string) => void
}

interface StreamChunk {
  type: 'status' | 'file' | 'complete' | 'error' | 'project'
  data: any
}

export default function StreamingModifier({ projectId, onComplete, onError }: StreamingModifierProps) {
  const [isModifying, setIsModifying] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [modifiedFiles, setModifiedFiles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleModify = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.error('Please enter a modification prompt')
      return
    }

    setIsModifying(true)
    setCurrentStatus('Starting modification...')
    setProgress(0)
    setModifiedFiles([])
    setError(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/projects/${projectId}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: 'cerebras', // Default to cerebras
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
        setCurrentStatus('Modification cancelled')
        toast.info('Modification cancelled')
      } else {
        console.error('Streaming error:', error)
        setError(error.message || 'Failed to modify project')
        onError(error.message || 'Failed to modify project')
        toast.error('Failed to modify project')
      }
    } finally {
      setIsModifying(false)
      abortControllerRef.current = null
    }
  }

  const handleStreamChunk = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'status':
        setCurrentStatus(chunk.data.status)
        setProgress(chunk.data.progress)
        break
      
      case 'file':
        setModifiedFiles(prev => [...prev, chunk.data])
        break
      
      case 'complete':
        setCurrentStatus(chunk.data.status)
        setProgress(100)
        toast.success('Project modified successfully!')
        onComplete()
        break
      
      case 'error':
        setError(chunk.data.error)
        setCurrentStatus(chunk.data.status)
        onError(chunk.data.error)
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

  return {
    isModifying,
    currentStatus,
    progress,
    modifiedFiles,
    error,
    handleModify,
    handleCancel,
    getFileIcon
  }
}

// Hook for using the streaming modifier
export function useStreamingModifier(projectId: string) {
  const [isModifying, setIsModifying] = useState(false)
  const [currentStatus, setCurrentStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [modifiedFiles, setModifiedFiles] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleModify = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.error('Please enter a modification prompt')
      return
    }

    setIsModifying(true)
    setCurrentStatus('Starting modification...')
    setProgress(0)
    setModifiedFiles([])
    setError(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`/api/projects/${projectId}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider: 'cerebras', // Default to cerebras
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
        setCurrentStatus('Modification cancelled')
        toast.info('Modification cancelled')
      } else {
        console.error('Streaming error:', error)
        setError(error.message || 'Failed to modify project')
        toast.error('Failed to modify project')
      }
    } finally {
      setIsModifying(false)
      abortControllerRef.current = null
    }
  }

  const handleStreamChunk = (chunk: StreamChunk) => {
    switch (chunk.type) {
      case 'status':
        setCurrentStatus(chunk.data.status)
        setProgress(chunk.data.progress)
        break
      
      case 'file':
        setModifiedFiles(prev => [...prev, chunk.data])
        break
      
      case 'complete':
        setCurrentStatus(chunk.data.status)
        setProgress(100)
        toast.success('Project modified successfully!')
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

  return {
    isModifying,
    currentStatus,
    progress,
    modifiedFiles,
    error,
    handleModify,
    handleCancel
  }
}
