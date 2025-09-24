import JSZip from 'jszip'

export interface ProjectFile {
  path: string
  content: string
  type: string
}

export interface ProjectData {
  title: string
  description?: string
  prompt: string
  files: ProjectFile[]
  createdAt: Date
}

export async function exportProjectAsZip(projectData: ProjectData): Promise<Blob> {
  const zip = new JSZip()
  
  // Add all project files
  projectData.files.forEach(file => {
    zip.file(file.path, file.content)
  })

  // Add README file
  const readmeContent = `# ${projectData.title}

${projectData.description || 'Generated with AI Website Builder'}

## Original Prompt
${projectData.prompt}

## Generated Files
${projectData.files.map(file => `- ${file.path}`).join('\n')}

## Instructions
1. Extract all files to a folder
2. Open index.html in your browser
3. Customize as needed

Generated on ${projectData.createdAt.toLocaleDateString()}
`

  zip.file('README.md', readmeContent)

  // Add package.json if not present
  if (!projectData.files.some(f => f.path === 'package.json')) {
    const packageJson = {
      name: projectData.title.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: projectData.description || 'AI-generated website',
      main: 'index.html',
      scripts: {
        start: 'npx serve .',
        build: 'echo "No build process needed for static site"'
      },
      keywords: ['website', 'ai-generated', 'static'],
      author: 'AI Website Builder',
      license: 'MIT'
    }
    
    zip.file('package.json', JSON.stringify(packageJson, null, 2))
  }

  // Generate ZIP blob
  return await zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadProject(projectData: ProjectData) {
  try {
    const zipBlob = await exportProjectAsZip(projectData)
    const filename = `${projectData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`
    downloadBlob(zipBlob, filename)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export project')
  }
}
