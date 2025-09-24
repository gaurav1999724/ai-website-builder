import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

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

export async function generateWebsiteModificationWithGemini(
  prompt: string,
  currentFiles: Array<{
    path: string
    content: string
    type: string
  }> = []
): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Create context from current files
    const currentFilesContext = currentFiles.map(file => 
      `File: ${file.path}\nType: ${file.type}\nContent:\n${file.content}\n---\n`
    ).join('\n')

    const systemPrompt = `You are an expert web developer. The user wants to modify an existing website project. 

CURRENT PROJECT FILES:
${currentFilesContext}

MODIFICATION REQUEST: ${prompt}

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
    "model": "gemini-2.5-flash",
    "tokens": 0,
    "provider": "gemini"
  }
}

IMPORTANT RULES:
1. Only modify files that need changes based on the user's request
2. Include the complete file content for modified files
3. Do not include files that don't need changes
4. Preserve the existing structure and styling unless specifically asked to change it
5. Make minimal, targeted changes
6. Return ONLY valid JSON, no markdown formatting or additional text`

    const result = await model.generateContent(`${systemPrompt}\n\nUser prompt: ${prompt}`)
    const response = await result.response
    const text = response.text()

    // Extract JSON from markdown code blocks if present
    let jsonContent = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('Failed to parse Gemini modification response:', parseError)
      console.error('Raw response:', text)
      console.error('Extracted JSON:', jsonContent)
      throw new Error('Invalid JSON response from Gemini API')
    }

    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Gemini API')
    }

    return {
      content: parsedResponse.content || 'Project modified successfully',
      files: Array.isArray(parsedResponse.files) ? parsedResponse.files : [],
      metadata: {
        model: 'gemini-2.5-flash',
        tokens: 0,
        provider: 'gemini'
      }
    }
  } catch (error) {
    console.error('Gemini modification API Error:', error)
    throw new Error(`Gemini modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateWebsiteWithGemini(prompt: string): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

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

    const result = await model.generateContent(`${systemPrompt}\n\nUser prompt: ${prompt}`)
    const response = await result.response
    const text = response.text()

    // Extract JSON from markdown code blocks if present
    let jsonContent = text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim()
    }

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      console.error('Raw response:', text)
      console.error('Extracted JSON:', jsonContent)
      throw new Error('Invalid JSON response from Gemini API')
    }

    // Validate the parsed response
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid response structure from Gemini API')
    }
    
    return {
      content: parsedResponse.description || 'Website generated successfully',
      files: Array.isArray(parsedResponse.files) ? parsedResponse.files : [],
      metadata: {
        model: 'gemini-2.5-flash',
        tokens: 0, // Gemini doesn't provide token count in the same way
        provider: 'gemini'
      }
    }
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
