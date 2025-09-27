import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Extract JSON from markdown code blocks if present
    let jsonContent = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      console.error('Raw response:', response)
      console.error('Extracted JSON:', jsonContent)
      throw new Error('Invalid JSON response from OpenAI API')
    }

    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from OpenAI API')
    }
    
    // Process files to ensure they have proper structure
    const processedFiles = Array.isArray(parsedResponse.files) 
      ? parsedResponse.files.map((file: any) => ({
          path: file.path || 'unknown.txt',
          content: file.content || '',
          type: file.type || getFileTypeFromPath(file.path || 'unknown.txt'),
          size: file.size || (file.content ? file.content.length : 0)
        }))
      : []

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
