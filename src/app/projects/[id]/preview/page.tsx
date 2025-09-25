'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'

interface ProjectFile {
  id: string
  path: string
  content: string
  type: string
  size: number
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  files: ProjectFile[]
}

export default function PreviewPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewContent, setPreviewContent] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    loadProject()
  }, [session, status, router])

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        
        // Generate complete preview content with all assets embedded
        const htmlFile = data.project.files.find((f: ProjectFile) => 
          f.path.endsWith('.html') || f.path.endsWith('.htm')
        )
        const cssFile = data.project.files.find((f: ProjectFile) => 
          f.path.endsWith('.css')
        )
        const jsFile = data.project.files.find((f: ProjectFile) => 
          f.path.endsWith('.js')
        )
        
        if (htmlFile) {
          let completeContent = htmlFile.content
          
          // Ensure we have a proper HTML structure
          if (!completeContent.includes('<!DOCTYPE html>')) {
            completeContent = `<!DOCTYPE html>\n<html lang="en">\n${completeContent}\n</html>`
          }
          
          // Embed CSS inline
          if (cssFile) {
            const cssEmbed = `<style>\n${cssFile.content}\n</style>`
            // Insert CSS before closing </head> tag, or at the beginning if no head tag
            if (completeContent.includes('</head>')) {
              completeContent = completeContent.replace('</head>', `${cssEmbed}\n</head>`)
            } else if (completeContent.includes('<head>')) {
              completeContent = completeContent.replace('<head>', `<head>\n${cssEmbed}`)
            } else {
              // If no head tag, add it at the beginning
              completeContent = completeContent.replace('<html', `<html>\n<head>\n${cssEmbed}\n</head>\n<body>`)
              if (!completeContent.includes('</body>')) {
                completeContent = completeContent.replace('</html>', '</body>\n</html>')
              }
            }
          }
          
          // Embed JavaScript inline
          if (jsFile) {
            const jsEmbed = `<script>\n${jsFile.content}\n</script>`
            // Insert JS before closing </body> tag, or at the end if no body tag
            if (completeContent.includes('</body>')) {
              completeContent = completeContent.replace('</body>', `${jsEmbed}\n</body>`)
            } else if (completeContent.includes('<body>')) {
              completeContent = completeContent.replace('<body>', `<body>\n${jsEmbed}`)
            } else {
              // If no body tag, add it at the end
              completeContent = completeContent.replace('</html>', `\n${jsEmbed}\n</html>`)
            }
          }
          
          console.log('Generated complete content:', completeContent)
          setPreviewContent(completeContent)
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Preview URL copied to clipboard!')
  }

  const downloadProject = () => {
    if (!project) return
    
    // Create a zip file with all project files
    const zip = new JSZip()
    
    project.files.forEach(file => {
      zip.file(file.path, file.content)
    })
    
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Project downloaded successfully!')
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-300 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/projects/${params.id}`)}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{project.title}</h1>
              <p className="text-gray-400 text-sm">Live Preview</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-600 text-white">
              {project.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadProject}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-7xl mx-auto p-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <ExternalLink className="h-5 w-5 mr-2" />
              Project Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewContent ? (
              <div className="bg-white rounded-lg overflow-hidden">
                <iframe
                  src={`/api/projects/${params.id}/preview`}
                  className="w-full h-[600px] border-0"
                  title="Project Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
                  style={{ minHeight: '600px' }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No HTML file found for preview</p>
                <p className="text-gray-500 text-sm">
                  This project doesn't contain an HTML file that can be previewed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Files Info */}
        <Card className="bg-gray-900 border-gray-800 mt-4">
          <CardHeader>
            <CardTitle className="text-white">Project Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.files.map((file) => (
                <div key={file.id} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{file.path}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.type}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {file.size} bytes
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
