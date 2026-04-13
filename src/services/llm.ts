import type { LLMProviderConfig } from '@/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── OpenAI / Ollama (OpenAI-compatible) ─────────────────────────────────────
async function* streamOpenAI(
  config: LLMProviderConfig,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      max_tokens: 400,
      temperature: 0.85,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${config.name} error (${res.status}): ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

// ─── Anthropic ────────────────────────────────────────────────────────────────
async function* streamAnthropic(
  config: LLMProviderConfig,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }))

  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 400,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMessages,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic error (${res.status}): ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          yield json.delta.text
        }
      } catch {
        // ignore
      }
    }
  }
}

// ─── Google Gemini ────────────────────────────────────────────────────────────
async function* streamGemini(
  config: LLMProviderConfig,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system')

  // Gemini requires alternating user/model roles — merge consecutive same-role msgs
  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // If there's only a system message and a user message, Gemini needs at least a user turn
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Begin.' }] })
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: 400, temperature: 0.85 },
  }

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const url = `${config.baseUrl}/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error (${res.status}): ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      try {
        const json = JSON.parse(trimmed.slice(6))
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield text
      } catch {
        // ignore
      }
    }
  }
}

// ─── Public interface ─────────────────────────────────────────────────────────
export async function* streamChat(
  config: LLMProviderConfig,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  switch (config.id) {
    case 'anthropic':
      yield* streamAnthropic(config, messages)
      break
    case 'gemini':
      yield* streamGemini(config, messages)
      break
    case 'openai':
    case 'ollama':
    default:
      yield* streamOpenAI(config, messages)
  }
}

/** Build the messages array for a given agent turn */
export function buildAgentMessages(
  systemPrompt: string,
  scenario: string,
  previousMessages: { agentName: string; content: string }[],
): ChatMessage[] {
  const context =
    previousMessages.length > 0
      ? previousMessages.map((m) => `[${m.agentName}]: ${m.content}`).join('\n\n')
      : 'You are the first to respond.'

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `SCENARIO:\n${scenario}\n\nPREVIOUS AGENT RESPONSES:\n${context}\n\nNow provide your analysis.`,
    },
  ]
}
