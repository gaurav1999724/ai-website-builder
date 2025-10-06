import OpenAI from 'openai'
import { getSystemPrompt } from './prompt-helper'
// import { AIProvider, PromptType } from '@prisma/client'
import { logger } from '../logger'
import { CurrentFile } from './index'

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 300000, // 30 second timeout
      maxRetries: 2, // Retry failed requests
    })
  }
  return openai
}

// Helper function to determine file type from path
function getFileTypeFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'html':
    case 'htm':
      return 'HTML'
    case 'css':
      return 'CSS'
    case 'js':
    case 'jsx':
      return 'JAVASCRIPT'
    case 'ts':
    case 'tsx':
      return 'TYPESCRIPT'
    case 'json':
      return 'JSON'
    case 'md':
    case 'markdown':
      return 'MARKDOWN'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'IMAGE'
    case 'txt':
      return 'TEXT'
    default:
      return 'TEXT'
  }
}

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

export async function generateWebsiteWithOpenAI(prompt: string, images?: string[]): Promise<AIResponse> {
  try {
  
    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt('OPENAI' as any, 'WEBSITE_GENERATION' as any)

    // Enhance prompt with image information if images are provided
    let enhancedPrompt = prompt
    if (images && images.length > 0) {
      enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
    }

    await logger.info('OpenAI fast AI generation >>>>>>>>>>>>  ', {
      provider: 'user',
      content: enhancedPrompt
    })

    await logger.info('OpenAI fast AI generation >>>>>>>>>>>>  ', {
      provider: 'system',
      content: systemPrompt
    })

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo", // Fastest model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: enhancedPrompt }
      ],
      temperature: 0.5, // Lower temperature for faster, more consistent responses
      max_tokens: 13360, // Reduced for faster response
      stream: false, // Ensure non-streaming for faster processing
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Fast JSON extraction and parsing
    let jsonContent = response.trim()
    
    // Quick check for markdown code blocks and extract JSON
    if (jsonContent.includes('```')) {
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
    }

    // Parse JSON with error handling
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const fallbackMatch = response.match(/\{[\s\S]*\}/)
      if (fallbackMatch) {
        try {
          parsedResponse = JSON.parse(fallbackMatch[0])
        } catch {
          throw new Error('Invalid JSON response from OpenAI API')
        }
      } else {
        throw new Error('Invalid JSON response from OpenAI API')
      }
    }

    // Fast validation and processing
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from OpenAI API')
    }
    
    // Optimized file processing
    const files = Array.isArray(parsedResponse.files) ? parsedResponse.files : []
    const processedFiles = files.map((file: any) => ({
      path: file.path || 'index.html',
      content: file.content || '',
      type: file.type || getFileTypeFromPath(file.path || 'index.html'),
      size: file.content ? file.content.length : 0
    }))

    await logger.info('OpenAI generation completed', {
      provider: 'openai',
      filesGenerated: processedFiles.length,
      tokensUsed: completion.usage?.total_tokens || 0
    })

    return {
      content: parsedResponse.description || 'Website generated successfully',
      files: processedFiles,
      metadata: {
        model: completion.model,
        tokens: completion.usage?.total_tokens || 0,
        provider: 'openai'
      }
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Optimized function for fastest possible response
export async function generateWebsiteWithOpenAIFast(prompt: string): Promise<AIResponse> {
  try {
    await logger.info('OpenAI fast AI generation >>>>>>>>>>>>  ', {
      provider: 'user',
      content: prompt
    })

    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt('OPENAI' as any, 'WEBSITE_GENERATION' as any)

    await logger.info('OpenAI fast AI generation >>>>>>>>>>>>  ', {
      provider: 'system',
      content: systemPrompt
    })

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Very low for fastest response
      max_tokens: 4000, // Minimal tokens for speed
      stream: false,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) throw new Error('No response from OpenAI')

    // Fastest JSON parsing
    let jsonContent = response.trim()
    if (jsonContent.includes('```')) {
      const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (match) jsonContent = match[1].trim()
    }

    const parsedResponse = JSON.parse(jsonContent)
    const files = Array.isArray(parsedResponse.files) ? parsedResponse.files : []
    
    await logger.info('OpenAI fast generation completed', {
      provider: 'openai',
      filesGenerated: files.length,
      tokensUsed: completion.usage?.total_tokens || 0
    })
    
    return {
      content: parsedResponse.description || 'Website generated',
      files: files.map((file: any) => ({
        path: file.path || 'index.html',
        content: file.content || '',
        type: file.type || 'HTML',
        size: file.content ? file.content.length : 0
      })),
      metadata: {
        model: completion.model,
        tokens: completion.usage?.total_tokens || 0,
        provider: 'openai'
      }
    }
  } catch (error) {
    console.error('OpenAI Fast API Error:', error)
    throw new Error(`OpenAI fast generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Website modification function using OpenAI
export async function modifyWebsiteWithOpenAI(
  prompt: string, 
  currentFiles: CurrentFile[]
): Promise<AIResponse> {
  try {
    await logger.info('Starting OpenAI website modification', {
      provider: 'openai',
      promptLength: prompt.length,
      currentFilesCount: currentFiles.length
    })

    // Create context from current files
    const currentFilesContext = currentFiles.map(file => 
      `File: ${file.path}\nType: ${file.type}\nContent:\n${file.content}\n---\n`
    ).join('\n')

    // Fetch dynamic prompt from database
    const baseSystemPrompt = await getSystemPrompt('OPENAI' as any, 'WEBSITE_MODIFICATION' as any)
    
    // Replace placeholders in the prompt
    const systemPrompt = baseSystemPrompt
      .replace('{currentFiles}', currentFilesContext)
      .replace('{prompt}', prompt)

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 6000,
      stream: false,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Fast JSON extraction and parsing
    let jsonContent = response.trim()
    
    // Quick check for markdown code blocks and extract JSON
    if (jsonContent.includes('```')) {
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }
    }

    // Parse JSON with error handling
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const fallbackMatch = response.match(/\{[\s\S]*\}/)
      if (fallbackMatch) {
        try {
          parsedResponse = JSON.parse(fallbackMatch[0])
        } catch {
          throw new Error('Invalid JSON response from OpenAI API')
        }
      } else {
        throw new Error('Invalid JSON response from OpenAI API')
      }
    }

    // Fast validation and processing
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from OpenAI API')
    }
    
    // Optimized file processing
    const files = Array.isArray(parsedResponse.files) ? parsedResponse.files : []
    const processedFiles = files.map((file: any) => ({
      path: file.path || 'index.html',
      content: file.content || '',
      type: file.type || getFileTypeFromPath(file.path || 'index.html'),
      size: file.content ? file.content.length : 0
    }))

    await logger.info('OpenAI website modification completed', {
      provider: 'openai',
      filesGenerated: processedFiles.length,
      tokensUsed: completion.usage?.total_tokens || 0
    })

    return {
      content: parsedResponse.content || parsedResponse.description || 'Website modified successfully',
      files: processedFiles,
      metadata: {
        model: completion.model,
        tokens: completion.usage?.total_tokens || 0,
        provider: 'openai'
      }
    }
  } catch (error) {
    await logger.error('OpenAI modification error', error as Error, {
      provider: 'openai'
    })
    console.error('OpenAI Modification API Error:', error)
    throw new Error(`OpenAI modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Generate project title using OpenAI
export async function generateTitleWithOpenAI(prompt: string): Promise<string> {
  try {
    const systemPrompt = `You are an expert at creating concise, descriptive project titles. 
    
Based on the user's prompt, generate a short, professional project title that captures the essence of what they want to build.

Requirements:
- Keep it under 50 characters
- Use title case (Capitalize Each Word)
- Be descriptive but concise
- Use hyphens instead of spaces
- Focus on the main purpose or theme
- Examples: "E-Commerce-Store", "Portfolio-Website", "Blog-Platform", "Restaurant-Menu"

Return ONLY the title, no additional text or formatting.`

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 50,
    })

    const title = completion.choices[0]?.message?.content?.trim()
    if (!title) {
      throw new Error('No title generated from OpenAI')
    }

    // Clean up the title
    return title
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length

  } catch (error) {
    await logger.error('OpenAI title generation failed', error as Error, {
      promptLength: prompt.length
    })
    throw error
  }
}