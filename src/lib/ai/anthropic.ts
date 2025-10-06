import { logger } from '../logger'
import { sortFilesByPriority } from '../utils'
import { getSystemPrompt } from './prompt-helper'
// Removed unused imports to fix TypeScript errors

// Baseten API configuration
const BASETEN_API_URL = 'https://inference.baseten.co/v1/chat/completions'
const BASETEN_API_KEY =  process.env.BASETEN_API_KEY
const BASETEN_MODEL =  process.env.BASETEN_MODEL || 'anthropic/claude-3-sonnet'

export interface AIResponse {
  content: string
  files: Array<{
    path: string
    content: string
    type: string
    size: number
  }>
  metadata: {
    model: string
    tokens: number
    provider: string
  }
}

// Helper function to determine file type from path
function getFileTypeFromPath(path: string): string {
  const extension = path.toLowerCase().split('.').pop()
  switch (extension) {
    case 'html':
    case 'htm':
      return 'HTML'
    case 'css':
      return 'CSS'
    case 'js':
    case 'mjs':
      return 'JAVASCRIPT'
    case 'json':
      return 'JSON'
    case 'md':
    case 'txt':
      return 'TEXT'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'OTHER'
    default:
      return 'OTHER'
  }
}

export async function generateWebsiteWithAnthropic(prompt: string, images?: string[]): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    await logger.info('Starting Baseten AI generation', {
      provider: 'baseten',
      promptLength: prompt.length
    })

    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt('anthropic' as any, 'website-generation' as any)

    // Enhance prompt with image information if images are provided
    let enhancedPrompt = prompt
    if (images && images.length > 0) {
      enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
    }

    // Prepare the request payload
    const requestBody = {
      model: BASETEN_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      stream: false,
      max_tokens: 50000
    }

    await logger.info('Sending request to Baseten API >>>>>>>>>>>>>>>  ', {
      model: BASETEN_MODEL,
      content: requestBody
    })

    // Make the API request
    const response = await fetch(BASETEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${BASETEN_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Baseten API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    await logger.info('Baseten API response received', {
      model: BASETEN_MODEL,
      content: data
    })

    // Extract the content from the response
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content received from Baseten API')
    }

    // Parse the JSON response
    let parsedResponse
    let jsonContent = content.trim()

    // Extract JSON from code blocks if present
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    try {
      parsedResponse = JSON.parse(jsonContent)
      await logger.info('Successfully parsed Baseten response', {
        model: BASETEN_MODEL,
        hasContent: !!parsedResponse.description,
        filesCount: Array.isArray(parsedResponse.files) ? parsedResponse.files.length : 0
      })
    } catch (parseError) {
      await logger.error('Failed to parse Baseten response', parseError as Error, {
        model: BASETEN_MODEL,
        rawResponse: content.substring(0, 1000) + '...',
        jsonContent: jsonContent.substring(0, 1000) + '...'
      })
      throw new Error('Invalid JSON response from Baseten API')
    }

    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Baseten API')
    }

    // Process files
    let processedFiles = []
    if (Array.isArray(parsedResponse.files)) {
      processedFiles = parsedResponse.files.map((file: any) => ({
        path: file.path || 'unknown',
        content: file.content || '',
        type: file.type === 'IMAGE' ? 'OTHER' : (file.type || getFileTypeFromPath(file.path || '')),
        size: file.size || (file.content ? file.content.length : 0)
      }))
    }

    const aiResponse: AIResponse = {
      content: parsedResponse.description || parsedResponse.content || 'Website generated successfully',
      files: sortFilesByPriority(processedFiles),
      metadata: {
        model: BASETEN_MODEL,
        tokens: data.usage?.total_tokens || 0,
        provider: 'baseten'
      }
    }

    await logger.info('Baseten AI generation completed successfully', {
      model: BASETEN_MODEL,
      duration: Date.now() - startTime,
      fileCount: aiResponse.files.length,
      contentLength: aiResponse.content.length
    })

    return aiResponse
  } catch (error) {
    await logger.error('Baseten AI generation failed', error as Error, {
      model: BASETEN_MODEL,
      duration: Date.now() - startTime,
      promptLength: prompt.length
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        throw new Error('Baseten API is currently unavailable due to network issues. Please check your internet connection and try again, or switch to a different AI provider.')
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('Baseten API key is invalid or missing. Please check your configuration.')
      } else if (error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('Baseten API quota exceeded. Please try again later or switch to a different AI provider.')
      } else if (error.message.includes('500') || error.message.includes('server error')) {
        throw new Error('Baseten API server error. Please try again later or switch to a different AI provider.')
      }
    }

    throw new Error(`Baseten generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Fast generation function for ultra-quick responses
export async function generateWebsiteWithAnthropicFast(prompt: string, images?: string[]): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    await logger.info('Starting Baseten AI fast generation', {
      provider: 'baseten',
      promptLength: prompt.length
    })

    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt('anthropic' as any, 'website-generation' as any)

    // Enhance prompt with image information if images are provided
    let enhancedPrompt = prompt
    if (images && images.length > 0) {
      enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
    }

    // Prepare the request payload with reduced max_tokens for faster response
    const requestBody = {
      model: BASETEN_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      stream: false,
      max_tokens: 30000 // Reduced for faster response
    }

    // Make the API request
    const response = await fetch(BASETEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${BASETEN_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Baseten API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    // Extract the content from the response
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content received from Baseten API')
    }

    // Parse the JSON response with streamlined approach
    let parsedResponse
    let jsonContent = content.trim()

    // Extract JSON from code blocks if present
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    try {
      parsedResponse = JSON.parse(jsonContent)
      await logger.info('Successfully parsed Baseten fast response', {
        model: BASETEN_MODEL,
        hasContent: !!parsedResponse.description,
        filesCount: Array.isArray(parsedResponse.files) ? parsedResponse.files.length : 0
      })
    } catch (parseError) {
      await logger.error('Failed to parse Baseten fast response', parseError as Error, {
        model: BASETEN_MODEL,
        rawResponse: content.substring(0, 1000) + '...'
      })
      throw new Error('Invalid JSON response from Baseten API')
    }

    // Process files
    let processedFiles = []
    if (Array.isArray(parsedResponse.files)) {
      processedFiles = parsedResponse.files.map((file: any) => ({
        path: file.path || 'unknown',
        content: file.content || '',
        type: file.type === 'IMAGE' ? 'OTHER' : (file.type || getFileTypeFromPath(file.path || '')),
        size: file.size || (file.content ? file.content.length : 0)
      }))
    }

    const aiResponse: AIResponse = {
      content: parsedResponse.description || parsedResponse.content || 'Website generated successfully',
      files: sortFilesByPriority(processedFiles),
      metadata: {
        model: BASETEN_MODEL,
        tokens: data.usage?.total_tokens || 0,
        provider: 'baseten'
      }
    }

    await logger.info('Baseten AI fast generation completed successfully', {
      model: BASETEN_MODEL,
      duration: Date.now() - startTime,
      fileCount: aiResponse.files.length,
      contentLength: aiResponse.content.length
    })

    return aiResponse
  } catch (error) {
    await logger.error('Baseten AI fast generation failed', error as Error, {
      model: BASETEN_MODEL,
      duration: Date.now() - startTime,
      promptLength: prompt.length
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        throw new Error('Baseten API is currently unavailable due to network issues. Please check your internet connection and try again, or switch to a different AI provider.')
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('Baseten API key is invalid or missing. Please check your configuration.')
      } else if (error.message.includes('429') || error.message.includes('quota')) {
        throw new Error('Baseten API quota exceeded. Please try again later or switch to a different AI provider.')
      } else if (error.message.includes('500') || error.message.includes('server error')) {
        throw new Error('Baseten API server error. Please try again later or switch to a different AI provider.')
      }
    }

    throw new Error(`Baseten fast generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
