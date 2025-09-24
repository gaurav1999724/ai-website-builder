import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger, extractRequestContext } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    // Use session user ID if available, otherwise use the test user ID
    let userId = session?.user?.id
    
    if (!userId) {
      // Use the test user ID for unauthenticated requests
      userId = 'cmfw73dsc0000tg96at3bmxex'
    }

    // Get project with files
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: userId
      },
      include: {
        files: true
      }
    })

    if (!project) {
      return new NextResponse('Project not found', { status: 404 })
    }

    // Find HTML, CSS, and JS files
    const htmlFile = project.files.find(f => 
      f.path.endsWith('.html') || f.path.endsWith('.htm')
    )
    const cssFile = project.files.find(f => f.path.endsWith('.css'))
    const jsFile = project.files.find(f => f.path.endsWith('.js'))

    if (!htmlFile) {
      return new NextResponse('No HTML file found', { status: 404 })
    }

    // Build complete HTML document
    let htmlContent = htmlFile.content

    // Ensure proper HTML structure
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      htmlContent = `<!DOCTYPE html>\n<html lang="en">\n${htmlContent}\n</html>`
    }

    // Embed CSS
    if (cssFile) {
      const cssEmbed = `<style>\n${cssFile.content}\n</style>`
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${cssEmbed}\n</head>`)
      } else if (htmlContent.includes('<head>')) {
        htmlContent = htmlContent.replace('<head>', `<head>\n${cssEmbed}`)
      } else {
        htmlContent = htmlContent.replace('<html', `<html>\n<head>\n${cssEmbed}\n</head>\n<body>`)
        if (!htmlContent.includes('</body>')) {
          htmlContent = htmlContent.replace('</html>', '</body>\n</html>')
        }
      }
    }

    // Embed JavaScript
    if (jsFile) {
      const jsEmbed = `<script>\n${jsFile.content}\n</script>`
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${jsEmbed}\n</body>`)
      } else if (htmlContent.includes('<body>')) {
        htmlContent = htmlContent.replace('<body>', `<body>\n${jsEmbed}`)
      } else {
        htmlContent = htmlContent.replace('</html>', `\n${jsEmbed}\n</html>`)
      }
    }

    await logger.info('Project preview served', {
      projectId: params.id,
      userId: userId,
      hasCSS: !!cssFile,
      hasJS: !!jsFile,
      ...requestContext
    })

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    await logger.error('Failed to serve project preview', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return new NextResponse('Internal server error', { status: 500 })
  }
}
