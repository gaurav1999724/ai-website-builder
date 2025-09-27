import { generateWebsiteWithOpenAI } from './openai'
import { generateWebsiteWithAnthropic } from './anthropic'
import { generateWebsiteWithGemini } from './gemini'
import { generateWebsiteWithCerebras, generateWebsiteModificationWithCerebras } from './cerebras'
import { generateWebsiteModificationWithGemini } from './gemini'
import { logger } from '../logger'

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

export interface CurrentFile {
  path: string
  content: string
  type: string
}

export type AIProvider = 'cerebras' | 'openai' | 'anthropic' | 'gemini'

export async function generateWebsite(
  prompt: string,
  provider: AIProvider = 'cerebras',
  images?: string[]
): Promise<AIResponse> {
  const startTime = Date.now()
  
  try {
    await logger.info(`Starting AI generation with ${provider}`, {
      provider,
      promptLength: prompt.length
    })

    let result: AIResponse
    
    switch (provider) {
      case 'cerebras':
        result = await generateWebsiteWithCerebras(prompt, images)
        break
      case 'openai':
        result = await generateWebsiteWithOpenAI(prompt, images)
        break
      case 'anthropic':
        result = await generateWebsiteWithAnthropic(prompt, images)
        break
      case 'gemini':
        result = await generateWebsiteWithGemini(prompt, images)
        break
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }

    const duration = Date.now() - startTime
    await logger.info(`AI generation completed successfully with >>>>>>>>>>>  ${provider}`, {
      provider,
      duration,
      htmlContent: result,
      contentLength: result.content.length,
      metadata: result.metadata
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error(`AI generation failed with ${provider}`, error as Error, {
      provider,
      promptLength: prompt.length,
      duration
    })
    throw error
  }
}

export async function generateWebsiteWithAllProviders(prompt: string): Promise<AIResponse[]> {
  const providers: AIProvider[] = ['cerebras', 'openai', 'anthropic', 'gemini']
  const results: AIResponse[] = []

  for (const provider of providers) {
    try {
      const result = await generateWebsite(prompt, provider)
      results.push(result)
    } catch (error) {
      console.error(`Failed to generate with ${provider}:`, error)
      // Continue with other providers even if one fails
    }
  }

  return results
}

export async function generateWebsiteModification(
  prompt: string,
  provider: AIProvider = 'cerebras',
  currentFiles: CurrentFile[] = []
): Promise<AIResponse> {
  const startTime = Date.now()
  
  try {
    await logger.info(`Starting AI modification with ${provider}`, {
      provider,
      promptLength: prompt.length,
      currentFileCount: currentFiles.length
    })

    let result: AIResponse
    
    switch (provider) {
      case 'cerebras':
        result = await generateWebsiteModificationWithCerebras(prompt, currentFiles)
        break
      case 'openai':
        result = await generateWebsiteModificationWithOpenAI(prompt, currentFiles)
        break
      case 'anthropic':
        result = await generateWebsiteModificationWithAnthropic(prompt, currentFiles)
        break
          case 'gemini':
            result = await generateWebsiteModificationWithGeminiLocal(prompt, currentFiles)
            break
      default:
        throw new Error(`Unsupported AI provider: ${provider}`)
    }

    const duration = Date.now() - startTime
    await logger.info(`AI modification completed successfully with ${provider}`, {
      provider,
      duration,
      fileCount: result.files.length,
      contentLength: result.content.length,
      metadata: result.metadata
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error(`AI modification failed with ${provider}`, error as Error, {
      provider,
      promptLength: prompt.length,
      currentFileCount: currentFiles.length,
      duration
    })
    throw error
  }
}

// Placeholder modification functions for other providers
async function generateWebsiteModificationWithOpenAI(prompt: string, currentFiles: CurrentFile[] = []): Promise<AIResponse> {
  // For now, fall back to regular generation
  // TODO: Implement proper modification logic
  return await generateWebsiteWithOpenAI(prompt)
}

async function generateWebsiteModificationWithAnthropic(prompt: string, currentFiles: CurrentFile[] = []): Promise<AIResponse> {
  // For now, fall back to regular generation
  // TODO: Implement proper modification logic
  return await generateWebsiteWithAnthropic(prompt)
}

async function generateWebsiteModificationWithGeminiLocal(prompt: string, currentFiles: CurrentFile[] = []): Promise<AIResponse> {
  return await generateWebsiteModificationWithGemini(prompt, currentFiles)
}
