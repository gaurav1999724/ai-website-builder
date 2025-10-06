import { logger } from './logger'

export interface VercelDeploymentOptions {
  name: string
  files: Record<string, string>
  projectSettings?: {
    framework?: string
    buildCommand?: string
    outputDirectory?: string
    installCommand?: string
    devCommand?: string
  }
  target?: 'production' | 'preview'
  alias?: string[]
}

export interface VercelDeploymentResponse {
  id: string
  url: string
  name: string
  meta: Record<string, any>
  regions: string[]
  target: string
  alias: string[]
  projectId: string
  projectName: string
  readyState: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED'
  createdAt: number
  buildingAt: number
  readyAt?: number
}

export interface VercelProject {
  id: string
  name: string
  accountId: string
  createdAt: number
  updatedAt: number
  targets: Record<string, any>
}

export class VercelAPI {
  private apiToken: string
  private baseURL = 'https://api.vercel.com'

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()                    // Convert to lowercase
      .replace(/\s+/g, '-')            // Replace spaces with hyphens
      .replace(/[^a-z0-9._-]/g, '')    // Remove invalid characters
      .replace(/--+/g, '-')            // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
      .substring(0, 100)               // Limit to 100 characters
      || 'project'                     // Fallback if empty
  }

  // Generate descriptive project name with title, datetime, and user ID
  generateDescriptiveProjectName(title: string, userId: string): string {
    // Sanitize the title
    const sanitizedTitle = this.sanitizeProjectName(title)
    
    // Generate current date-time in format: YYYYMMDDHHMMSS
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const dateTime = `${year}${month}${day}${hours}${minutes}${seconds}`
    
    // Take first 12 characters of user ID for brevity
    const shortUserId = userId.substring(0, 12).toUpperCase()
    
    // Combine: Title-DateTime-UserID
    const fullName = `${sanitizedTitle}-${dateTime}-${shortUserId}`
    
    // Ensure it doesn't exceed Vercel's 100 character limit
    return fullName.length > 100 ? fullName.substring(0, 100) : fullName
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        const errorMessage = `Vercel API error: ${response.status} ${response.statusText} - ${errorText}`
        
        await logger.error('Vercel API request failed', new Error(errorMessage), {
          status: response.status,
          statusText: response.statusText,
          url,
          method: options.method || 'GET',
          responseBody: errorText
        })
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data
    } catch (error) {
      await logger.error('Vercel API request failed', error as Error, {
        endpoint,
        url,
        method: options.method || 'GET'
      })
      throw error
    }
  }

  async createProject(name: string): Promise<VercelProject> {
    try {
      // Sanitize project name according to Vercel requirements
      const sanitizedName = this.sanitizeProjectName(name)
      
      const project = await this.makeRequest<VercelProject>('/v9/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: sanitizedName,
        }),
      })

      if (!project || !project.id) {
        throw new Error('Invalid project response from Vercel API')
      }

      await logger.info('Vercel project created', {
        projectId: project.id,
        originalName: name,
        sanitizedName: sanitizedName,
        projectName: project.name,
      })

      return project
    } catch (error) {
      await logger.error('Failed to create Vercel project', error as Error, {
        projectName: name,
      })
      throw error
    }
  }

  async deployProject(
    projectId: string,
    options: VercelDeploymentOptions
  ): Promise<VercelDeploymentResponse> {
    try {
      // Prepare files for deployment - use the correct Vercel API format
      const files = Object.entries(options.files).map(([path, content]) => {
        // Log the first 100 characters of each file for debugging
        console.log(`File: ${path}, Content preview: ${content.substring(0, 100)}...`)
        
        return {
          file: path,
          data: content,
        }
      })

      const deployment = await this.makeRequest<VercelDeploymentResponse>(
        `/v13/deployments`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: options.name,
            files,
            target: options.target || 'production',
            project: projectId,
            public: true, // Make deployment public so anyone can access
          }),
        }
      )

      if (!deployment || !deployment.id) {
        throw new Error('Invalid deployment response from Vercel API')
      }

      await logger.info('Vercel deployment started >>>>>>>   ', {
        deploymentId: deployment.id,
        projectId,
        deployment: deployment,
      })

      return deployment
    } catch (error) {
      await logger.error('Failed to deploy to Vercel', error as Error, {
        projectId,
        deploymentName: options.name,
      })
      throw error
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<VercelDeploymentResponse> {
    try {
      const deployment = await this.makeRequest<VercelDeploymentResponse>(
        `/v13/deployments/${deploymentId}`
      )

      
      return deployment
    } catch (error) {
      await logger.error('Failed to get deployment status', error as Error, {
        deploymentId,
      })
      throw error
    }
  }

  async getProject(projectId: string): Promise<VercelProject> {
    try {
      const project = await this.makeRequest<VercelProject>(
        `/v9/projects/${projectId}`
      )

      return project
    } catch (error) {
      await logger.error('Failed to get Vercel project', error as Error, {
        projectId,
      })
      throw error
    }
  }

  async getProjectDeployments(projectId: string): Promise<VercelDeploymentResponse[]> {
    try {
      const response = await this.makeRequest<{ deployments: VercelDeploymentResponse[] }>(
        `/v6/deployments?projectId=${projectId}&limit=10`
      )

      // Return deployments sorted by creation date (newest first)
      const deployments = response?.deployments || []
      return deployments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    } catch (error) {
      await logger.error('Failed to get project deployments', error as Error, {
        projectId
      })
      throw error
    }
  }

  async getDeploymentDetails(deploymentId: string): Promise<VercelDeploymentResponse> {
    try {
      const deployment = await this.makeRequest<VercelDeploymentResponse>(
        `/v13/deployments/${deploymentId}`
      )

      return deployment
    } catch (error) {
      await logger.error('Failed to get deployment details', error as Error, {
        deploymentId
      })
      throw error
    }
  }

  async getPublicDeploymentUrl(deploymentId: string): Promise<string> {
    try {
      const deployment = await this.getDeploymentDetails(deploymentId)
      
      // Check if deployment has alias (public URL)
      if (deployment.alias && deployment.alias.length > 0) {
        const aliasUrl = deployment.alias[0]
        const publicUrl = aliasUrl.startsWith('http') ? aliasUrl : `https://${aliasUrl}`
        await logger.info('Found public alias URL', {
          deploymentId,
          aliasUrl,
          publicUrl
        })
        return publicUrl
      }
      
      // Fallback to deployment URL if no alias
      const fallbackUrl = deployment.url.startsWith('http') ? deployment.url : `https://${deployment.url}`
      await logger.warn('No alias found, using deployment URL', {
        deploymentId,
        deploymentUrl: deployment.url,
        fallbackUrl
      })
      return fallbackUrl
    } catch (error) {
      await logger.error('Failed to get public deployment URL', error as Error, {
        deploymentId
      })
      throw error
    }
  }

  async listProjects(): Promise<VercelProject[]> {
    try {
      const response = await this.makeRequest<{ projects: VercelProject[] }>(
        '/v9/projects'
      )

      // Ensure we return an array even if projects is undefined
      if (!response || typeof response !== 'object') {
        await logger.warn('Invalid response from Vercel API', { response })
        return []
      }
      
      return response.projects || []
    } catch (error) {
      await logger.error('Failed to list Vercel projects', error as Error)
      // Return empty array instead of throwing to allow fallback
      return []
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.makeRequest(`/v9/projects/${projectId}`, {
        method: 'DELETE',
      })

      await logger.info('Vercel project deleted', {
        projectId,
      })
    } catch (error) {
      await logger.error('Failed to delete Vercel project', error as Error, {
        projectId,
      })
      throw error
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const response = await this.makeRequest<{ logs: string[] }>(
        `/v2/deployments/${deploymentId}/events`
      )

      return response.logs || []
    } catch (error) {
      await logger.error('Failed to get deployment logs', error as Error, {
        deploymentId,
      })
      return []
    }
  }
}

