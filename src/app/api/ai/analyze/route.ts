import { auth } from '@/lib/auth'
import { serverEnv } from '@/lib/env'
import { buildAIContext } from '@/lib/ai/context'
import { buildPrompt, type AnalysisMode } from '@/lib/ai/prompts'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const requestSchema = z.object({
  mode: z.enum(['weekly', 'root-cause', 'recommendations', 'narrative']),
})

const client = new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten() }), { status: 400 })
  }

  const mode = parsed.data.mode as AnalysisMode
  const ctx = await buildAIContext(session.user.id)
  const { system, user } = buildPrompt(mode, ctx)

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
    cancel() {
      stream.controller.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
