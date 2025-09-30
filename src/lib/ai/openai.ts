import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout
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
    // Optimized system prompt for faster response
    const systemPrompt = `Generate a complete website. Return ONLY valid JSON:

{
  "files": [
    {"path": "index.html", "content": "HTML", "type": "HTML"},
    {"path": "style.css", "content": "CSS", "type": "CSS"},
    {"path": "script.js", "content": "JS", "type": "JAVASCRIPT"}
  ],
  "description": "Brief description"
}

Requirements: Modern HTML5/CSS3/JS, responsive, semantic HTML, clean code. 3-5 files minimum.`

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini-2024-07-18", // Fastest model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // Lower temperature for faster, more consistent responses
      max_tokens: 6000, // Reduced for faster response
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
    // Ultra-minimal prompt for maximum speed
    const systemPrompt = `Generate website. Return JSON only:
{"files":[{"path":"index.html","content":"HTML","type":"HTML"},{"path":"style.css","content":"CSS","type":"CSS"}],"description":"Website"}`

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
