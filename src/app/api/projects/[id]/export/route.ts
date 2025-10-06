import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateOnly } from '@/lib/utils'
import { createVercelProjectStructure } from '@/lib/vercel'
import JSZip from 'jszip'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

          const { searchParams } = new URL(request.url)
          const format = searchParams.get('format') || 'zip'
          const platform = 'vercel' // Only support Vercel for static projects

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        files: true,
        config: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (format === 'json') {
      // Return project data as JSON
      return NextResponse.json({
        success: true,
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          prompt: project.prompt,
          files: project.files,
          config: project.config,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      })
    }

    // Create ZIP file with deployment-ready structure
    const zip = new JSZip()
    
    // Create platform-specific project structure
    const projectFiles = project.files.map((file: any) => ({
      path: file.path,
      content: file.content,
      type: file.type
    }))

    // Create Vercel-ready static project structure
    const files = createVercelProjectStructure(projectFiles, project.title)

    // Add all files to ZIP
    Object.entries(files).forEach(([path, content]) => {
      zip.file(path, content)
    })

    // Add comprehensive README
    const readmeContent = `# ${project.title}

${project.description || 'Generated with AI Website Builder'}

## Original Prompt
${project.prompt}

## Generated Files
${project.files.map((file: any) => `- ${file.path}`).join('\n')}

## Deployment Instructions

### Deploy to Vercel (Recommended)
This is a static website project optimized for Vercel deployment.

#### Option 1: Vercel CLI (Fastest)
1. Install Vercel CLI: \`npm i -g vercel\`
2. Run: \`vercel\`
3. Follow the prompts to deploy
4. Get your live URL instantly!

#### Option 2: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import this project folder
5. Deploy automatically

## Project Details
- Type: Static Website
- Framework: Static HTML/CSS/JS
- Deployment: Vercel (Static Hosting)
- Live URL: Available after deployment

## Features
- ✅ Static file hosting
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Instant deployments

Generated on ${formatDateOnly(new Date())}
`

    zip.file('README.md', readmeContent)

    // Add deployment scripts
    zip.file('deploy.sh', `#!/bin/bash
# Vercel deployment script for ${project.title}

echo "🚀 Starting Vercel deployment process..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed successfully!"
echo "🌐 Your website is now live on Vercel!"
echo "📖 Check the output above for your live URL."
`)

    zip.file('deploy.bat', `@echo off
REM Vercel deployment script for ${project.title}

echo 🚀 Starting Vercel deployment process...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
vercel --prod

echo ✅ Deployment completed successfully!
echo 🌐 Your website is now live on Vercel!
echo 📖 Check the output above for your live URL.
pause`)

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // Return ZIP file
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-vercel.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
