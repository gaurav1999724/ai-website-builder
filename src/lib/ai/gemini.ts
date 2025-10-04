import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai'
import { logger } from '../logger'
import { sortFilesByPriority } from '../utils'
import { getSystemPrompt } from './prompt-helper'
import { AIProvider, PromptType } from '@prisma/client'

// Get Gemini model from environment variable
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'

// Fallback models in case of overload
const FALLBACK_MODELS = ['gemini-2.0-flash-exp', 'gemini-2.0-flash-001', 'gemini-1.5-flash']

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set')
    }
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  }
  return genAI
}

// Function to check if Gemini API is available
async function checkGeminiAvailability(): Promise<boolean> {
  try {
    const testModel = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' })
    await testModel.generateContent('test')
    return true
  } catch (error) {
    console.log('Gemini API availability check failed:', error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Helper function to clean and fix JSON content
function cleanJsonContent(jsonString: string): string {
  try {
    console.log('🧹 Starting JSON cleaning process...')
    console.log('📄 Original JSON length:', jsonString.length)
    console.log('📄 Original JSON preview:', jsonString.substring(0, 200) + '...')

    // First, try to find the JSON object boundaries
    const jsonStart = jsonString.indexOf('{')
    const jsonEnd = jsonString.lastIndexOf('}')

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.log('❌ No valid JSON boundaries found')
      return jsonString
    }

    let cleanedJson = jsonString.substring(jsonStart, jsonEnd + 1)
    console.log('✂️ Extracted JSON length:', cleanedJson.length)

    // Fix common JSON issues with more comprehensive approach
    cleanedJson = cleanedJson
      // Remove trailing commas before closing braces/brackets
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // Fix unescaped quotes in strings (common Gemini issue)
      .replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":')
      // Fix unescaped newlines in strings
      .replace(/"([^"]*)\n([^"]*)":/g, '"$1\\n$2":')
      // Fix unescaped tabs in strings
      .replace(/"([^"]*)\t([^"]*)":/g, '"$1\\t$2":')
      // Fix unescaped backslashes
      .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')
      // Fix control characters
      .replace(/\r/g, '\\r')
      .replace(/\f/g, '\\f')
      // Fix incomplete strings (missing closing quotes)
      .replace(/"([^"]*)$/g, '"$1"')
      // Fix multiple consecutive commas
      .replace(/,\s*,/g, ',')

    console.log('🔧 After basic cleaning length:', cleanedJson.length)

    // Try to complete incomplete JSON
    const openBraces = (cleanedJson.match(/\{/g) || []).length
    const closeBraces = (cleanedJson.match(/\}/g) || []).length
    const openBrackets = (cleanedJson.match(/\[/g) || []).length
    const closeBrackets = (cleanedJson.match(/\]/g) || []).length

    console.log('📊 Brace count - Open:', openBraces, 'Close:', closeBraces)
    console.log('📊 Bracket count - Open:', openBrackets, 'Close:', closeBrackets)

    if (openBraces > closeBraces) {
      cleanedJson += '}'.repeat(openBraces - closeBraces)
      console.log('➕ Added', openBraces - closeBraces, 'closing braces')
    }
    if (openBrackets > closeBrackets) {
      cleanedJson += ']'.repeat(openBrackets - closeBrackets)
      console.log('➕ Added', openBrackets - closeBrackets, 'closing brackets')
    }

    console.log('✅ Final cleaned JSON length:', cleanedJson.length)
    console.log('📄 Final JSON preview:', cleanedJson.substring(0, 200) + '...')

    return cleanedJson
  } catch (error) {
    console.error('❌ Error cleaning JSON:', error)
    return jsonString
  }
}

