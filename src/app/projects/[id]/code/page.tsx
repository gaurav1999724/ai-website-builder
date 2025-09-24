'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { 
  ArrowLeft, 
  Eye, 
  Download, 
  Copy,
  Save,
  Maximize2,
  Minimize2,
  FileText,
  FileCode,
  FileImage,
  FileJson,
  FileArchive,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Monitor,
  Smartphone,
  Tablet,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'

interface Project {
  id: string
  title: string
  description?: string
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
}

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  content?: string
  children?: FileNode[]
  fileId?: string
}

export default function CodeEditorPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [currentPage, setCurrentPage] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [openTabs, setOpenTabs] = useState<Array<{id: string, name: string, path: string, content: string}>>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState({ scrollTop: 0, scrollLeft: 0 })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session) {
      fetchProject()
    }
  }, [session, status, router, params.id])

  // Update tab content when fileContent changes
  useEffect(() => {
    if (activeTab && fileContent !== undefined) {
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTab ? { ...tab, content: fileContent } : tab
      ))
    }
  }, [fileContent, activeTab])

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
        
        // Select first file by default
        if (data.project.files.length > 0) {
          const firstFile = data.project.files[0]
          setSelectedFile({
            name: firstFile.path.split('/').pop() || firstFile.path,
            type: 'file',
            path: firstFile.path,
            content: firstFile.content,
            fileId: firstFile.id
          })
          setFileContent(firstFile.content)
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

  const getFileIcon = (fileName: string, isFolder: boolean = false) => {
    if (isFolder) return <Folder className="h-4 w-4 text-blue-400" />

    const extension = fileName.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />
      case 'css':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'js':
      case 'jsx':
        return <FileText className="h-4 w-4 text-yellow-500" />
      case 'ts':
      case 'tsx':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'json':
        return <FileJson className="h-4 w-4 text-yellow-600" />
      case 'md':
      case 'markdown':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="h-4 w-4 text-green-500" />
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html':
        return 'HTML'
      case 'css':
        return 'CSS'
      case 'js':
      case 'jsx':
        return 'JavaScript'
      case 'ts':
      case 'tsx':
        return 'TypeScript'
      case 'json':
        return 'JSON'
      default:
        return extension?.toUpperCase() || 'TEXT'
    }
  }

  const getSyntaxHighlightedCode = (code: string, filename: string) => {
    try {
      const ext = filename.split('.').pop()?.toLowerCase()
      
      if (ext === 'html' || ext === 'htm') {
        return highlightHTML(code)
      } else if (ext === 'css') {
        return highlightCSS(code)
      } else if (ext === 'js' || ext === 'jsx') {
        return highlightJS(code)
      } else if (ext === 'json') {
        return highlightJSON(code)
      }
      
      // Fallback: escape HTML and return plain text
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    } catch (error) {
      console.error('Syntax highlighting error:', error)
      // Fallback: escape HTML and return plain text
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }

  const highlightHTML = (code: string) => {
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Process HTML comments first
    highlighted = highlighted.replace(/&lt;!--([\s\S]*?)--&gt;/g, '<span class="text-gray-500">&lt;!--$1--&gt;</span>')
    
    // Process DOCTYPE declarations
    highlighted = highlighted.replace(/&lt;!DOCTYPE\s+([^&gt;]+)&gt;/gi, '&lt;!DOCTYPE <span class="text-purple-400">$1</span>&gt;')
    
    // Process HTML tags
    highlighted = highlighted.replace(/&lt;(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^&gt;]*?)&gt;/g, (match, closing, tag, attrs) => {
      const tagColor = 'text-red-400'  // HTML tags in red like VS Code
      const attrColor = 'text-blue-400'  // Attributes in blue
      const valueColor = 'text-green-400'  // Values in green
      
      let result = `&lt;${closing}<span class="${tagColor}">${tag}</span>`
      
      if (attrs && attrs.trim()) {
        // Handle attributes with values
        result += attrs.replace(/(\w+(?:-\w+)*)\s*=\s*(["'])([^"']*?)\2/g, (attrMatch: string, name: string, quote: string, value: string) => {
          return ` <span class="${attrColor}">${name}</span>=${quote}<span class="${valueColor}">${value}</span>${quote}`
        })
        
        // Handle boolean attributes (without values)
        result = result.replace(/(\w+(?:-\w+)*)(?=\s|$)/g, (attrMatch: string) => {
          // Only highlight if it's not already highlighted and not part of a value
          if (!result.includes(`<span class="${attrColor}">${attrMatch}</span>`) && 
              !result.includes(`<span class="${valueColor}">${attrMatch}</span>`)) {
            return `<span class="${attrColor}">${attrMatch}</span>`
          }
          return attrMatch
        })
      }
      
      return result + '&gt;'
    })
    
    // Highlight text content between tags (but not inside already highlighted spans)
    highlighted = highlighted.replace(/(?<=&gt;)([^&lt;<]+)(?=&lt;)/g, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match // Already inside a span, don't highlight
      }
      return `<span class="text-white">${match}</span>`
    })
    
    return highlighted
  }

  const highlightCSS = (code: string) => {
    // First, escape HTML characters
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Process in order to avoid conflicts
    // 1. Comments first
    highlighted = highlighted.replace(/\/\*([\s\S]*?)\*\//g, '<span class="text-gray-500">/*$1*/</span>')
    
    // 2. Strings (to avoid highlighting inside strings)
    highlighted = highlighted.replace(/(["'`])([^"'`]*?)\1/g, '<span class="text-yellow-300">$1$2$1</span>')
    
    // 3. At-rules and media queries
    const atRuleRegex = /@([a-zA-Z-]+)/g
    highlighted = highlighted.replace(atRuleRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-purple-400">@${match.substring(1)}</span>`
    })
    
    // 4. Selectors (but not if already highlighted)
    const selectorRegex = /([.#]?[a-zA-Z][a-zA-Z0-9-]*)\s*\{/g
    highlighted = highlighted.replace(selectorRegex, (match, selector, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-blue-400">${selector}</span> {`
    })
    
    // 5. Properties (but not if already highlighted)
    const propertyRegex = /([a-zA-Z-]+)\s*:/g
    highlighted = highlighted.replace(propertyRegex, (match, property, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-green-400">${property}</span>:`
    })
    
    // 6. Values (but not if already highlighted)
    const valueRegex = /:\s*([^;]+);/g
    highlighted = highlighted.replace(valueRegex, (match, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `: <span class="text-yellow-300">${value}</span>;`
    })
    
    // 7. Numbers and units (but not if already highlighted)
    const numberRegex = /(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?)/g
    highlighted = highlighted.replace(numberRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-orange-400">${match}</span>`
    })
    
    return highlighted
  }

  const highlightJS = (code: string) => {
    // First, escape HTML characters
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Process in order to avoid conflicts
    // 1. Comments first
    highlighted = highlighted
      .replace(/\/\/.*$/gm, '<span class="text-gray-500">$&</span>')
      .replace(/\/\*([\s\S]*?)\*\//g, '<span class="text-gray-500">/*$1*/</span>')
    
    // 2. Strings and template literals
    highlighted = highlighted
      .replace(/(["'`])([^"'`]*?)\1/g, '<span class="text-yellow-300">$1$2$1</span>')
      .replace(/(`[^`]*`)/g, '<span class="text-yellow-300">$1</span>')
    
    // 3. Keywords (avoiding already highlighted content)
    const keywordRegex = /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|module|declare|public|private|protected|static|readonly|abstract|override|get|set|in|of|instanceof|typeof|void|null|undefined|true|false|break|continue|switch|case|default|do|with|debugger)\b/g
    
    highlighted = highlighted.replace(keywordRegex, (match, offset, string) => {
      // Check if this match is inside a span (already highlighted)
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match // Already inside a span, don't highlight
      }
      return `<span class="text-purple-400">${match}</span>`
    })
    
    // 4. Numbers (avoiding already highlighted content)
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g
    highlighted = highlighted.replace(numberRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-orange-400">${match}</span>`
    })
    
    // 5. Functions (avoiding already highlighted content)
    const functionRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g
    highlighted = highlighted.replace(functionRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-blue-400">${match}</span>`
    })
    
    return highlighted
  }

  const highlightJSON = (code: string) => {
    // First, escape HTML characters
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Process in order to avoid conflicts
    // 1. String keys
    const keyRegex = /("(?:[^"\\]|\\.)*")\s*:/g
    highlighted = highlighted.replace(keyRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-green-400">${match.substring(0, match.length - 1)}</span>:`
    })
    
    // 2. String values
    const stringValueRegex = /:\s*("(?:[^"\\]|\\.)*")/g
    highlighted = highlighted.replace(stringValueRegex, (match, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `: <span class="text-yellow-300">${value}</span>`
    })
    
    // 3. Boolean and null values
    const booleanRegex = /:\s*(true|false|null)/g
    highlighted = highlighted.replace(booleanRegex, (match, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `: <span class="text-blue-400">${value}</span>`
    })
    
    // 4. Numbers
    const numberRegex = /:\s*(\d+(?:\.\d+)?)/g
    highlighted = highlighted.replace(numberRegex, (match, value, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `: <span class="text-orange-400">${value}</span>`
    })
    
    // 5. Brackets and braces (but not if already highlighted)
    const bracketRegex = /([{}[\],])/g
    highlighted = highlighted.replace(bracketRegex, (match, offset, string) => {
      const beforeMatch = string.substring(0, offset)
      const openSpans = (beforeMatch.match(/<span[^>]*>/g) || []).length
      const closeSpans = (beforeMatch.match(/<\/span>/g) || []).length
      
      if (openSpans > closeSpans) {
        return match
      }
      return `<span class="text-white">${match}</span>`
    })
    
    return highlighted
  }

  const handleFileSelect = (file: any) => {
    try {
      const fileName = file.path.split('/').pop() || file.path
      const fileId = file.id
      
      // Ensure file has content
      if (!file.content) {
        console.error('File has no content:', file)
        toast.error('File content not available')
        return
      }
      
      console.log('Opening file:', fileName, 'Content length:', file.content.length)
      
      // Check if tab is already open
      const existingTab = openTabs.find(tab => tab.id === fileId)
      
      if (existingTab) {
        // Switch to existing tab
        setActiveTab(fileId)
        setSelectedFile({
          name: fileName,
          type: 'file',
          path: file.path,
          content: existingTab.content,
          fileId: fileId
        })
        setFileContent(existingTab.content)
      } else {
        // Open new tab
        const newTab = {
          id: fileId,
          name: fileName,
          path: file.path,
          content: file.content
        }
        
        setOpenTabs(prev => [...prev, newTab])
        setActiveTab(fileId)
        setSelectedFile({
          name: fileName,
          type: 'file',
          path: file.path,
          content: file.content,
          fileId: fileId
        })
        setFileContent(file.content)
      }
    } catch (error) {
      console.error('Error selecting file:', error)
      toast.error('Error opening file')
    }
  }

  const handleTabClose = (tabId: string) => {
    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId))
    
    if (activeTab === tabId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== tabId)
      if (remainingTabs.length > 0) {
        const nextTab = remainingTabs[remainingTabs.length - 1]
        setActiveTab(nextTab.id)
        setSelectedFile({
          name: nextTab.name,
          type: 'file',
          path: nextTab.path,
          content: nextTab.content,
          fileId: nextTab.id
        })
        setFileContent(nextTab.content)
      } else {
        setActiveTab(null)
        setSelectedFile(null)
        setFileContent('')
      }
    }
  }

  const handleTabSwitch = (tabId: string) => {
    try {
      const tab = openTabs.find(t => t.id === tabId)
      if (tab) {
        setActiveTab(tabId)
        setSelectedFile({
          name: tab.name,
          type: 'file',
          path: tab.path,
          content: tab.content,
          fileId: tab.id
        })
        setFileContent(tab.content)
      }
    } catch (error) {
      console.error('Error switching tab:', error)
      toast.error('Error switching to file')
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget
    setScrollPosition({ scrollTop, scrollLeft })
  }


  const handleSave = async () => {
    if (!selectedFile?.fileId) return

    try {
      const response = await fetch(`/api/projects/${params.id}/files/${selectedFile.fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: fileContent }),
      })

      if (response.ok) {
        toast.success('File saved successfully')
        
        // Update project files
        if (project) {
          setProject({
            ...project,
            files: project.files.map(file => 
              file.id === selectedFile.fileId ? { ...file, content: fileContent } : file
            )
          })
        }
        
        // Update tab content
        setOpenTabs(prev => prev.map(tab => 
          tab.id === selectedFile.fileId ? { ...tab, content: fileContent } : tab
        ))
        
        // Update selected file content
        setSelectedFile(prev => prev ? { ...prev, content: fileContent } : null)
      } else {
        toast.error('Failed to save file')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save file')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent)
    toast.success('Code copied to clipboard')
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

  const getCombinedHTMLContent = (targetFile?: string) => {
    if (!project) return ''
    
    // If targetFile is specified, try to find that specific HTML file
    let htmlFile = project.files.find(f => f.type === 'HTML' && f.path === targetFile)
    
    // If target file not found, fall back to main HTML file
    if (!htmlFile) {
      htmlFile = project.files.find(f => f.type === 'HTML')
    }
    
    if (!htmlFile) return ''
    
    let htmlContent = htmlFile.content
    
    // Get all CSS files
    const cssFiles = project.files.filter(f => f.type === 'CSS')
    const cssContent = cssFiles.map(f => f.content).join('\n')
    
    // Get all JavaScript files
    const jsFiles = project.files.filter(f => f.type === 'JAVASCRIPT')
    const jsContent = jsFiles.map(f => f.content).join('\n')
    
    // Inject CSS into the HTML
    if (cssContent) {
      // Remove existing CSS links and add inline styles
      htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
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

  const handlePreview = () => {
    const combinedContent = getCombinedHTMLContent(currentPage)
    if (combinedContent) {
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(combinedContent)
        newWindow.document.close()
      }
    } else {
      toast.error('No HTML file found for preview')
    }
  }

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile':
        return 'w-80'
      case 'tablet':
        return 'w-128'
      case 'desktop':
        return 'w-full'
      default:
        return 'w-full'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session || !project) {
    return null
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${params.id}`)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2">
            <FileCode className="h-5 w-5 text-blue-400" />
            <span className="text-lg font-semibold">Code Editor</span>
            {selectedFile && (
              <Badge variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                {getFileType(selectedFile.name)}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            title={sidebarCollapsed ? 'Show Project Files' : 'Hide Project Files'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreview}
            className="text-gray-300 hover:text-white hover:bg-gray-700 border border-blue-600"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          {selectedFile && selectedFile.name.endsWith('.html') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewCollapsed(!previewCollapsed)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              title={previewCollapsed ? 'Show Preview' : 'Hide Preview'}
            >
              {previewCollapsed ? <ChevronRight className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4 rotate-90" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-gray-300 hover:text-white hover:bg-gray-700 border border-blue-600"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <ProfileDropdown />
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)] min-h-0">
        {/* Left Sidebar - Project Files */}
        <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col h-full min-h-0 relative ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        }`}>
          {/* Collapse Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-4 -right-3 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-1 rounded-full border border-gray-600 transition-colors"
            title={sidebarCollapsed ? 'Expand Project Files' : 'Collapse Project Files'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Project Files</h3>
                <span className="text-xs text-gray-500">{project.files.length} files</span>
              </div>
            </div>
          )}
          
          <div className="flex-1 p-2 overflow-y-auto">
            {project.files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileSelect(file)}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                  selectedFile?.fileId === file.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                title={sidebarCollapsed ? (file.path.split('/').pop() || file.path) : undefined}
              >
                {getFileIcon(file.path)}
                {!sidebarCollapsed && (
                  <span className="text-sm truncate">{file.path.split('/').pop() || file.path}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-h-0">
          {/* Combined File Header and Tabs */}
          {selectedFile && (
            <div className="bg-gray-800 border-b border-gray-700">
              {/* File Header */}
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-sm text-gray-300 font-medium">{selectedFile.name}</span>
                  {selectedFile.name.endsWith('.html') && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">HTML</span>
                  )}
                  {selectedFile.name.endsWith('.css') && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">CSS</span>
                  )}
                  {selectedFile.name.endsWith('.js') && (
                    <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">JS</span>
                  )}
                  {selectedFile.name.endsWith('.md') && (
                    <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">MD</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {fileContent.split('\n').length} lines
                  </span>
                  <span className="text-xs text-gray-500">
                    {fileContent.length} characters
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              {/* File Tabs */}
              {openTabs.length > 0 && (
                <div className="flex overflow-x-auto border-t border-gray-700">
                  {openTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`flex items-center space-x-2 px-4 py-2 border-r border-gray-700 cursor-pointer min-w-0 ${
                        activeTab === tab.id 
                          ? 'bg-gray-900 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      onClick={() => handleTabSwitch(tab.id)}
                    >
                      {getFileIcon(tab.name)}
                      <span className="text-sm truncate max-w-32">{tab.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTabClose(tab.id)
                        }}
                        className="ml-2 text-gray-500 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 flex h-full min-h-0">
            <div className="flex-1 bg-gray-900 h-full min-h-0">
              {selectedFile ? (
                <div className="h-full flex flex-col min-h-0">

                  {/* Line Numbers and Editor */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Line Numbers */}
                    <div 
                      className="bg-gray-800 border-r border-gray-700 px-3 py-4 text-gray-500 text-sm font-mono select-none overflow-hidden"
                      style={{
                        transform: `translateY(-${scrollPosition.scrollTop}px)`,
                        minHeight: `${fileContent.split('\n').length * 24}px`
                      }}
                    >
                      {fileContent.split('\n').map((_, index) => (
                        <div key={index} className="leading-6 text-right h-6">
                          {index + 1}
                        </div>
                      ))}
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 relative overflow-hidden">
                      <textarea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        onScroll={handleScroll}
                        className="w-full h-full bg-transparent text-transparent font-mono text-sm resize-none outline-none p-4 leading-6 absolute inset-0 z-20"
                        placeholder="Start typing your code..."
                        spellCheck={false}
                        style={{
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          lineHeight: '1.5',
                          tabSize: 2,
                          caretColor: 'white',
                          overflow: 'auto'
                        }}
                      />
                      
                      {/* Syntax highlighting overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none p-4 font-mono text-sm leading-6 z-10"
                        style={{
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          transform: `translate(-${scrollPosition.scrollLeft}px, -${scrollPosition.scrollTop}px)`,
                          minHeight: `${fileContent.split('\n').length * 24}px`,
                          width: 'max-content',
                          minWidth: '100%'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: getSyntaxHighlightedCode(fileContent, selectedFile.name)
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                      <span>Ln {fileContent.split('\n').length}, Col {fileContent.length}</span>
                      <span>{getFileType(selectedFile.name)}</span>
                      <span>UTF-8</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span>Spaces: 2</span>
                      <span>{selectedFile.name}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a file to start editing</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {selectedFile && selectedFile.name.endsWith('.html') && (
              <div className={`bg-gray-800 border-l border-gray-700 flex flex-col h-full transition-all duration-300 relative ${
                previewCollapsed ? 'w-12' : 'w-[900px]'
              }`}>
                {/* Collapse Button */}
                <button
                  onClick={() => setPreviewCollapsed(!previewCollapsed)}
                  className="absolute top-4 -left-3 z-10 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-1 rounded-full border border-gray-600 transition-colors"
                  title={previewCollapsed ? 'Expand Preview' : 'Collapse Preview'}
                >
                  {previewCollapsed ? (
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  ) : (
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  )}
                </button>

                {!previewCollapsed && (
                  <>
                    <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-300">Preview</h3>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('desktop')}
                          className={`p-1 ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Desktop View"
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('tablet')}
                          className={`p-1 ${previewMode === 'tablet' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Tablet View"
                        >
                          <Tablet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode('mobile')}
                          className={`p-1 ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          title="Mobile View"
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-auto">
                      <div className={`mx-auto bg-white rounded-lg shadow-lg ${getPreviewWidth()}`}>
                        <iframe
                          srcDoc={getCombinedHTMLContent(currentPage)}
                          className="w-full h-full border-0 rounded-lg"
                          title="Preview"
                          key={currentPage} // Force re-render when page changes
                          style={{ minHeight: '800px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {previewCollapsed && (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Eye className="h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">Preview</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
