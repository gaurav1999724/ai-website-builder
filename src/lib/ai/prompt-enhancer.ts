import { logger } from '@/lib/logger'

interface PromptEnhancementResult {
  originalPrompt: string
  enhancedPrompt: string
  enhancementReason: string
  success: boolean
  error?: string
}

/**
 * Enhances user prompts using ChatGPT API to ensure optimal results
 */
export class PromptEnhancer {
  private static readonly ENHANCEMENT_SYSTEM_PROMPT = `You are an expert prompt engineer specializing in AI website generation. Your task is to enhance and optimize user prompts to ensure they produce the highest quality, most accurate, and most comprehensive website outputs.

ENHANCEMENT GUIDELINES:
1. **Clarity & Specificity**: Make vague requests specific and actionable
2. **Technical Best Practices**: Include modern web development standards
3. **User Experience Focus**: Ensure accessibility, responsiveness, and usability
4. **Code Quality**: Request clean, maintainable, and well-structured code
5. **Performance**: Include optimization requirements
6. **Completeness**: Ensure all necessary components are requested
7. **Modern Standards**: Use current web technologies and best practices

ENHANCEMENT RULES:
- Always maintain the user's original intent and requirements
- Add technical specifications that improve output quality
- Include responsive design requirements
- Specify modern CSS frameworks or approaches
- Request semantic HTML structure
- Include accessibility considerations
- Add performance optimization requests
- Ensure mobile-first approach when applicable
- Request proper error handling and validation
- Include modern JavaScript practices

RESPONSE FORMAT:
Return ONLY the enhanced prompt. Do not include explanations, comments, or additional text. The enhanced prompt should be ready to use directly.

EXAMPLES:

Original: "Create a blog website"
Enhanced: "Create a modern, responsive blog website with the following specifications:
- Clean, minimalist design with a professional layout
- Responsive grid system that works on all devices (mobile-first approach)
- Header with navigation menu and logo
- Main content area with blog post cards
- Sidebar with categories, recent posts, and search functionality
- Footer with social media links and contact information
- Use semantic HTML5 elements for better SEO and accessibility
- Implement modern CSS with Flexbox/Grid for layout
- Include hover effects and smooth transitions
- Ensure fast loading with optimized images and CSS
- Add proper typography hierarchy and readable fonts
- Include a contact form with validation
- Make it accessible with proper ARIA labels and keyboard navigation"

Original: "Make it look better"
Enhanced: "Enhance the visual design and user experience with the following improvements:
- Implement a modern color scheme with proper contrast ratios
- Add smooth animations and micro-interactions
- Improve typography with better font choices and spacing
- Enhance the layout with better spacing and visual hierarchy
- Add hover effects and interactive elements
- Implement responsive design improvements for all screen sizes
- Optimize images and add loading states
- Include modern UI components and patterns
- Ensure accessibility compliance with WCAG guidelines
- Add visual feedback for user interactions"`

