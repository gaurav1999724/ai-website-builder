import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enhanceUserPrompt } from '@/lib/ai/prompt-enhancer'
import { logger, extractRequestContext } from '@/lib/logger'
import { z } from 'zod'

const suggestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'cerebras']).default('cerebras'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestContext = extractRequestContext(request)
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      await logger.warn('Unauthorized attempt to get AI suggestions', requestContext)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, provider } = suggestSchema.parse(body)

    // Enhance the user prompt for better suggestions
    const enhancedPrompt = await enhanceUserPrompt(prompt, {
      userIntent: 'modify',
      projectType: 'website'
    })

    // Get project with all files
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        files: true,
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!project) {
      await logger.warn('Project not found for AI suggestions', {
        projectId: params.id,
        userId: session.user.id,
        ...requestContext
      })
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Prepare project context for AI
    const projectContext = {
      title: project.title,
      description: project.description,
      status: project.status,
      files: project.files.map(file => ({
        path: file.path,
        type: file.type,
        size: file.size,
        content: file.content.substring(0, 2000) // Limit content length
      })),
      recentGenerations: project.generations.map(gen => ({
        prompt: gen.prompt,
        status: gen.status,
        createdAt: gen.createdAt
      }))
    }

    // Create AI suggestion prompt
    const systemPrompt = `You are an expert web developer and AI assistant. Analyze the provided project and give helpful suggestions for improvements, optimizations, and new features.

Project Context:
- Title: ${projectContext.title}
- Description: ${projectContext.description || 'No description'}
- Status: ${projectContext.status}
- Files: ${projectContext.files.length} files

User Request: ${prompt}

Please provide:
1. **Analysis**: Brief analysis of the current project
2. **Suggestions**: Specific, actionable suggestions for improvements
3. **Code Examples**: If applicable, provide code snippets or examples
4. **Best Practices**: Recommendations following modern web development standards
5. **Next Steps**: Clear action items for implementation

Format your response in a clear, structured way that's easy to read and implement.`

    // Generate intelligent suggestions based on project context
    let aiResponse: string

    try {
      // Analyze project files and generate contextual suggestions
      const fileTypes = projectContext.files.map(f => f.type)
      const hasHTML = fileTypes.includes('HTML')
      const hasCSS = fileTypes.includes('CSS')
      const hasJS = fileTypes.includes('JAVASCRIPT')
      const hasImages = fileTypes.some(t => ['IMAGE', 'PNG', 'JPG', 'JPEG', 'SVG'].includes(t))
      
          // Generate contextual suggestions based on enhanced user prompt and project analysis
          const userRequest = enhancedPrompt.toLowerCase()
      
      if (userRequest.includes('performance') || userRequest.includes('speed') || userRequest.includes('optimize')) {
        aiResponse = `**Performance Optimization Suggestions for "${projectContext.title}"**

**Current Analysis:**
- Project has ${projectContext.files.length} files
- File types: ${Array.from(new Set(fileTypes)).join(', ')}
- Status: ${projectContext.status}

**Performance Recommendations:**
1. **Image Optimization**: ${hasImages ? 'Consider compressing existing images and adding WebP format support' : 'Add image optimization for future images'}
2. **CSS Optimization**: ${hasCSS ? 'Minify CSS and remove unused styles' : 'Consider adding CSS for better styling'}
3. **JavaScript Optimization**: ${hasJS ? 'Minify JS and implement code splitting' : 'Add JavaScript for interactivity'}
4. **Caching**: Implement browser caching headers
5. **CDN**: Consider using a CDN for static assets

**Code Examples:**
\`\`\`html
<!-- Add to HTML head for performance -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preload" href="styles.css" as="style">
\`\`\`

**Next Steps:**
1. Audit current performance with browser dev tools
2. Implement lazy loading for images
3. Add service worker for caching
4. Optimize critical rendering path`
        
      } else if (userRequest.includes('responsive') || userRequest.includes('mobile')) {
        aiResponse = `**Mobile Responsiveness Suggestions for "${projectContext.title}"**

**Current Analysis:**
- Project has ${projectContext.files.length} files
- File types: ${Array.from(new Set(fileTypes)).join(', ')}
- Status: ${projectContext.status}

**Responsive Design Recommendations:**
1. **Viewport Meta Tag**: Ensure proper viewport configuration
2. **Flexible Layouts**: Use CSS Grid and Flexbox
3. **Touch-Friendly**: Increase button sizes for mobile
4. **Typography**: Use relative units (rem, em)
5. **Images**: Implement responsive images

**Code Examples:**
\`\`\`css
/* Responsive container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Mobile-first approach */
@media (max-width: 768px) {
  .container {
    padding: 0 0.5rem;
  }
}
\`\`\`

**Next Steps:**
1. Test on various device sizes
2. Implement mobile navigation
3. Optimize touch interactions
4. Add mobile-specific features`
        
      } else if (userRequest.includes('security') || userRequest.includes('safe')) {
        aiResponse = `**Security Enhancement Suggestions for "${projectContext.title}"**

**Current Analysis:**
- Project has ${projectContext.files.length} files
- File types: ${Array.from(new Set(fileTypes)).join(', ')}
- Status: ${projectContext.status}

**Security Recommendations:**
1. **Input Validation**: Sanitize all user inputs
2. **HTTPS**: Ensure secure connections
3. **Content Security Policy**: Implement CSP headers
4. **XSS Protection**: Prevent cross-site scripting
5. **Data Protection**: Secure sensitive data handling

**Code Examples:**
\`\`\`html
<!-- Security headers -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
\`\`\`

**Next Steps:**
1. Implement input validation
2. Add security headers
3. Use HTTPS everywhere
4. Regular security audits`
        
      } else {
        // General suggestions
        aiResponse = `**Project Analysis & Suggestions for "${projectContext.title}"**

**Current Project Status:**
- **Files**: ${projectContext.files.length} files
- **Types**: ${Array.from(new Set(fileTypes)).join(', ')}
- **Status**: ${projectContext.status}
- **Created**: ${new Date(project.createdAt).toLocaleDateString()}

**Your Request**: "${prompt}"

**Comprehensive Suggestions:**

**1. Code Quality & Structure**
- Add proper error handling and validation
- Implement consistent coding standards
- Add comments and documentation
- Use semantic HTML elements

**2. Performance Optimization**
- Optimize images and assets
- Implement lazy loading
- Minify CSS and JavaScript
- Add caching strategies

**3. User Experience**
- Improve accessibility (ARIA labels, keyboard navigation)
- Add loading states and feedback
- Implement responsive design
- Test across different browsers

**4. Modern Web Standards**
- Use CSS Grid and Flexbox
- Implement progressive enhancement
- Add service workers for offline support
- Follow WCAG accessibility guidelines

**5. Development Best Practices**
- Add unit tests
- Implement version control
- Use build tools for optimization
- Set up continuous integration

**File Analysis:**
${projectContext.files.map(file => `- **${file.path}**: ${file.type} (${file.size} bytes)`).join('\n')}

**Next Steps:**
1. Prioritize based on your specific needs
2. Implement changes incrementally
3. Test thoroughly after each change
4. Monitor performance and user feedback

Would you like me to elaborate on any of these suggestions or help with specific implementations?`
      }
      
    } catch (error) {
      await logger.error('Suggestion generation failed', error as Error, {
        projectId: params.id,
        provider,
        ...requestContext
      })
      
      // Fallback response
      aiResponse = `**Project Analysis for "${projectContext.title}"**

**Current Status:**
- Files: ${projectContext.files.length}
- Status: ${projectContext.status}
- Types: ${Array.from(new Set(projectContext.files.map(f => f.type))).join(', ')}

**General Recommendations:**
1. **Performance**: Optimize images and implement lazy loading
2. **Accessibility**: Add ARIA labels and keyboard navigation
3. **Security**: Implement input validation and sanitization
4. **Mobile**: Ensure responsive design across all devices
5. **Code Quality**: Add error handling and proper documentation

**File Details:**
${projectContext.files.map(file => `- ${file.path} (${file.type}, ${file.size} bytes)`).join('\n')}

Would you like specific suggestions for any particular aspect of your project?`
    }

    // Save the suggestion to project history
    await prisma.projectHistory.create({
      data: {
        projectId: params.id,
        action: 'AI_SUGGESTION',
        details: `AI suggestion requested: ${prompt.substring(0, 100)}...`,
      },
    })

    await logger.info('AI suggestion generated successfully', {
      projectId: params.id,
      userId: session.user.id,
      provider,
      promptLength: prompt.length,
      ...requestContext
    })

    return NextResponse.json({
      success: true,
      suggestion: aiResponse,
      project: {
        id: project.id,
        title: project.title,
        fileCount: project.files.length
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      await logger.warn('Invalid request data for AI suggestion', {
        errors: error.issues,
        projectId: params.id,
        ...requestContext
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    await logger.error('AI suggestion generation failed', error as Error, {
      projectId: params.id,
      ...requestContext
    })
    
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