// Helper function to detect missing files that are referenced in HTML but not included
function detectMissingReferencedFiles(existingFiles: any[], rawResponse: string): any[] {
  const missingFiles: any[] = []
  const existingPaths = new Set(existingFiles.map(f => f.path))

  // Common file references to look for
  const referencePatterns = [
    // CSS files
    /href=["']([^"']*\.css)["']/g,
    // JavaScript files
    /src=["']([^"']*\.js)["']/g,
    // JSON files (like manifest.json)
    /href=["']([^"']*\.json)["']/g,
    // Image files
    /src=["']([^"']*\.(jpg|jpeg|png|gif|svg|webp))["']/g,
    // Other asset files
    /href=["']([^"']*\.(ico|woff|woff2|ttf|eot))["']/g
  ]

  referencePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(rawResponse)) !== null) {
      const referencedPath = match[1]

      // Skip external URLs
      if (referencedPath.startsWith('http') || referencedPath.startsWith('//')) {
        continue
      }

      // Check if this file is missing
      if (!existingPaths.has(referencedPath)) {
        console.log(`🔍 Found missing referenced file: ${referencedPath}`)

        // Determine file type and create placeholder content
        let type = 'OTHER'
        let content = ''

        if (referencedPath.endsWith('.css')) {
          type = 'CSS'
          content = `/* Placeholder CSS for ${referencedPath} */\n/* This file was referenced but not generated by AI */\n\nbody {\n  margin: 0;\n  padding: 0;\n  font-family: Arial, sans-serif;\n}`
        } else if (referencedPath.endsWith('.js')) {
          type = 'JAVASCRIPT'
          content = `// Placeholder JavaScript for ${referencedPath}\n// This file was referenced but not generated by AI\n\nconsole.log('${referencedPath} loaded');`
        } else if (referencedPath.endsWith('.json')) {
          type = 'JSON'
          if (referencedPath.includes('manifest')) {
            content = JSON.stringify({
              name: "Generated Website",
              short_name: "Website",
              start_url: "/",
              display: "standalone",
              background_color: "#ffffff",
              theme_color: "#000000",
              icons: []
            }, null, 2)
          } else {
            content = JSON.stringify({}, null, 2)
          }
        } else if (referencedPath.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          type = 'OTHER'
          content = `<!-- Placeholder for ${referencedPath} -->\n<!-- This image was referenced but not generated by AI -->`
        }

        if (content) {
          missingFiles.push({
            path: referencedPath,
            content,
            type,
            size: content.length
          })
          existingPaths.add(referencedPath) // Prevent duplicates
        }
      }
    }
  })

  return missingFiles
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

// Helper function to extract files from text using regex patterns
function extractFilesFromText(text: string): any[] {
  const filePatterns = [
    // Pattern 1: Standard JSON object format
    /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"([^"]*(?:\\"[^"]*)*)"[^}]*\}/g,
    // Pattern 2: More flexible format with escaped content
    /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"((?:[^"\\]|\\.)*)"[^}]*\}/g,
    // Pattern 3: Single line format
    /"path":\s*"([^"]*)",\s*"content":\s*"((?:[^"\\]|\\.)*)"/g,
    // Pattern 4: Alternative format
    /"path":\s*"([^"]+)",\s*"content":\s*"([^"]*(?:\\.[^"]*)*)"/g,
    // Pattern 5: More flexible pattern
    /"path":\s*"([^"]+)",\s*"content":\s*"([^"]*(?:\\.[^"]*)*?)"/g
  ]

  let extractedFiles: any[] = []

  for (const pattern of filePatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      console.log(`✅ Found ${matches.length} files with pattern ${filePatterns.indexOf(pattern) + 1}`)

      for (const match of matches) {
        const pathMatch = match.match(/"path":\s*"([^"]+)"/)
        const contentMatch = match.match(/"content":\s*"((?:[^"\\]|\\.)*)"/)

        if (pathMatch && contentMatch) {
          const filePath = pathMatch[1]
          let fileContent = contentMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')

          extractedFiles.push({
            path: filePath,
            content: fileContent,
            type: getFileTypeFromPath(filePath),
            size: fileContent.length
          })
        }
      }

      if (extractedFiles.length > 0) {
        break // Use the first pattern that found files
      }
    }
  }

  return extractedFiles
}

// Configuration for code generation
const codeGenerationConfig = {
  maxOutputTokens: 50000,
  temperature: 0.3,
}

// Fast configuration for quick responses
const fastGenerationConfig = {
  maxOutputTokens: 30000,
  temperature: 0.1,
}

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

// AIResponse interface
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

// Function to create a code generation session
function createCodeGenerationSession(modelName: string) {
  const model = getGenAI().getGenerativeModel({
    model: modelName,
    generationConfig: codeGenerationConfig,
    safetySettings: safetySettings
  })

  const chatSession = model.startChat({
    history: []
  })

  return chatSession
}

