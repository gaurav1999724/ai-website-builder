import { logger } from '../logger'
import { CurrentFile } from './index'
import { getSystemPrompt } from './prompt-helper'
import { AIProvider, PromptType } from '@prisma/client'

// Helper function to fix incomplete JSON
function fixIncompleteJson(jsonString: string): string {
  // Find the last complete object by counting braces
  let braceCount = 0
  let lastCompleteIndex = -1
  
  for (let i = 0; i < jsonString.length; i++) {
    if (jsonString[i] === '{') {
      braceCount++
    } else if (jsonString[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        lastCompleteIndex = i
      }
    }
  }
  
  if (lastCompleteIndex !== -1) {
    return jsonString.substring(0, lastCompleteIndex + 1)
  }
  
  // If no complete object found, try to close the current object
  const openBraces = (jsonString.match(/\{/g) || []).length
  const closeBraces = (jsonString.match(/\}/g) || []).length
  const missingBraces = openBraces - closeBraces
  
  if (missingBraces > 0) {
    return jsonString + '}'.repeat(missingBraces)
  }
  
  return jsonString
}

// Helper function to create fallback response
function createFallbackResponse(rawResponse: string) {
  // Try to extract any useful information from the response
  const files: any[] = []
  
  // Look for HTML content - improved regex to capture more content
  const htmlMatch = rawResponse.match(/"content":\s*"([^"]*<!DOCTYPE[^"]*(?:\\"[^"]*)*)"/)
  if (htmlMatch) {
    files.push({
      path: 'index.html',
      content: htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      type: 'HTML'
    })
  }
  
  // Look for CSS content - improved regex
  const cssMatch = rawResponse.match(/"content":\s*"([^"]*:root[^"]*(?:\\"[^"]*)*)"/)
  if (cssMatch) {
    files.push({
      path: 'styles.css',
      content: cssMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      type: 'CSS'
    })
  }
  
  // Look for JS content - improved regex
  const jsMatch = rawResponse.match(/"content":\s*"([^"]*function[^"]*(?:\\"[^"]*)*)"/)
  if (jsMatch) {
    files.push({
      path: 'script.js',
      content: jsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      type: 'JAVASCRIPT'
    })
  }
  
  // Try to extract content from files array if present
  const filesArrayMatch = rawResponse.match(/"files":\s*\[([\s\S]*?)\]/)
  if (filesArrayMatch) {
    const filesContent = filesArrayMatch[1]
    
    // Extract individual file objects
    const fileMatches = filesContent.match(/\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"([^"]*(?:\\"[^"]*)*)"[^}]*\}/g)
    if (fileMatches) {
      fileMatches.forEach(match => {
        const pathMatch = match.match(/"path":\s*"([^"]*)"/)
        const contentMatch = match.match(/"content":\s*"([^"]*(?:\\"[^"]*)*)"/)
        
        if (pathMatch && contentMatch) {
          const path = pathMatch[1]
          const content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
          
          // Determine file type
          let type = 'OTHER'
          if (path.endsWith('.html') || path.endsWith('.htm')) type = 'HTML'
          else if (path.endsWith('.css')) type = 'CSS'
          else if (path.endsWith('.js')) type = 'JAVASCRIPT'
          else if (path.endsWith('.json')) type = 'JSON'
          else if (path.endsWith('.md') || path.endsWith('.markdown')) type = 'MARKDOWN'
          else if (path.endsWith('.ts') || path.endsWith('.tsx')) type = 'TYPESCRIPT'
          else if (path.endsWith('.vue')) type = 'VUE'
          else if (path.endsWith('.angular')) type = 'ANGULAR'
          else if (path.endsWith('.jsx') || path.endsWith('.react')) type = 'REACT'
          
          files.push({
            path,
            content,
            type
          })
        }
      })
    }
  }
  
  return {
    content: 'Website generated successfully (partial response)',
    files: files.length > 0 ? files : [
      {
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
        <h1>Welcome to Your Generated Website</h1>
        <p>This website was generated using AI. The response was partially received, but the basic structure has been created.</p>
        <p>You can modify this content as needed.</p>
    </div>
</body>
</html>`,
        type: 'HTML'
      }
    ],
    metadata: {
      model: 'qwen-3-coder-480b',
      tokens: 0,
      provider: 'cerebras'
    }
  }
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
    case 'vue':
      return 'VUE'
    case 'angular':
      return 'ANGULAR'
    case 'react':
      return 'REACT'
    default:
      return 'OTHER'
  }
}

export interface AIResponse {
  content: string
  files: Array<{
    path: string
    content: string
    type: string
  }>
  metadata: {
    model: string
    tokens: number
    provider: string
  }
}

export async function generateWebsiteWithCerebras(prompt: string): Promise<AIResponse> {
  const startTime = Date.now()
  
  try {
    await logger.info('Starting Cerebras AI generation', {
      provider: prompt,
      promptLength: prompt.length
    })  
    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt(AIProvider.CEREBRAS, PromptType.WEBSITE_GENERATION)

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-3-coder-480b',
        stream: false,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: -1,
        seed: 0,
        top_p: 1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      await logger.error('Cerebras API request failed', new Error(`HTTP ${response.status}: ${response.statusText}`), {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText,
        provider: 'cerebras'
      })
      throw new Error(`Cerebras API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      await logger.error('No response content from Cerebras API', new Error('Empty response'), {
        responseData: data,
        provider: 'cerebras'
      })
      throw new Error('No response from Cerebras API')
    }

    // Extract JSON from markdown code blocks if present
    let jsonContent = aiResponse
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Clean up the JSON content - remove any tree structure artifacts
    jsonContent = jsonContent
      .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*?$/, '$1') // Extract JSON object
      .replace(/\\n├──[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n│[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n└──[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n[^\{\}]*$/g, '') // Remove trailing non-JSON content
      .replace(/^[^\{\}]*\\n/g, '') // Remove leading non-JSON content

    // Parse the JSON response with multiple fallback strategies
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      // Strategy 1: Try to find and extract a valid JSON object from the response
      const jsonStart = jsonContent.indexOf('{')
      const jsonEnd = jsonContent.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = jsonContent.substring(jsonStart, jsonEnd + 1)
        try {
          parsedResponse = JSON.parse(potentialJson)
        } catch (secondParseError) {
          // Strategy 2: Try to fix incomplete JSON by finding the last complete object
          try {
            const fixedJson = fixIncompleteJson(jsonContent)
            parsedResponse = JSON.parse(fixedJson)
          } catch (thirdParseError) {
            // Strategy 3: Create a fallback response with the available data
            await logger.warn('Using fallback response due to JSON parsing failure', {
              rawResponse: aiResponse,
              extractedJson: jsonContent,
              potentialJson,
              provider: 'cerebras'
            })
            
            // Try to extract any useful information from the response
            const fallbackResponse = createFallbackResponse(aiResponse)
            return fallbackResponse
          }
        }
      } else {
        // Strategy 4: Create a fallback response
        await logger.warn('No valid JSON found, creating fallback response', {
          rawResponse: aiResponse,
          extractedJson: jsonContent,
          provider: 'cerebras'
        })
        
        const fallbackResponse = createFallbackResponse(aiResponse)
        return fallbackResponse
      }
    }
    
    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Cerebras API')
    }

    if (!Array.isArray(parsedResponse.files)) {
      await logger.warn('No files array in Cerebras response, using empty array', {
        parsedResponse,
        provider: 'cerebras'
      })
    }

        // Process files to ensure they have proper structure
        const processedFiles = Array.isArray(parsedResponse.files) 
          ? parsedResponse.files.map((file: any) => {
              const processedFile = {
                path: file.path || 'unknown.txt',
                content: file.content || '',
                type: file.type || getFileTypeFromPath(file.path || 'unknown.txt')
              }
              console.log(`Processing file: ${processedFile.path}, Content length: ${processedFile.content.length}`)
              return processedFile
            })
          : []

    const duration = Date.now() - startTime
    const result = {
      content: parsedResponse.description || 'Website generated successfully',
      files: processedFiles,
      metadata: {
        model: data.model || 'qwen-3-coder-480b',
        tokens: data.usage?.total_tokens || 0,
        provider: 'cerebras'
      }
    }

    await logger.info('Cerebras AI generation completed successfully', {
      provider: 'cerebras',
      duration,
      fileCount: result.files.length,
      tokens: result.metadata.tokens,
      model: result.metadata.model
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error('Cerebras AI generation failed', error as Error, {
      provider: 'cerebras',
      duration,
      promptLength: prompt.length
    })
    throw new Error(`Cerebras generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateWebsiteModificationWithCerebras(
  prompt: string,
  currentFiles: CurrentFile[] = []
): Promise<AIResponse> {
  const startTime = Date.now()
  
  try {
    await logger.info('Starting Cerebras AI modification', {
      provider: 'cerebras',
      promptLength: prompt.length,
      currentFileCount: currentFiles.length
    })

    const apiKey = process.env.CEREBRAS_API_KEY
    if (!apiKey) {
      throw new Error('Cerebras API key not configured')
    }

    // Create context from current files
    const currentFilesContext = currentFiles.map(file => 
      `File: ${file.path}\nType: ${file.type}\nContent:\n${file.content}\n---\n`
    ).join('\n')

    // Fetch dynamic prompt from database
    const baseSystemPrompt = await getSystemPrompt(AIProvider.CEREBRAS, PromptType.WEBSITE_MODIFICATION)
    
    // Replace placeholders in the prompt
    const systemPrompt = baseSystemPrompt
      .replace('{currentFiles}', currentFilesContext)
      .replace('{prompt}', prompt)

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-3-coder-480b',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,
        temperature: 0.1,
        top_p: 0.9,
        stream: false
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      await logger.error('Cerebras API request failed', new Error(`HTTP ${response.status}: ${errorText}`), {
        provider: 'cerebras',
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Cerebras API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    const aiResponse = data.choices[0]?.message?.content
    console.log('Cerebras AI modification response:', aiResponse)
    if (!aiResponse) {
      throw new Error('No response content from Cerebras API')
    }

    // Extract JSON from markdown code blocks if present
    let jsonString = aiResponse
    const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      jsonString = jsonMatch[1]
    }

    // Clean up the JSON content - remove any tree structure artifacts
    jsonString = jsonString
      .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*?$/, '$1') // Extract JSON object
      .replace(/\\n├──[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n│[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n└──[^\n]*/g, '') // Remove tree structure lines
      .replace(/\\n[^\{\}]*$/g, '') // Remove trailing non-JSON content
      .replace(/^[^\{\}]*\\n/g, '') // Remove leading non-JSON content

    // If no markdown blocks, try to find JSON object in the response
    if (!jsonMatch) {
      const jsonStart = jsonString.indexOf('{')
      if (jsonStart !== -1) {
        jsonString = jsonString.substring(jsonStart)
        // Try to find the end of the JSON object
        let braceCount = 0
        let jsonEnd = -1
        for (let i = 0; i < jsonString.length; i++) {
          if (jsonString[i] === '{') braceCount++
          if (jsonString[i] === '}') braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
        if (jsonEnd !== -1) {
          jsonString = jsonString.substring(0, jsonEnd)
        }
      }
    }

    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonString)
    } catch (parseError) {
      // Strategy 1: Try to find and extract a valid JSON object from the response
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const potentialJson = jsonString.substring(jsonStart, jsonEnd + 1)
        try {
          parsedResponse = JSON.parse(potentialJson)
        } catch (secondParseError) {
          // Strategy 2: Try to fix incomplete JSON
          try {
            const fixedJson = fixIncompleteJson(jsonString)
            parsedResponse = JSON.parse(fixedJson)
          } catch (thirdParseError) {
            // Strategy 3: Create a fallback response
            await logger.warn('Using fallback response for modification due to JSON parsing failure', {
              provider: 'cerebras',
              rawResponse: aiResponse,
              extractedJson: jsonString,
              potentialJson
            })
            
            const fallbackResponse = {
              content: 'Project modified successfully (partial response)',
              files: currentFiles, // Keep existing files if modification fails
              metadata: {
                model: 'qwen-3-coder-480b',
                tokens: 0,
                provider: 'cerebras'
              }
            }
            
            return fallbackResponse
          }
        }
      } else {
        // Strategy 4: Create a fallback response
        await logger.warn('No valid JSON found for modification, creating fallback response', {
          provider: 'cerebras',
          rawResponse: aiResponse,
          extractedJson: jsonString
        })
        
        const fallbackResponse = {
          content: 'Project modified successfully (partial response)',
          files: currentFiles, // Keep existing files if modification fails
          metadata: {
            model: 'qwen-3-coder-480b',
            tokens: 0,
            provider: 'cerebras'
          }
        }
        
        return fallbackResponse
      }
    }

    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Cerebras API')
    }

    if (!Array.isArray(parsedResponse.files)) {
      await logger.warn('No files array in Cerebras modification response, using empty array', {
        parsedResponse,
        provider: 'cerebras'
      })
    }

    const result: AIResponse = {
      content: parsedResponse.content || 'Project modified successfully',
      files: (parsedResponse.files || []).map((file: any) => ({
        path: file.path,
        content: file.content,
        type: getFileTypeFromPath(file.path)
      })),
      metadata: {
        model: parsedResponse.metadata?.model || 'qwen-3-coder-480b',
        tokens: parsedResponse.metadata?.tokens || 0,
        provider: 'cerebras'
      }
    }

    const duration = Date.now() - startTime

    await logger.info('Cerebras AI modification completed successfully', {
      provider: 'cerebras',
      duration,
      fileCount: result.files.length,
      tokens: result.metadata.tokens,
      model: result.metadata.model
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    await logger.error('Cerebras AI modification failed', error as Error, {
      provider: 'cerebras',
      duration,
      promptLength: prompt.length,
      currentFileCount: currentFiles.length
    })
    throw new Error(`Cerebras modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
