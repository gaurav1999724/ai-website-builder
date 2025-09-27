import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { AIProvider, PromptType } from '@prisma/client'

export async function getSystemPrompt(provider: AIProvider, type: PromptType): Promise<string> {
  try {
    const prompt = await prisma.aIPrompt.findFirst({
      where: {
        provider,
        type,
        isActive: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (prompt) {
      await logger.info('Using dynamic system prompt', {
        provider,
        type,
        promptId: prompt.id,
        promptName: prompt.name
      })
      return prompt.systemPrompt
    }

    // Fallback to default prompts if none found in database
    await logger.warn('No dynamic prompt found, using fallback', {
      provider,
      type
    })

    return getFallbackPrompt(provider, type)
  } catch (error) {
    await logger.error('Error fetching system prompt', error as Error, {
      provider,
      type
    })
    return getFallbackPrompt(provider, type)
  }
}

function getFallbackPrompt(provider: string, type: string): string {
  const basePrompt = `You are an expert web developer. Generate a complete website based on the user's prompt. 

IMPORTANT: Return ONLY a valid JSON object. Do not wrap it in markdown code blocks or add any other text.

Return your response as a JSON object with this exact structure:
{
  "files": [
    {
      "path": "{file-path-and-name}",
      "content": "{File content here}",
      "type": "file-type (html, css, javascript, json, etc.)"
    }
  ],
  "description": "Brief description of the project/website"
}


Requirements:
- Create a complete, functional website
- Use modern and advanced HTML5, CSS3, and JavaScript
- Make it responsive and mobile-friendly
- Include proper semantic HTML
- Use the maximum number of files and components to create a complete project
- Use modern and advanced CSS features like Flexbox/Grid
- Add interactive elements with JavaScript
- Ensure all code is clean and well-commented and follows best practices
- Create at least 5-15 files for a complete project
- Return ONLY valid JSON, no markdown formatting and no additional text

Focus on creating a professional, modern website that matches the user's requirements.`

  const modificationPrompt = `You are an expert web developer. The user wants to modify an existing website project. 

CURRENT PROJECT FILES:
{currentFiles}

MODIFICATION REQUEST: {prompt}

Please analyze the current files and provide ONLY the modifications needed. Return a JSON response with this exact structure:

{
  "content": "Brief description of what was modified",
  "files": [
    {
      "path": "file/path.html",
      "content": "complete file content with modifications",
      "type": "HTML"
    }
  ],
  "metadata": {
    "model": "${provider.toLowerCase()}",
    "tokens": 0,
    "provider": "${provider.toLowerCase()}"
  }
}

IMPORTANT RULES:
1. Only modify files that need changes based on the user's request
2. Include the complete file content for modified files
3. Do not include files that don't need changes
4. Preserve the existing structure and styling unless specifically asked to change it
5. Make minimal, targeted changes
6. Return ONLY valid JSON, no markdown formatting or additional text`

  const chatPrompt = `You are an expert web developer and AI assistant helping users with their website projects. 
You can help with:
- HTML, CSS, JavaScript questions
- Web development best practices
- Code debugging and optimization
- UI/UX design suggestions
- Project structure advice
- Technology recommendations

Be helpful, concise, and provide practical solutions. If the user asks about a specific project, provide relevant advice based on web development best practices.`

  switch (type.toUpperCase()) {
    case 'WEBSITE_GENERATION':
      return basePrompt
    case 'WEBSITE_MODIFICATION':
      return modificationPrompt
    case 'CHAT_ASSISTANT':
      return chatPrompt
    default:
      return basePrompt
  }
}
