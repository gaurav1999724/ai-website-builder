import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getSystemPrompt } from '@/lib/ai/prompt-helper'
import { enhanceUserPrompt } from '@/lib/ai/prompt-enhancer'
import { AIProvider, PromptType } from '@prisma/client'

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  provider: z.enum(['openai', 'gemini']).default('openai'),
  projectId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, provider, projectId } = chatSchema.parse(body)

    // Enhance the user message for better chat responses
    const enhancedMessage = await enhanceUserPrompt(message, {
      userIntent: 'modify',
      projectType: 'website'
    })

    await logger.info('Chat request received', {
      userId: session.user.id,
      provider,
      originalMessageLength: message.length,
      enhancedMessageLength: enhancedMessage.length,
      projectId
    })

    let aiResponse: string

    if (provider === 'openai') {
      aiResponse = await getOpenAIResponse(enhancedMessage, projectId)
    } else if (provider === 'gemini') {
      aiResponse = await getGeminiResponse(enhancedMessage, projectId)
    } else {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    await logger.info('Chat response generated', {
      userId: session.user.id,
      provider,
      responseLength: aiResponse.length
    })

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    await logger.error('Chat API error', error as Error, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getOpenAIResponse(message: string, projectId?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = `You are an expert web developer and AI assistant helping users with their website projects. 
You can help with:
- HTML, CSS, JavaScript questions
- Web development best practices
- Code debugging and optimization
- UI/UX design suggestions
- Project structure advice
- Technology recommendations

Be helpful, concise, and provide practical solutions. If the user asks about a specific project, provide relevant advice based on web development best practices.`

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
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
}

async function getGeminiResponse(message: string, projectId?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured')
  }

  // Fetch dynamic prompt from database
  const systemPrompt = await getSystemPrompt(AIProvider.GEMINI, PromptType.CHAT_ASSISTANT)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUser: ${message}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API request failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
}
