import type { LLMProviderConfig } from '@/types'
import type { AgentScore } from '@/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── OpenAI / Ollama ──────────────────────────────────────────────────────────
async function* streamOpenAI(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages, stream: true, max_tokens: 450, temperature: 0.85 }),
  })
  if (!res.ok) throw new Error(`${config.name} error (${res.status}): ${await res.text()}`)

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
      const t = line.trim()
      if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue
      try { const d = JSON.parse(t.slice(6))?.choices?.[0]?.delta?.content; if (d) yield d } catch { /* ignore */ }
    }
  }
}

// ─── Anthropic ────────────────────────────────────────────────────────────────
async function* streamAnthropic(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: 450, ...(systemMsg ? { system: systemMsg.content } : {}), messages: chatMessages, stream: true }),
  })
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`)

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
      const t = line.trim()
      if (!t.startsWith('data: ')) continue
      try {
        const json = JSON.parse(t.slice(6))
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') yield json.delta.text
      } catch { /* ignore */ }
    }
  }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
async function* streamGemini(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Begin.' }] })

  const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 450, temperature: 0.85 } }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }

  const res = await fetch(`${config.baseUrl}/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`)

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
      const t = line.trim()
      if (!t.startsWith('data: ')) continue
      try { const text = JSON.parse(t.slice(6))?.candidates?.[0]?.content?.parts?.[0]?.text; if (text) yield text } catch { /* ignore */ }
    }
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export async function* streamChat(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  switch (config.id) {
    case 'anthropic': yield* streamAnthropic(config, messages); break
    case 'gemini':    yield* streamGemini(config, messages); break
    default:          yield* streamOpenAI(config, messages)
  }
}

// ─── Message builders ─────────────────────────────────────────────────────────

/** Round 1 — Opening positions */
export function buildOpeningMessages(
  systemPrompt: string,
  scenario: string,
  previous: { agentName: string; content: string }[],
  injectedContexts: string[],
): ChatMessage[] {
  const context = previous.length > 0
    ? previous.map((m) => `[${m.agentName}]: ${m.content}`).join('\n\n')
    : 'You are the first to respond.'

  const injected = injectedContexts.length > 0
    ? `\n\nNEW CONTEXT INJECTED MID-DEBATE:\n${injectedContexts.join('\n')}`
    : ''

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `SCENARIO:\n${scenario}${injected}\n\nPREVIOUS AGENT RESPONSES:\n${context}\n\nNow provide your opening analysis. Be specific and direct.` },
  ]
}

/** Round 2 — Cross-examination */
export function buildCrossExamMessages(
  systemPrompt: string,
  scenario: string,
  allRound1: { agentName: string; content: string }[],
  previous: { agentName: string; content: string }[],
  injectedContexts: string[],
): ChatMessage[] {
  const round1Context = allRound1.map((m) => `[${m.agentName} — Opening]: ${m.content}`).join('\n\n')
  const round2SoFar = previous.length > 0
    ? '\n\nROUND 2 SO FAR:\n' + previous.map((m) => `[${m.agentName}]: ${m.content}`).join('\n\n')
    : ''
  const injected = injectedContexts.length > 0
    ? `\n\nNEW CONTEXT:\n${injectedContexts.join('\n')}`
    : ''

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `SCENARIO:\n${scenario}${injected}\n\nROUND 1 — OPENING POSITIONS:\n${round1Context}${round2SoFar}\n\nROUND 2 — CROSS-EXAMINATION: Choose the claim from another agent that you most strongly agree with OR disagree with. Address that agent directly by name. Build on, challenge, or refute their specific argument. Be precise and combative if needed.`,
    },
  ]
}

/** Round 3 — Final verdict with structured score */
export function buildFinalVerdictMessages(
  systemPrompt: string,
  scenario: string,
  allPrevious: { agentName: string; content: string; round: number }[],
  injectedContexts: string[],
): ChatMessage[] {
  const r1 = allPrevious.filter((m) => m.round === 1).map((m) => `[${m.agentName} — Opening]: ${m.content}`).join('\n\n')
  const r2 = allPrevious.filter((m) => m.round === 2).map((m) => `[${m.agentName} — Cross-exam]: ${m.content}`).join('\n\n')
  const injected = injectedContexts.length > 0 ? `\n\nNEW CONTEXT:\n${injectedContexts.join('\n')}` : ''

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `SCENARIO:\n${scenario}${injected}\n\nROUND 1 — OPENINGS:\n${r1}\n\nROUND 2 — CROSS-EXAMINATION:\n${r2}\n\nROUND 3 — FINAL VERDICT: The full debate is above. State your final, definitive position. Did you change your mind from Round 1? Why or why not? Be decisive.\n\nEnd your response with EXACTLY this line (no variations):\nSCORE: [1-10] | CONFIDENCE: [low/medium/high] | KEY: [one sentence verdict]`,
    },
  ]
}

/** Legacy builder — used when rounds = 1 */
export function buildAgentMessages(
  systemPrompt: string,
  scenario: string,
  previousMessages: { agentName: string; content: string }[],
  injectedContexts: string[] = [],
): ChatMessage[] {
  return buildOpeningMessages(systemPrompt, scenario, previousMessages, injectedContexts)
}

// ─── Score parser ─────────────────────────────────────────────────────────────
const SCORE_RE = /SCORE:\s*(\d+)\s*\|\s*CONFIDENCE:\s*(low|medium|high)\s*\|\s*KEY:\s*(.+)$/im

export function parseScore(content: string): { clean: string; score?: AgentScore } {
  const match = content.match(SCORE_RE)
  if (!match) return { clean: content }
  const score: AgentScore = {
    value: Math.min(10, Math.max(1, parseInt(match[1]))),
    confidence: match[2].toLowerCase() as AgentScore['confidence'],
    keyPoint: match[3].trim(),
  }
  const clean = content.slice(0, match.index).trimEnd()
  return { clean, score }
}
