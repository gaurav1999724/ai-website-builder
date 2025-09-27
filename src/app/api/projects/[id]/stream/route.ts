import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id

  try {
    // Get the project to check its status
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!project) {
      return new Response('Project not found', { status: 404 })
    }

    // If project is not generating, return a simple response
    if (project.status !== 'GENERATING') {
      return new Response('data: {"type":"complete","data":{"status":"Project already completed"}}\n\n', {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial status
        const initialStatus = {
          type: 'status',
          data: {
            status: 'Project generation in progress...',
            progress: 50
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialStatus)}\n\n`))

        // Poll for project updates
        const pollInterval = setInterval(async () => {
          try {
            const updatedProject = await prisma.project.findUnique({
              where: { id: projectId },
              include: {
                files: true,
                generations: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            })

            if (!updatedProject) {
              clearInterval(pollInterval)
              controller.close()
              return
            }

            // Check if generation is complete
            if (updatedProject.status === 'COMPLETED') {
              const completeStatus = {
                type: 'complete',
                data: {
                  status: 'Generation completed!',
                  progress: 100,
                  files: updatedProject.files
                }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeStatus)}\n\n`))
              clearInterval(pollInterval)
              controller.close()
            } else if (updatedProject.status === 'FAILED') {
              const errorStatus = {
                type: 'error',
                data: {
                  status: 'Generation failed',
                  error: 'Project generation failed'
                }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorStatus)}\n\n`))
              clearInterval(pollInterval)
              controller.close()
            } else {
              // Send current file count as progress indicator
              const fileCount = updatedProject.files.length
              const progress = Math.min(20 + (fileCount * 10), 90)
              
              const statusUpdate = {
                type: 'status',
                data: {
                  status: `Generated ${fileCount} files...`,
                  progress: progress
                }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`))
            }
          } catch (error) {
            console.error('Error polling project status:', error)
            clearInterval(pollInterval)
            controller.close()
          }
        }, 2000) // Poll every 2 seconds

        // Cleanup on close
        return () => {
          clearInterval(pollInterval)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })

  } catch (error) {
    console.error('Stream error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
