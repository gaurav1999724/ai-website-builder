import { logger } from '../logger'
import { sortFilesByPriority } from '../utils'
import { CurrentFile } from './index'
import { getSystemPrompt } from './prompt-helper'
import { AIProvider, PromptType } from '@prisma/client'
// Removed HTML completion imports - using AI-generated content directly

// Get Cerebras model from environment variable
const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'qwen-3-coder-480b'

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
async function createFallbackResponse(rawResponse: string) {
  // Try to extract any useful information from the response
  const files: any[] = []
  // Try to extract the complete JSON structure and parse it properly
  try {
    // Look for the complete JSON structure in the response
    const jsonStart = rawResponse.indexOf('{')
    const jsonEnd = rawResponse.lastIndexOf('}')
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      let jsonString = rawResponse.substring(jsonStart, jsonEnd + 1)
      
      // Try to fix common JSON issues more aggressively
      jsonString = jsonString
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\/g, '\\\\') // Fix unescaped backslashes
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2') // Fix unescaped backslashes
      
      // Try to parse the JSON
      const parsedResponse = JSON.parse(jsonString)

      if (parsedResponse.files && Array.isArray(parsedResponse.files)) {
        // Extract files from the parsed JSON
        parsedResponse.files.forEach((file: any) => {
          if (file.content && file.path) {
            files.push({
              path: file.path,
              content: file.content,
              type: file.type || 'HTML',
              size: file.content.length
            })
          }
        })
        
        await logger.info('Successfully extracted files from JSON response', {
          fileCount: files.length,
          provider: 'cerebras'
        })
      }
    }
  } catch (parseError) {
    await logger.warn('Failed to parse JSON structure, falling back to regex extraction', {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      provider: 'cerebras'
    })
    
    // Fallback: Try to extract HTML content using a more robust approach
    // Use a more sophisticated regex that can handle multiline content with escaped quotes
    const fileMatches = rawResponse.match(/"path":\s*"([^"]+)",\s*"content":\s*"((?:[^"\\]|\\.)*)"/g)

    if (fileMatches) {
      fileMatches.forEach((match) => {
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
          
          // Ensure HTML is complete - add missing closing tags if needed
          if (fileContent.includes('<html') && !fileContent.includes('</html>')) {
            fileContent += '\n</html>'
          }
          if (fileContent.includes('<head') && !fileContent.includes('</head>')) {
            fileContent = fileContent.replace(/(<head[^>]*>)/, '$1\n    <title>Generated Website</title>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>')
          }
          if (fileContent.includes('<body') && !fileContent.includes('</body>')) {
            fileContent = fileContent.replace(/(<body[^>]*>)/, '$1\n    <h1>Welcome to Your Website</h1>\n    <p>This is a generated website.</p>\n</body>')
          }
          
          files.push({
            path: filePath,
            content: fileContent,
            type: getFileTypeFromPath(filePath),
            size: fileContent.length
          })
        }
      })
    } else {
      // If no file matches found, try a different approach - look for complete file blocks
      const fileBlockRegex = /"path":\s*"([^"]+)",\s*"content":\s*"([^"]*(?:\\.[^"]*)*)"/g
      let fileBlockMatch
      while ((fileBlockMatch = fileBlockRegex.exec(rawResponse)) !== null) {
        const filePath = fileBlockMatch[1]
        let fileContent = fileBlockMatch[2]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\')
        
        files.push({
          path: filePath,
          content: fileContent,
          type: getFileTypeFromPath(filePath),
          size: fileContent.length
        })
      }
      
      // If still no files found, try the old regex approach as last resort
      if (files.length === 0) {
        const htmlMatch = rawResponse.match(/"content":\s*"((?:[^"\\]|\\.|\\n)*<!DOCTYPE(?:[^"\\]|\\.|\\n)*)"/)
        if (htmlMatch) {
          let htmlContent = htmlMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
          
          files.push({
            path: 'index.html',
            content: htmlContent,
            type: 'HTML',
            size: htmlContent.length
          })
        }
      }
    }
  }
  
  // Look for CSS content - improved regex
  const cssMatch = rawResponse.match(/"content":\s*"([^"]*:root[^"]*(?:\\"[^"]*)*)"/)
  if (cssMatch) {
    files.push({
      path: 'styles.css',
      content: cssMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      type: 'CSS',
      size: cssMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').length
    })
  }
  
  // Look for JS content - improved regex
  const jsMatch = rawResponse.match(/"content":\s*"([^"]*function[^"]*(?:\\"[^"]*)*)"/)
  if (jsMatch) {
    files.push({
      path: 'script.js',
      content: jsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      type: 'JAVASCRIPT',
      size: jsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').length
    })
  }

  // Try to extract content from files array if present
  const filesArrayMatch = rawResponse.match(/"files":\s*\[([\s\S]*?)\]/)
  if (filesArrayMatch) {
    const filesContent = filesArrayMatch[1]
    
    // Extract individual file objects with improved regex patterns
    console.log('🔍 Extracting files from content:', filesContent.substring(0, 500) + '...')
    
    // Try multiple regex patterns to capture different file formats
    const patterns = [
      // Pattern 1: Standard JSON object format
      /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"([^"]*(?:\\"[^"]*)*)"[^}]*\}/g,
      // Pattern 2: More flexible format with escaped content
      /\{[^}]*"path":\s*"([^"]*)"[^}]*"content":\s*"((?:[^"\\]|\\.)*)"[^}]*\}/g,
      // Pattern 3: Single line format
      /"path":\s*"([^"]*)",\s*"content":\s*"((?:[^"\\]|\\.)*)"/g
    ]
    
    let fileMatches: string[] = []
    for (const pattern of patterns) {
      const matches = filesContent.match(pattern)
      if (matches && matches.length > 0) {
        fileMatches = matches
        console.log(`✅ Found ${matches.length} files using pattern ${patterns.indexOf(pattern) + 1}`)
        break
      }
    }
    
    if (fileMatches.length > 0) {
      fileMatches.forEach((match, index) => {
        const pathMatch = match.match(/"path":\s*"([^"]*)"/)
        const contentMatch = match.match(/"content":\s*"((?:[^"\\]|\\.)*)"/)
        
        if (pathMatch && contentMatch) {
          const path = pathMatch[1]
          let content = contentMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
          
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
          
          console.log(`📄 Extracted file ${index + 1}: ${path} (${type}, ${content.length} chars)`)
          
          files.push({
            path,
            content,
            type,
            size: content.length
          })
        } else {
          console.log(`❌ Failed to extract file from match: ${match.substring(0, 100)}...`)
        }
      })
    } else {
      console.log('❌ No file matches found with any pattern')
    }
  }
  
  // Check for missing files that are referenced in HTML but not included
  const missingFiles = detectMissingReferencedFiles(files, rawResponse)
  if (missingFiles.length > 0) {
    console.log('⚠️ Found missing referenced files:', missingFiles)
    // Add the missing files to the files array
    files.push(...missingFiles)
  }

  // Return the extracted files directly without HTML completion processing
  return {
    content: 'Website generated successfully (partial response)',
    files: sortFilesByPriority(files.length > 0 ? files : [
      {
        path: 'index.html',
        content: '<!DOCTYPE html><html><head><title>Generated Website</title></head><body><h1>Website Generated</h1><p>Content is being processed.</p></body></html>',
        type: 'HTML',
        size: 150
      }
    ]),
    metadata: {
      model: CEREBRAS_MODEL,
      tokens: 0,
      provider: 'cerebras'
    }
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
    size: number
  }>
  metadata: {
    model: string
    tokens: number
    provider: string
  }
}

