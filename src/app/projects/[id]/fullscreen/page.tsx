'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCombinedHTMLContent } from '@/lib/html-content-processor'

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
  const [currentPage, setCurrentPage] = useState<string>('')
  const [availablePages, setAvailablePages] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    loadProject()
  }, [session, status, router])

  // Handle navigation messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Message received:', event.data, 'from origin:', event.origin)
      
      // Accept messages from iframe (origin will be null for srcDoc)
      // Only process our specific message type for security
      if (event.data && event.data.type === 'NAVIGATE_TO_PAGE' && project) {
        const targetFile = event.data.targetFile
        console.log('🎯 Navigation request from iframe:', targetFile)
        console.log('📋 Current project files:', project.files.map(f => ({ path: f.path, type: f.type })))
        console.log('🔄 About to call loadPageContent with:', targetFile)
        
        loadPageContent(project, targetFile)
        
        // Update URL without page reload
        const newUrl = `${window.location.pathname}?page=${encodeURIComponent(targetFile)}`
        window.history.pushState({ page: targetFile }, '', newUrl)
        console.log('✅ Navigation completed, URL updated to:', newUrl)
      } else {
        console.log('❌ Message ignored - not a navigation request or no project:', {
          hasData: !!event.data,
          messageType: event.data?.type,
          hasProject: !!project
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [project])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search)
      const page = urlParams.get('page')
      if (page && project) {
        console.log('Browser navigation to page:', page)
        loadPageContent(project, page)
      } else if (project) {
        console.log('Browser navigation to main page')
        loadPageContent(project, '')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [project])

  // Handle initial URL parameters
  useEffect(() => {
    if (project) {
      const urlParams = new URLSearchParams(window.location.search)
      const page = urlParams.get('page')
      if (page) {
        console.log('Initial page from URL:', page)
        loadPageContent(project, page)
      }
    }
  }, [project])

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        
        // Extract available HTML pages for manual navigation
        const htmlPages = data.project.files
          .filter((f: ProjectFile) => f.type === 'HTML')
          .map((f: ProjectFile) => f.path)
        setAvailablePages(htmlPages)
        console.log('📄 Available pages:', htmlPages)
        
        // Load the main page (index.html or first HTML file)
        loadPageContent(data.project, '')
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPageContent = (projectData: Project, targetFile: string) => {
    console.log('🔄 Loading page content for:', targetFile || 'main page')
    console.log('📊 Project has', projectData.files.length, 'files')
    
    // Use the same content processing logic as the main project page
    let completeContent = getCombinedHTMLContent(projectData, targetFile)
    
    // Add navigation handling script for fullscreen mode
    const navigationScript = `
      <script>
        // Navigation handling for fullscreen mode
        document.addEventListener('DOMContentLoaded', function() {
          console.log('Navigation script loaded in iframe');
          
          // Intercept all link clicks
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault();
              
              // Get the target file from href
              const href = link.getAttribute('href');
              console.log('Link clicked:', href);
              
              // Handle different types of navigation
              if (href) {
                let targetFile = href;
                
                // Handle relative paths and different link formats
                if (href.startsWith('./')) {
                  targetFile = href.substring(2);
                } else if (href.startsWith('/')) {
                  targetFile = href.substring(1);
                } else if (href.includes('#')) {
                  // Handle anchor links - extract the page part
                  const parts = href.split('#');
                  targetFile = parts[0] || 'index.html';
                } else if (!href.includes('http') && !href.includes('mailto:') && !href.includes('tel:')) {
                  // Handle relative links without ./
                  targetFile = href;
                }
                
                // Only process if it looks like a page navigation
                if (targetFile && (
                  targetFile.endsWith('.html') || 
                  targetFile.includes('.html') ||
                  targetFile === 'index' ||
                  targetFile === 'home' ||
                  targetFile === 'about' ||
                  targetFile === 'contact' ||
                  targetFile === 'services' ||
                  targetFile === 'blog' ||
                  targetFile === 'team' ||
                  targetFile === 'pricing' ||
                  targetFile === 'features'
                )) {
                  console.log('Sending navigation message for:', targetFile);
                  
                  try {
                    // Send message to parent window to handle navigation
                    // Use '*' as targetOrigin since iframe origin is null with srcDoc
                    window.parent.postMessage({
                      type: 'NAVIGATE_TO_PAGE',
                      targetFile: targetFile
                    }, '*');
                    console.log('Navigation message sent successfully');
                  } catch (error) {
                    console.error('Failed to send navigation message:', error);
                  }
                } else {
                  console.log('Skipping navigation for:', href, '->', targetFile);
                }
              }
            }
          });
        });
      </script>
    `
    
    // Inject the navigation script
    if (completeContent.includes('</body>')) {
      completeContent = completeContent.replace('</body>', `${navigationScript}\n</body>`)
    } else {
      completeContent = completeContent.replace('</html>', `\n${navigationScript}\n</html>`)
    }
    
    console.log('Fullscreen preview - Generated content:', {
      targetFile: targetFile || 'main page',
      contentLength: completeContent.length,
      totalFiles: projectData.files.length,
      allFiles: projectData.files.map((f: ProjectFile) => ({ path: f.path, type: f.type }))
    })
    
    if (completeContent) {
      setPreviewContent(completeContent)
      setCurrentPage(targetFile)
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
            onClick={() => router.push('/')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (project.status === 'GENERATING') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Project Still Generating</h1>
          <p className="text-gray-300 mb-6">This project is still being generated. Please wait for it to complete.</p>
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

  if (!previewContent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Preview Available</h1>
          <p className="text-gray-300 mb-6">This project doesn't contain an HTML file that can be previewed.</p>
          <div className="space-y-2 mb-6">
            <p className="text-sm text-gray-400">Available files:</p>
            {project?.files?.map((file, index) => (
              <div key={index} className="text-xs text-gray-500">
                {file.path} ({file.type})
              </div>
            ))}
          </div>
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

  // Full-screen preview with minimal UI for navigation
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
      {/* Manual Navigation Bar */}
      {availablePages.length > 1 && (
        <div 
          className="absolute top-0 left-0 right-0 bg-black/90 text-white px-4 py-2 flex items-center space-x-4 z-50"
          style={{ zIndex: 10000 }}
        >
          <span className="text-sm font-medium">Pages:</span>
          {availablePages.map((page, index) => {
            const pageName = page.split('/').pop() || page
            const isActive = currentPage === page || (!currentPage && index === 0)
            return (
              <button
                key={page}
                onClick={() => {
                  console.log('Manual navigation to:', page)
                  loadPageContent(project!, page)
                  setCurrentPage(page)
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {pageName}
              </button>
            )
          })}
          <div className="ml-auto text-xs text-gray-400">
            {currentPage || 'index.html'}
          </div>
        </div>
      )}
      
      <iframe
        srcDoc={previewContent}
        className="w-full border-0"
        title="Fullscreen Project Preview"
        key={currentPage} // Force re-render when page changes
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
        style={{ 
          width: '100vw', 
          height: availablePages.length > 1 ? 'calc(100vh - 48px)' : '100vh',
          border: 'none',
          margin: 0,
          padding: 0,
          backgroundColor: 'white',
          marginTop: availablePages.length > 1 ? '48px' : '0'
        }}
        onError={(e) => {
          console.error('Iframe error:', e)
        }}
        onLoad={() => {
          console.log('Fullscreen preview loaded successfully for page:', currentPage || 'main')
        }}
      />
    </div>
  )
}