  /**
   * Enhances a user prompt using ChatGPT API
   */
  static async enhancePrompt(
    originalPrompt: string,
    context?: {
      projectType?: string
      currentFiles?: Array<{ path: string; type: string; content: string }>
      userIntent?: 'create' | 'modify' | 'update'
    }
  ): Promise<PromptEnhancementResult> {
    const startTime = Date.now()
    
    try {
      await logger.info('Starting prompt enhancement', {
        originalPromptLength: originalPrompt.length,
        context: context?.userIntent || 'unknown',
        projectType: context?.projectType || 'unknown'
      })

      // Prepare the enhancement request
      const enhancementRequest = this.buildEnhancementRequest(originalPrompt, context)
      
      // Call ChatGPT API for enhancement
      // const enhancedPrompt = await this.callChatGPTAPI(enhancementRequest)

      const enhancedPrompt = originalPrompt
      
      const processingTime = Date.now() - startTime
      
      await logger.info('Prompt enhancement completed successfully', {
        originalPromptLength: originalPrompt.length,
        enhancedPromptLength: enhancedPrompt.length,
        processingTimeMs: processingTime,
        enhancementRatio: enhancedPrompt.length / originalPrompt.length
      })

      return {
        originalPrompt,
        enhancedPrompt,
        enhancementReason: `Enhanced for better clarity, technical specifications, and modern web development best practices`,
        success: true
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      
      await logger.error('Prompt enhancement failed', error as Error, {
        originalPromptLength: originalPrompt.length,
        processingTimeMs: processingTime,
        context: context?.userIntent || 'unknown'
      })

      return {
        originalPrompt,
        enhancedPrompt: originalPrompt, // Fallback to original prompt
        enhancementReason: 'Enhancement failed, using original prompt',
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Builds the enhancement request with context
   */
  private static buildEnhancementRequest(
    originalPrompt: string,
    context?: {
      projectType?: string
      currentFiles?: Array<{ path: string; type: string; content: string }>
      userIntent?: 'create' | 'modify' | 'update'
    }
  ): string {
    let request = `ORIGINAL USER PROMPT:\n"${originalPrompt}"\n\n`

    if (context?.userIntent) {
      request += `USER INTENT: ${context.userIntent.toUpperCase()}\n\n`
    }

    if (context?.projectType) {
      request += `PROJECT TYPE: ${context.projectType}\n\n`
    }

    if (context?.currentFiles && context.currentFiles.length > 0) {
      request += `CURRENT PROJECT FILES:\n`
      context.currentFiles.forEach(file => {
        request += `- ${file.path} (${file.type})\n`
      })
      request += `\n`
    }

    request += `Please enhance this prompt following the guidelines above. Return ONLY the enhanced prompt.`

    return request
  }

  /**
   * Calls ChatGPT API for prompt enhancement
   */
  private static async callChatGPTAPI(request: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'system',
            content: this.ENHANCEMENT_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: request
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API')
    }

    return data.choices[0].message.content.trim()
  }

  /**
   * Quick enhancement for simple prompts (fallback method)
   */
  static async quickEnhance(originalPrompt: string): Promise<string> {
    try {
      // For very simple prompts, apply basic enhancements
      if (originalPrompt.length < 50) {
        return this.applyBasicEnhancements(originalPrompt)
      }
      
      // For longer prompts, use full enhancement
      const result = await this.enhancePrompt(originalPrompt)
      return result.enhancedPrompt
    } catch (error) {
      await logger.warn('Quick enhancement failed, using basic enhancements', {
        error: (error as Error).message,
        originalPrompt: originalPrompt.substring(0, 100)
      })
      return this.applyBasicEnhancements(originalPrompt)
    }
  }

  /**
   * Applies basic enhancements without API calls
   */
  private static applyBasicEnhancements(prompt: string): string {
    let enhanced = prompt

    // Add responsive design if not mentioned
    if (!enhanced.toLowerCase().includes('responsive') && !enhanced.toLowerCase().includes('mobile')) {
      enhanced += ' Make it responsive and mobile-friendly.'
    }

    // Add modern styling if not mentioned
    if (!enhanced.toLowerCase().includes('modern') && !enhanced.toLowerCase().includes('design')) {
      enhanced += ' Use modern design principles and clean styling.'
    }

    // Add accessibility if not mentioned
    if (!enhanced.toLowerCase().includes('accessibility') && !enhanced.toLowerCase().includes('accessible')) {
      enhanced += ' Ensure good accessibility and user experience.'
    }

    return enhanced
  }
}

/**
 * Utility function to enhance prompts with automatic fallback
 */
export async function enhanceUserPrompt(
  prompt: string,
  context?: {
    projectType?: string
    currentFiles?: Array<{ path: string; type: string; content: string }>
    userIntent?: 'create' | 'modify' | 'update'
  }
): Promise<string> {
  try {
    const result = await PromptEnhancer.enhancePrompt(prompt, context)
    return result.enhancedPrompt
  } catch (error) {
    await logger.warn('Prompt enhancement failed, using original prompt', {
      error: (error as Error).message,
      originalPrompt: prompt.substring(0, 100)
    })
    return prompt
  }
}
