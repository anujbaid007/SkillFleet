// Server-only thin wrapper around the OpenRouter chat-completions API.
// NEVER import this in a client component — it reads OPENROUTER_API_KEY.
import 'server-only'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

/**
 * Calls OpenRouter and returns the assistant's raw text content, or null on any
 * failure (missing key, network error, non-200, empty body). Callers MUST treat
 * null as "LLM unavailable" and fall back to a deterministic path — the
 * recommender never blocks on the model.
 */
export async function openRouterChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {}
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional attribution headers OpenRouter recommends.
        'X-Title': 'SkillFleet Recommender',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 900,
        response_format: { type: 'json_object' },
      }),
      signal: opts.signal,
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim().length > 0 ? content : null
  } catch {
    return null
  }
}

export function activeModelName(): string {
  return process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
}