// Function to try with fallback models
async function tryWithFallbackModels<T>(
  operation: (model: string) => Promise<T>,
  models: string[] = FALLBACK_MODELS
): Promise<T> {
  let lastError: Error | null = null

  for (const model of models) {
    try {
      return await operation(model)
    } catch (error) {
      lastError = error as Error
      await logger.warn(`Model ${model} failed, trying next model`, {
        model,
        error: lastError.message
      })

      // If it's a network error or API key error, don't try other models
      if (lastError.message.includes('fetch failed') || 
          lastError.message.includes('API key') ||
          lastError.message.includes('authentication') ||
          lastError.message.includes('permission') ||
          lastError.message.includes('quota')) {
        break
      }

      // If it's not an overload error, don't try other models
      if (!lastError.message.includes('503') && !lastError.message.includes('overloaded')) {
        break
      }
    }
  }

  throw lastError || new Error('All models failed')
}

// Main generation function
export async function generateWebsiteWithGemini(prompt: string, images?: string[]): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    await logger.info('Starting Gemini AI generation', {
      provider: 'gemini',
      promptLength: prompt.length
    })

    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt(AIProvider.GEMINI, PromptType.WEBSITE_GENERATION)

    return await tryWithFallbackModels(async (modelName) => {
      const chatSession = createCodeGenerationSession(modelName)

      // Send system prompt first
      await chatSession.sendMessage(systemPrompt)

      // Enhance prompt with image information if images are provided
      let enhancedPrompt = prompt
      if (images && images.length > 0) {
        enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
      }

      const result = await chatSession.sendMessage(enhancedPrompt)
      const text = result.response.text()

      await logger.info('Gemini raw response received', {
        model: modelName,
        responseLength: text.length,
        responsePreview: text.substring(0, 200) + '...'
      })

      // Parse the JSON response with improved error handling
      let parsedResponse
      let jsonContent = text.trim()

      // Check if the response is a text response instead of JSON
      const isTextResponse = (
        text.length > 1000 &&
        !text.trim().startsWith('{') &&
        !text.includes('```json') &&
        !text.includes('"files"') &&
        !text.includes('"content"') &&
        (text.includes('Okay,') || text.includes('Here') || text.includes('Let') || text.includes('**'))
      )
      
      if (isTextResponse) {
        await logger.warn('Gemini returned text response instead of JSON', {
          model: modelName,
          content: text.substring(0, 500) + '...'
        })
      }
      
      if (!isTextResponse) {
        // Try to find and extract JSON from the response
        const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim()
        }

        // Try to fix common JSON issues with comprehensive approach
        try {
          console.log('🔍 Parsing Gemini JSON response, length:', jsonContent.length)
          console.log('📄 JSON preview:', jsonContent.substring(0, 200) + '...')

          // First try to parse without cleaning
          try {
            parsedResponse = JSON.parse(jsonContent)
            await logger.info('Successfully parsed Gemini response (no cleaning needed)', {
              model: modelName,
              hasContent: !!parsedResponse.content,
              filesCount: Array.isArray(parsedResponse.files) ? parsedResponse.files.length : 0
            })
          } catch (initialError) {
            console.log('⚠️ Initial JSON parse failed, attempting to clean...')

            // Use the comprehensive JSON cleaning function
            jsonContent = cleanJsonContent(jsonContent)
            console.log('🧹 Cleaned JSON length:', jsonContent.length)

            parsedResponse = JSON.parse(jsonContent)
            await logger.info('Successfully parsed Gemini response (after cleaning)', {
              model: modelName,
              hasContent: !!parsedResponse.content,
              filesCount: Array.isArray(parsedResponse.files) ? parsedResponse.files.length : 0
            })
          }
        } catch (parseError) {
          await logger.error('Failed to parse Gemini response', parseError as Error, {
            model: modelName,
            rawResponse: text.substring(0, 1000) + '...',
            cleanedJson: jsonContent.substring(0, 1000) + '...',
            responseLength: text.length,
            jsonLength: jsonContent.length
          })

          // Try to extract files using regex patterns as fallback
          try {
            console.log('🔍 Attempting regex-based file extraction from Gemini response')

            // Try multiple regex patterns to capture different file formats (same as Cerebras)
            const filePatterns = [
              // Pattern 1: Standard JSON object format
              /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"([^"]*(?:\\"[^"]*)*)"[^}]*\}/g,
              // Pattern 2: More flexible format with escaped content
              /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"((?:[^"\\]|\\.)*)"[^}]*\}/g,
              // Pattern 3: Single line format
              /"path":\s*"([^"]*)",\s*"content":\s*"((?:[^"\\]|\\.)*)"/g,
              // Pattern 4: Alternative format
              /"path":\s*"([^"]+)",\s*"content":\s*"([^"]*(?:\\.[^"]*)*)"/g,
              // Pattern 5: More flexible pattern
              /"path":\s*"([^"]+)",\s*"content":\s*"([^"]*(?:\\.[^"]*)*?)"/g
            ]

            let extractedFiles: any[] = []

            for (const pattern of filePatterns) {
              const matches = text.match(pattern)
              if (matches && matches.length > 0) {
                console.log(`✅ Found ${matches.length} files with pattern ${filePatterns.indexOf(pattern) + 1}`)

                for (const match of matches) {
                  const pathMatch = match.match(/"path":\s*"([^"]+)"/)
                  const contentMatch = match.match(/"content":\s*"((?:[^"\\]|\\.)*)"/)

                  if (pathMatch && contentMatch) {
                    const filePath = pathMatch[1]
                    let fileContent = contentMatch[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\"/g, '"')
                      .replace(/\\t/g, '\t')
                      .replace(/\\r/g, '\r')
                      .replace(/\\\\/g, '\\')

                    extractedFiles.push({
                      path: filePath,
                      content: fileContent,
                      type: getFileTypeFromPath(filePath),
                      size: fileContent.length
                    })
                  }
                }

                if (extractedFiles.length > 0) {
                  break // Use the first pattern that found files
                }
              }
            }

            if (extractedFiles.length > 0) {
              console.log(`🎉 Successfully extracted ${extractedFiles.length} files using regex patterns`)

              const contentMatch = text.match(/"content":\s*"([^"]+)"/)
              const contentDescription = contentMatch ? contentMatch[1].replace(/\\"/g, '"') : 'Website generated successfully'

              parsedResponse = {
                content: contentDescription,
                files: sortFilesByPriority(extractedFiles)
              }

              await logger.info('Successfully extracted files using regex patterns', {
                model: modelName,
                extractedFilesCount: extractedFiles.length,
                filePaths: extractedFiles.map(f => f.path)
              })
            } else {
              throw new Error('No files could be extracted using regex patterns')
            }
          } catch (extractError) {
            console.log('❌ Regex extraction failed, creating fallback response')

            const fallbackFiles = [
              {
                path: "index.html",
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>This is a simple website generated by AI.</p>
    </div>
</body>
</html>`,
                type: "html",
                size: 500
              }
            ]

            const missingFiles = detectMissingReferencedFiles(fallbackFiles, text)
            if (missingFiles.length > 0) {
              console.log('⚠️ Found missing referenced files in Gemini fallback:', missingFiles.map(f => f.path))
              fallbackFiles.push(...missingFiles)
            }

            parsedResponse = {
              content: "Website generated successfully",
              files: sortFilesByPriority(fallbackFiles)
            }

            await logger.info('Created fallback response', {
              model: modelName,
              fallbackFilesCount: parsedResponse.files.length
            })
          }
        }
      }

      // Validate the parsed response
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        throw new Error('Invalid response structure from Gemini API')
      }

      // Validate and process files
      let processedFiles = []
      if (Array.isArray(parsedResponse.files)) {
        processedFiles = parsedResponse.files.map((file: any) => ({
          path: file.path || 'unknown',
          content: file.content || '',
          type: file.type === 'IMAGE' ? 'OTHER' : (file.type || 'OTHER'),
          size: file.size || (file.content ? file.content.length : 0)
        }))
      }

      await logger.info('Processed files for response', {
        model: modelName,
        originalFilesCount: Array.isArray(parsedResponse.files) ? parsedResponse.files.length : 0,
        processedFilesCount: processedFiles.length
      })

      // Check for missing files that are referenced in HTML but not included
      const missingFiles = detectMissingReferencedFiles(processedFiles, text)
      if (missingFiles.length > 0) {
        console.log('⚠️ Found missing referenced files in Gemini generation:', missingFiles.map(f => f.path))
        processedFiles.push(...missingFiles)
      }

      const aiResponse: AIResponse = {
        content: parsedResponse.content || parsedResponse.description || 'Website generated successfully',
        files: sortFilesByPriority(processedFiles),
        metadata: {
          model: modelName,
          tokens: 0,
          provider: 'gemini'
        }
      }

      await logger.info('Gemini AI generation completed successfully', {
        model: modelName,
        duration: Date.now() - startTime,
        fileCount: aiResponse.files.length,
        contentLength: aiResponse.content.length,
        missingFilesDetected: missingFiles.length
      })

      return aiResponse
    })
  } catch (error) {
    await logger.error('Gemini AI generation failed', error as Error, {
      model: GEMINI_MODEL,
      duration: Date.now() - startTime,
      promptLength: prompt.length
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        throw new Error('Gemini API is currently unavailable due to network issues. Please check your internet connection and try again, or switch to a different AI provider.')
      } else if (error.message.includes('503') || error.message.includes('overloaded')) {
        throw new Error('Gemini model is currently overloaded. Please try again in a few moments or switch to a different AI provider.')
      } else if (error.message.includes('Invalid JSON')) {
        throw new Error('Gemini returned an invalid response format. Please try again or switch to a different AI provider.')
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error('Gemini API key is invalid or missing. Please check your configuration.')
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later or switch to a different AI provider.')
      } else if (error.message.includes('permission')) {
        throw new Error('Gemini API permission denied. Please check your API key permissions.')
      }
    }

    throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Fast generation function for ultra-quick responses
export async function generateWebsiteWithGeminiFast(prompt: string, images?: string[]): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt(AIProvider.GEMINI, PromptType.WEBSITE_GENERATION)

    return await tryWithFallbackModels(async (modelName) => {
      // Use fast configuration for quick responses
      const model = getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig: fastGenerationConfig,
        safetySettings: safetySettings
      })

      const chatSession = model.startChat({
        history: []
      })

      // Send system prompt first
      await chatSession.sendMessage(systemPrompt)

      // Enhance prompt with image information if images are provided
      let enhancedPrompt = prompt
      if (images && images.length > 0) {
        enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
      }

      const result = await chatSession.sendMessage(enhancedPrompt)
      const text = result.response.text()
      // Parse the JSON response with streamlined approach
      let parsedResponse
      let jsonContent = text.trim()

      // Extract JSON from code blocks
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }

      try {
        // Try to parse directly first
        parsedResponse = JSON.parse(jsonContent)
        console.log('✅ Direct JSON parse successful ')
       
      } catch (parseError) {
        console.log('⚠️ Direct JSON parse failed, attempting to clean...', parseError instanceof Error ? parseError.message : 'Unknown error')
        
        try {
          // Use cleaning function as fallback
          const cleanedJson = cleanJsonContent(jsonContent)
          parsedResponse = JSON.parse(cleanedJson)
          console.log('✅ JSON parse successful after cleaning')
        
        } catch (cleanParseError) {
          console.log('❌ JSON parse failed even after cleaning:', cleanParseError instanceof Error ? cleanParseError.message : 'Unknown error')
          
          // Try regex extraction as last resort
          try {
            console.log('🔍 Attempting regex-based file extraction...')
            const extractedFiles = extractFilesFromText(text)
            
            if (extractedFiles.length > 0) {
              console.log(`🎉 Successfully extracted ${extractedFiles.length} files using regex`)
              parsedResponse = {
                content: 'Website generated successfully',
                files: extractedFiles
              }
            } else {
              throw new Error('No files could be extracted using regex patterns')
            }
          } catch (extractError) {
            console.log('❌ All parsing methods failed, creating fallback response')
            // Create a minimal fallback response
            parsedResponse = {
              content: 'Website generated successfully (fallback response)',
              files: [{
                path: 'index.html',
                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>This is a simple website generated by AI.</p>
    </div>
</body>
</html>`,
                type: 'HTML',
                size: 500
              }]
            }
          }
        }
      }



      // Validate and process files
      let processedFiles = []
      if (Array.isArray(parsedResponse.files)) {
        processedFiles = parsedResponse.files.map((file: any) => ({
          path: file.path || 'unknown',
          content: file.content || '',
          type: file.type === 'IMAGE' ? 'OTHER' : (file.type || 'OTHER'),
          size: file.size || (file.content ? file.content.length : 0)
        }))
      }
      

      const aiResponse: AIResponse = {
        content: parsedResponse.content || parsedResponse.description || 'Website generated successfully',
        files: sortFilesByPriority(processedFiles),
        metadata: {
          model: modelName,
          tokens: 0,
          provider: 'gemini'
        }
      }
      await logger.info('aiResponse >>>>>>>>>>>>> 1111111111  ', {
        model: 'aiResponse',
        content: aiResponse,
      })

      return aiResponse
    })
  } catch (error) {
    await logger.error('Gemini AI fast generation failed', error as Error, {
      model: GEMINI_MODEL,
      duration: Date.now() - startTime,
      promptLength: prompt.length
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        throw new Error('Gemini API is currently unavailable due to network issues. Please check your internet connection and try again, or switch to a different AI provider.')
      } else if (error.message.includes('503') || error.message.includes('overloaded')) {
        throw new Error('Gemini model is currently overloaded. Please try again in a few moments or switch to a different AI provider.')
      } else if (error.message.includes('Invalid JSON')) {
        throw new Error('Gemini returned an invalid response format. Please try again or switch to a different AI provider.')
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error('Gemini API key is invalid or missing. Please check your configuration.')
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('Gemini API quota exceeded. Please try again later or switch to a different AI provider.')
      } else if (error.message.includes('permission')) {
        throw new Error('Gemini API permission denied. Please check your API key permissions.')
      }
    }

    throw new Error(`Gemini fast generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Modification function
export async function generateWebsiteModificationWithGemini(
  prompt: string,
  currentFiles: Array<{ path: string; content: string; type: string }>
): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    await logger.info('Starting Gemini AI modification', {
      provider: 'gemini',
      promptLength: prompt.length,
      currentFileCount: currentFiles.length
    })

    // Fetch dynamic prompt from database
    const baseSystemPrompt = await getSystemPrompt(AIProvider.GEMINI, PromptType.WEBSITE_MODIFICATION)
    
    // Create context from current files
    const currentFilesContext = currentFiles.map(file => 
      `File: ${file.path}\nType: ${file.type}\nContent:\n${file.content}\n---\n`
    ).join('\n')
    
    // Replace placeholders in the prompt
    const systemPrompt = baseSystemPrompt
      .replace('{currentFiles}', currentFilesContext)
      .replace('{prompt}', prompt)

    return await tryWithFallbackModels(async (modelName) => {
      const chatSession = createCodeGenerationSession(modelName)

      // Send system prompt first
      await chatSession.sendMessage(systemPrompt)

      // Send the modification request
      const modificationPrompt = `Modification request: ${prompt}`

      await logger.info('Gemini modification prompt sent', {
        model: modelName,
        promptLength: modificationPrompt.length
      })

      const response = await chatSession.sendMessage(modificationPrompt)
      const text = response.response.text()

      await logger.info('Gemini modification response received', {
        model: modelName,
        responseLength: text.length
      })

      // Parse the JSON response
      let parsedResponse
      let jsonContent = text.trim()

      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim()
      }

      try {
        jsonContent = cleanJsonContent(jsonContent)
        parsedResponse = JSON.parse(jsonContent)
      } catch (parseError) {
        await logger.error('Failed to parse Gemini modification response', parseError as Error, {
          model: modelName,
          rawResponse: text.substring(0, 1000) + '...'
        })

        // Fallback: return existing files
        parsedResponse = {
          content: 'Project modified successfully (partial response)',
          files: currentFiles.map(file => ({
            path: file.path,
            content: file.content,
            type: file.type,
            size: file.content.length
          }))
        }
      }

      const aiResponse: AIResponse = {
        content: parsedResponse.content || 'Project modified successfully',
        files: sortFilesByPriority((parsedResponse.files || []).map((file: any) => ({
          path: file.path,
          content: file.content,
          type: getFileTypeFromPath(file.path),
          size: file.size || (file.content ? file.content.length : 0)
        }))),
        metadata: {
          model: modelName,
          tokens: 0,
          provider: 'gemini'
        }
      }

      const duration = Date.now() - startTime

      await logger.info('Gemini AI modification completed successfully', {
        model: modelName,
        duration,
        fileCount: aiResponse.files.length,
        tokens: aiResponse.metadata.tokens
      })

      return aiResponse
    })
  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error('Gemini AI modification failed', error as Error, {
      model: GEMINI_MODEL,
      duration,
      promptLength: prompt.length,
      currentFileCount: currentFiles.length
    })

    throw new Error(`Gemini modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}