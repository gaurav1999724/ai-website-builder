import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextRequest } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date)
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
  }

  return formatDate(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(dateObj)
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(dateObj)
}

export function formatDateOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(dateObj)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function getFileTypeFromExtension(extension: string): string {
  const typeMap: Record<string, string> = {
    'html': 'html',
    'css': 'css',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'md': 'markdown',
    'vue': 'vue',
    'py': 'python',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
  }
  
  return typeMap[extension] || 'text'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function extractRequestContext(request: NextRequest) {
  return {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  }
}

export function sortFilesByPriority(files: any[]): any[] {
  if (!files || files.length === 0) return files
  
  return files.sort((a, b) => {
    const getPriority = (file: any) => {
      const path = file.path?.toLowerCase() || ''
      
      // Priority 1: index.html
      if (path.endsWith('index.html')) return 1
      
      // Priority 2: home.html
      if (path.endsWith('home.html')) return 2
      
      // Priority 3: main HTML files
      if (path.endsWith('.html')) return 3
      
      // Priority 4: main CSS files
      if (path.endsWith('main.css') || path.endsWith('style.css') || path.endsWith('styles.css')) return 4
      
      // Priority 5: other CSS files
      if (path.endsWith('.css')) return 5
      
      // Priority 6: main JS files
      if (path.endsWith('main.js') || path.endsWith('script.js') || path.endsWith('scripts.js')) return 6
      
      // Priority 7: other JS files
      if (path.endsWith('.js')) return 7
      
      // Priority 8: package.json
      if (path.endsWith('package.json')) return 8
      
      // Priority 9: README files
      if (path.endsWith('readme.md') || path.endsWith('readme.txt')) return 9
      
      // Priority 10: everything else
      return 10
    }
    
    const priorityA = getPriority(a)
    const priorityB = getPriority(b)
    
    // If priorities are the same, sort alphabetically
    if (priorityA === priorityB) {
      return (a.path || '').localeCompare(b.path || '')
    }
    
    return priorityA - priorityB
  })
}