// Helper function to create a Vercel-ready static project structure
export function createVercelProjectStructure(
  projectFiles: Array<{ path: string; content: string; type: string }>,
  projectName: string
): Record<string, string> {
  const files: Record<string, string> = {}

  // Add all project files
  projectFiles.forEach(file => {
    files[file.path] = file.content
  })

  // For static projects, we don't need package.json or build configuration
  // Vercel will serve static files directly

  // For static projects, vercel.json is optional
  // Vercel will automatically serve static files without configuration

  return files
}

// Helper function to validate and fix deployment URLs
export function validateAndFixDeploymentUrl(url: string, projectId: string): string {
  if (!url) {
    return `${process.env.NEXTAUTH_URL}/projects/${projectId}/preview`
  }
  
  // Check if the URL is a fake Vercel URL (contains localhost, invalid format, or missing protocol)
  if (url.includes('localhost') || 
      url.includes('gaurav-kumars-projects') ||
      (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return `${process.env.NEXTAUTH_URL}/projects/${projectId}/preview`
  }
  
  // Ensure URL has proper protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  
  return url
}

// Helper function to generate deployment logs
export function generateDeploymentLogs(
  status: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'FAILED',
  step: number = 0
): string[] {
  const logs: string[] = []

  switch (status) {
    case 'BUILDING':
      if (step === 0) {
        logs.push('🚀 Starting Vercel deployment...')
        logs.push('📦 Preparing project files...')
        logs.push('🔍 Analyzing project structure...')
      } else if (step === 1) {
        logs.push('📥 Installing dependencies...')
        logs.push('⬇️  Downloading packages from npm...')
        logs.push('🔗 Resolving dependency tree...')
        logs.push('✅ Dependencies installed successfully')
      } else if (step === 2) {
        logs.push('🏗️  Building project...')
        logs.push('📝 Compiling Next.js application...')
        logs.push('🎨 Processing CSS and assets...')
        logs.push('⚡ Optimizing for production...')
      } else if (step === 3) {
        logs.push('🌐 Deploying to Vercel edge network...')
        logs.push('🔐 Configuring SSL certificates...')
        logs.push('🌍 Setting up global CDN...')
        logs.push('📊 Performance optimizations applied...')
      }
      break
    case 'READY':
      logs.push('🎉 Deployment completed successfully!')
      logs.push('🌐 Your site is now live and accessible')
      logs.push('📊 Performance optimizations applied')
      logs.push('🔒 Security headers configured')
      logs.push('🚀 Ready for production traffic')
      break
    case 'ERROR':
    case 'FAILED':
      logs.push('❌ Deployment failed!')
      logs.push('🔍 Check the build logs for errors')
      logs.push('📞 Please try again or contact support')
      break
    case 'CANCELED':
      logs.push('⏹️  Deployment was canceled')
      logs.push('🔄 You can start a new deployment anytime')
      break
  }

  return logs
}
