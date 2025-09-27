import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateOnly } from '@/lib/utils'
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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        files: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create ZIP file
    const zip = new JSZip()
    
    // Add files to ZIP
    project.files.forEach(file => {
      zip.file(file.path, file.content)
    })

    // Add README file
    const readmeContent = `# ${project.title}

${project.description || 'Generated with AI Website Builder'}

## Original Prompt
${project.prompt}

## Generated Files
${project.files.map(file => `- ${file.path}`).join('\n')}

## Instructions
1. Extract all files to a folder
2. Open index.html in your browser
3. Customize as needed

Generated on ${formatDateOnly(new Date())}
`

    zip.file('README.md', readmeContent)

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // Return ZIP file
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip"`,
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