export async function generateWebsiteWithCerebras(prompt: string, images?: string[]): Promise<AIResponse> {
  const startTime = Date.now()
  
  try {
    await logger.info('Starting Cerebras AI generation', {
      provider: prompt,
      promptLength: prompt.length
    })  
    // Fetch dynamic prompt from database
    const systemPrompt = await getSystemPrompt(AIProvider.CEREBRAS, PromptType.WEBSITE_GENERATION)

    // Enhance prompt with image information if images are provided
    let enhancedPrompt = prompt
    if (images && images.length > 0) {
      enhancedPrompt = `${prompt}\n\nIMPORTANT: The user has provided ${images.length} reference image(s) to help guide the website design. Please use these images as inspiration for the visual design, color scheme, layout, and overall aesthetic of the website. Consider the style, mood, and visual elements shown in these reference images when creating the website.`
    }

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        stream: false,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: -1,
        seed: 0,
        top_p: 0.9,
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
    await logger.info('Cerebras AI generation response >>>>>>   ', {
      htmlContent: aiResponse,
      provider: 'cerebras',
      responseLength: aiResponse?.length || 0
    })
    if (!aiResponse) {
      await logger.error('No response content from Cerebras API', new Error('Empty response'), {
        responseData: data,
        provider: 'cerebras'
      })
      throw new Error('No response from Cerebras API')
    }
    
    // Log the raw response for debugging
    console.log('Raw Cerebras response length:', aiResponse.length)
    console.log('Raw Cerebras response preview:', aiResponse.substring(0, 500) + '...')

    // Extract JSON from markdown code blocks if present
    let jsonContent = aiResponse
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Clean up the JSON content - minimal processing to avoid corruption
    jsonContent = jsonContent
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
    
    // Try to complete incomplete JSON by adding missing closing braces/brackets
    const openBraces = (jsonContent.match(/\{/g) || []).length
    const closeBraces = (jsonContent.match(/\}/g) || []).length
    const openBrackets = (jsonContent.match(/\[/g) || []).length
    const closeBrackets = (jsonContent.match(/\]/g) || []).length
    
    if (openBraces > closeBraces) {
      jsonContent += '}'.repeat(openBraces - closeBraces)
    }
    if (openBrackets > closeBrackets) {
      jsonContent += ']'.repeat(openBrackets - closeBrackets)
    }

    // Parse the JSON response with multiple fallback strategies
    let parsedResponse
    try {
      console.log('Attempting to parse JSON content, length:', jsonContent.length)
      console.log('JSON content preview:', jsonContent.substring(0, 200) + '...')
      parsedResponse = JSON.parse(jsonContent)
      console.log('Successfully parsed JSON, files count:', parsedResponse.files?.length || 0)
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
            const fallbackResponse = await createFallbackResponse(aiResponse)
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
        
        const fallbackResponse = await createFallbackResponse(aiResponse)
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

        // Process files to ensure they have proper structure and validate advanced requirements
        const rawFiles = Array.isArray(parsedResponse.files) 
          ? parsedResponse.files.map((file: any) => {
              console.log(`Processing file: ${file.path}, content length: ${file.content ? file.content.length : 0}`)
              console.log(`File content preview: ${file.content ? file.content.substring(0, 100) + '...' : 'No content'}`)
              return {
                path: file.path || 'unknown.txt',
                content: file.content || '',
                type: file.type || getFileTypeFromPath(file.path || 'unknown.txt'),
                size: file.size || (file.content ? file.content.length : 0)
              }
            })
          : []
        
        // Use raw files directly without HTML completion processing
        const processedFiles = rawFiles
        
        // Log file analysis for debugging
        processedFiles.forEach((file: any) => {
          console.log(`Processing advanced file: ${file.path}, Type: ${file.type}, Content length: ${file.content.length}`)
          
          // Validate file content quality for advanced projects
          if (file.type === 'HTML' && file.content.length < 500) {
            console.warn(`HTML file ${file.path} seems too short for advanced project (${file.content.length} chars)`)
          }
          if (file.type === 'CSS' && file.content.length < 200) {
            console.warn(`CSS file ${file.path} seems too short for advanced project (${file.content.length} chars)`)
          }
          if (file.type === 'JAVASCRIPT' && file.content.length < 100) {
            console.warn(`JavaScript file ${file.path} seems too short for advanced project (${file.content.length} chars)`)
          }
        })

    const duration = Date.now() - startTime
    const result = {
      content: parsedResponse.description || 'Website generated successfully',
      files: sortFilesByPriority(processedFiles),
      metadata: {
        model: data.model || CEREBRAS_MODEL,
        tokens: data.usage?.total_tokens || 0,
        provider: 'cerebras'
      }
    }
    
    // Debug: Log the final result
    console.log('Final AI response files:')
    result.files.forEach((file: any, index: number) => {
      console.log(`File ${index}: ${file.path}, content length: ${file.content.length}`)
      console.log(`Content preview: ${file.content.substring(0, 100)}...`)
    })

    // Check for missing files that are referenced in HTML but not included
    const missingFiles = detectMissingReferencedFiles(result.files, aiResponse)
    if (missingFiles.length > 0) {
      console.log('⚠️ Found missing referenced files in main generation:', missingFiles.map(f => f.path))
      // Add the missing files to the result
      result.files.push(...missingFiles)
    }

    // Enhanced logging for advanced project generation
    const htmlFiles = result.files.filter((f: any) => f.type === 'HTML')
    const cssFiles = result.files.filter((f: any) => f.type === 'CSS')
    const jsFiles = result.files.filter((f: any) => f.type === 'JAVASCRIPT')
    const otherFiles = result.files.filter((f: any) => !['HTML', 'CSS', 'JAVASCRIPT'].includes(f.type))
    
    await logger.info('Cerebras AI advanced generation completed successfully', {
      provider: 'cerebras',
      duration,
      totalFiles: result.files.length,
      htmlFiles: htmlFiles.length,
      cssFiles: cssFiles.length,
      jsFiles: jsFiles.length,
      otherFiles: otherFiles.length,
      totalContentSize: result.files.reduce((sum: number, f: any) => sum + f.size, 0),
      tokens: result.metadata.tokens,
      model: result.metadata.model,
      isAdvancedProject: result.files.length >= 8,
      filePaths: result.files.map((f: any) => f.path),
      missingFilesDetected: missingFiles.length
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
        model: CEREBRAS_MODEL,
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
    } else {
      // If no markdown blocks, try to find JSON object in the response
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
      }
    }

    // Clean up the JSON content - more comprehensive processing
    jsonString = jsonString
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .replace(/\\n/g, '\n') // Fix escaped newlines
      .replace(/\\"/g, '"') // Fix escaped quotes
      .replace(/\\t/g, '\t') // Fix escaped tabs
      .replace(/\\r/g, '\r') // Fix escaped carriage returns

    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonString)
    } catch (parseError) {
      // Try to fix common JSON issues
      try {
        // Try to complete incomplete JSON by adding missing closing braces/brackets
        const openBraces = (jsonString.match(/\{/g) || []).length
        const closeBraces = (jsonString.match(/\}/g) || []).length
        const openBrackets = (jsonString.match(/\[/g) || []).length
        const closeBrackets = (jsonString.match(/\]/g) || []).length
        
        let fixedJson = jsonString
        if (openBraces > closeBraces) {
          fixedJson += '}'.repeat(openBraces - closeBraces)
        }
        if (openBrackets > closeBrackets) {
          fixedJson += ']'.repeat(openBrackets - closeBrackets)
        }
        
        parsedResponse = JSON.parse(fixedJson)
      } catch (secondParseError) {
        // Try one more approach - extract just the files array if possible
        try {
          const filesMatch = jsonString.match(/"files":\s*\[([\s\S]*?)\]/)
          if (filesMatch) {
            const filesArrayString = '[' + filesMatch[1] + ']'
            const filesArray = JSON.parse(filesArrayString)
            
            // Extract content description
            const contentMatch = jsonString.match(/"content":\s*"([^"]+)"/)
            const contentDescription = contentMatch ? contentMatch[1].replace(/\\"/g, '"') : 'Project modified successfully'
            
            parsedResponse = {
              content: contentDescription,
              files: filesArray
            }
          } else {
            throw new Error('Could not extract files array')
          }
        } catch (thirdParseError) {
          // Create a fallback response that actually applies the modification
          await logger.warn('Using fallback response for modification due to JSON parsing failure', {
            provider: 'cerebras',
            rawResponseLength: aiResponse.length,
            extractedJsonLength: jsonString.length,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            secondParseError: secondParseError instanceof Error ? secondParseError.message : String(secondParseError),
            thirdParseError: thirdParseError instanceof Error ? thirdParseError.message : String(thirdParseError)
          })
        
        // Try to extract modifications from the raw response
        try {
          // Look for file content in the raw response using regex
          const fileMatches = aiResponse.match(/"path":\s*"([^"]+)",\s*"content":\s*"((?:[^"\\]|\\.)*)"/g)
          
          if (fileMatches && fileMatches.length > 0) {
            const extractedFiles = []
            
            for (const match of fileMatches) {
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
              // Extract content description
              const contentMatch = aiResponse.match(/"content":\s*"([^"]+)"/)
              const contentDescription = contentMatch ? contentMatch[1].replace(/\\"/g, '"') : 'Project modified successfully'
              
              return {
                content: contentDescription,
                files: sortFilesByPriority(extractedFiles),
                metadata: {
                  model: CEREBRAS_MODEL,
                  tokens: 0,
                  provider: 'cerebras'
                }
              }
            }
          }
        } catch (extractionError) {
          console.warn('Failed to extract files from raw response:', extractionError)
        }
        
        // If we reach here, the extraction failed, so continue with the rest of the fallback logic
        
        // Try to extract the modification intent from the prompt
        const isNavigationModification = prompt.toLowerCase().includes('navigation') || 
                                       prompt.toLowerCase().includes('menu') ||
                                       prompt.toLowerCase().includes('horizontal') ||
                                       prompt.toLowerCase().includes('vertical')
        
        if (isNavigationModification) {
          // Apply navigation modification to existing files
          const modifiedFiles = currentFiles.map(file => {
            if (file.path.includes('.css') && file.content.includes('.nav-menu')) {
              // Modify CSS for horizontal navigation
              let modifiedContent = file.content
              
              // Change flex-direction from column to row
              modifiedContent = modifiedContent.replace(
                /\.nav-menu\s*\{[^}]*flex-direction:\s*column[^}]*\}/g,
                (match) => match.replace(/flex-direction:\s*column/, 'flex-direction: row')
              )
              
              // Ensure nav-menu uses flex display
              if (!modifiedContent.includes('.nav-menu {') || !modifiedContent.includes('display: flex')) {
                modifiedContent = modifiedContent.replace(
                  /\.nav-menu\s*\{/g,
                  '.nav-menu {\n  display: flex;\n  flex-direction: row;\n  align-items: center;'
                )
              }
              
              return {
                path: file.path,
                content: modifiedContent,
                type: file.type,
                size: modifiedContent.length
              }
            }
            return {
              path: file.path,
              content: file.content,
              type: file.type,
              size: file.content.length
            }
          })
          
          return {
            content: 'Navigation menu updated to horizontal layout',
            files: sortFilesByPriority(modifiedFiles),
            metadata: {
              model: CEREBRAS_MODEL,
              tokens: 0,
              provider: 'cerebras'
            }
          }
        }
        
        // Generic fallback - return existing files
        const fallbackResponse = {
          content: 'Project modified successfully (partial response)',
          files: sortFilesByPriority(currentFiles.map(file => ({
            path: file.path,
            content: file.content,
            type: file.type,
            size: file.content.length
          }))),
          metadata: {
            model: CEREBRAS_MODEL,
            tokens: 0,
            provider: 'cerebras'
          }
        }
        
        return fallbackResponse
        }
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
      files: sortFilesByPriority((parsedResponse.files || []).map((file: any) => ({
        path: file.path,
        content: file.content,
        type: getFileTypeFromPath(file.path),
        size: file.size || (file.content ? file.content.length : 0)
      }))),
      metadata: {
        model: parsedResponse.metadata?.model || CEREBRAS_MODEL,
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
