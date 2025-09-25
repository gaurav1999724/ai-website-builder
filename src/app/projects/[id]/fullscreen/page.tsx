'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function FullscreenPreviewPage({ params }: { params: { id: string } }) {
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
          
          // Embed CSS inline (preserve external CSS links like fonts)
          if (cssFile) {
            // Remove only local CSS file links, keep external ones (fonts, CDNs)
            completeContent = completeContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
            
            const cssEmbed = `<style>\n${cssFile.content}\n</style>`
            if (completeContent.includes('</head>')) {
              completeContent = completeContent.replace('</head>', `${cssEmbed}\n</head>`)
            } else if (completeContent.includes('<head>')) {
              completeContent = completeContent.replace('<head>', `<head>\n${cssEmbed}`)
            } else {
              completeContent = completeContent.replace('<html', `<html>\n<head>\n${cssEmbed}\n</head>\n<body>`)
              if (!completeContent.includes('</body>')) {
                completeContent = completeContent.replace('</html>', '</body>\n</html>')
              }
            }
          }
          
          // Embed JavaScript inline
          if (jsFile) {
            const jsEmbed = `<script>\n${jsFile.content}\n</script>`
            if (completeContent.includes('</body>')) {
              completeContent = completeContent.replace('</body>', `${jsEmbed}\n</body>`)
            } else if (completeContent.includes('<body>')) {
              completeContent = completeContent.replace('<body>', `<body>\n${jsEmbed}`)
            } else {
              completeContent = completeContent.replace('</html>', `\n${jsEmbed}\n</html>`)
            }
          }
          
          setPreviewContent(completeContent)
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading fullscreen preview...</p>
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
          <button 
            onClick={() => router.push('/dashboard')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!previewContent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Preview Available</h1>
          <p className="text-gray-300 mb-6">This project doesn't contain an HTML file that can be previewed.</p>
          <button 
            onClick={() => router.push(`/projects/${params.id}`)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Project
          </button>
        </div>
      </div>
    )
  }

  // Full-screen preview - no UI elements, just the pure website
  return (
    <div 
      className="w-full h-screen overflow-hidden"
      style={{ 
        margin: 0, 
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <iframe
        srcDoc={previewContent}
        className="w-full h-full border-0"
        title="Fullscreen Project Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
        style={{ 
          width: '100vw', 
          height: '100vh',
          border: 'none',
          margin: 0,
          padding: 0
        }}
      />
    </div>
  )
}
