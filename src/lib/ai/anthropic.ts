import Anthropic from '@anthropic-ai/sdk'

// Lazy initialization to avoid build-time errors
let anthropic: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropic
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

export async function generateWebsiteWithAnthropic(prompt: string, images?: string[]): Promise<AIResponse> {
  try {
    const systemPrompt = `You are an expert web developer. Generate a complete website based on the user's prompt. 

IMPORTANT: Return ONLY a valid JSON object. Do not wrap it in markdown code blocks or add any other text.

Return your response as a JSON object with this exact structure:
{
  "files": [
    {
      "path": "index.html",
      "content": "HTML content here",
      "type": "html"
    },
    {
      "path": "styles.css", 
      "content": "CSS content here",
      "type": "css"
    },
    {
      "path": "script.js",
      "content": "JavaScript content here", 
      "type": "javascript"
    }
  ],
  "description": "Brief description of the website"
}

Requirements:
- Create a complete, functional website
- Use modern HTML5, CSS3, and JavaScript
- Make it responsive and mobile-friendly
- Include proper semantic HTML
- Use modern CSS features like Flexbox/Grid
- Add interactive elements with JavaScript
- Ensure all code is clean and well-commented
- Create at least 3-5 files for a complete project
- Include a package.json if using any dependencies
- Return ONLY valid JSON, no markdown formatting

Focus on creating a professional, modern website that matches the user's requirements.`

    const message = await getAnthropic().messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt }
      ]
    })

    const response = message.content[0]
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    // Extract JSON from markdown code blocks if present
    let jsonContent = response.text
    const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', parseError)
      console.error('Raw response:', response.text)
      console.error('Extracted JSON:', jsonContent)
      throw new Error('Invalid JSON response from Anthropic API')
    }

    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Anthropic API')
    }
    
    return {
      content: parsedResponse.description || 'Website generated successfully',
      files: Array.isArray(parsedResponse.files) 
        ? parsedResponse.files.map((file: any) => ({
            path: file.path || 'unknown.txt',
            content: file.content || '',
            type: file.type || 'OTHER',
            size: file.size || (file.content ? file.content.length : 0)
          }))
        : [],
      metadata: {
        model: message.model,
        tokens: message.usage.input_tokens + message.usage.output_tokens,
        provider: 'anthropic'
      }
    }
  } catch (error) {
    console.error('Anthropic API Error:', error)
    throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
