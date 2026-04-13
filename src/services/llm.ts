import type { LLMProviderConfig, SimulationMode } from '@/types'
import type { AgentScore, AgentRelation } from '@/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── OpenAI / Ollama streaming ────────────────────────────────────────────────
async function* streamOpenAI(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages, stream: true, max_tokens: 500, temperature: 0.85 }),
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

// ─── Anthropic streaming ──────────────────────────────────────────────────────
async function* streamAnthropic(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: 500, ...(systemMsg ? { system: systemMsg.content } : {}), messages: chatMessages, stream: true }),
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

// ─── Gemini streaming ─────────────────────────────────────────────────────────
async function* streamGemini(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Begin.' }] })

  const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 500, temperature: 0.85 } }
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

// ─── Streaming dispatcher ─────────────────────────────────────────────────────
export async function* streamChat(config: LLMProviderConfig, messages: ChatMessage[]): AsyncGenerator<string> {
  switch (config.id) {
    case 'anthropic': yield* streamAnthropic(config, messages); break
    case 'gemini':    yield* streamGemini(config, messages); break
    default:          yield* streamOpenAI(config, messages)
  }
}

// ─── Non-streaming callers ────────────────────────────────────────────────────
async function callOpenAI(config: LLMProviderConfig, messages: ChatMessage[]): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST', headers,
    body: JSON.stringify({ model: config.model, messages, stream: false, max_tokens: 1200, temperature: 0.9 }),
  })
  if (!res.ok) throw new Error(`${config.name} error (${res.status}): ${await res.text()}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic(config: LLMProviderConfig, messages: ChatMessage[]): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }))
  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: 1200, ...(systemMsg ? { system: systemMsg.content } : {}), messages: chatMessages }),
  })
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`)
  const json = await res.json()
  return json.content?.[0]?.text ?? ''
}

async function callGemini(config: LLMProviderConfig, messages: ChatMessage[]): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system')
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Begin.' }] })
  const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: 1200, temperature: 0.9 } }
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  const res = await fetch(`${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`)
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export async function callChat(config: LLMProviderConfig, messages: ChatMessage[]): Promise<string> {
  switch (config.id) {
    case 'anthropic': return callAnthropic(config, messages)
    case 'gemini':    return callGemini(config, messages)
    default:          return callOpenAI(config, messages)
  }
}

// ─── AI agent generation ──────────────────────────────────────────────────────
export interface GeneratedAgent {
  name: string
  role: string
  emoji: string
  systemPrompt: string
}

export async function generateAgentPersonas(
  config: LLMProviderConfig,
  scenario: string,
  mode: SimulationMode,
  count: number,
): Promise<GeneratedAgent[]> {
  const modeCtx: Record<SimulationMode, string> = {
    consulting: 'business strategy consulting simulation',
    social:     'social media opinion & sentiment simulation',
    research:   'research synthesis & hypothesis validation',
    fashion:    'fashion retail intelligence simulation',
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: 'You are a simulation designer. Output only valid JSON arrays, no markdown, no explanation.' },
    {
      role: 'user',
      content: `Generate ${count} unique agent personas for a ${modeCtx[mode]}.

SCENARIO (first 600 chars):
${scenario.slice(0, 600)}

Return ONLY a JSON array with exactly ${count} objects. Each object:
{
  "name": "Short name like 'The Skeptic' or 'The User'",
  "role": "Full role title (e.g. 'Chief Risk Officer')",
  "emoji": "single emoji",
  "systemPrompt": "2-3 sentences: their unique perspective, what they prioritize, how they argue. Be SPECIFIC to the scenario above."
}

Rules:
- Each agent must have a DISTINCT angle not already covered by standard agents
- Names start with 'The' and max 3 words
- System prompts must be scenario-specific, not generic platitudes`,
    },
  ]

  const raw = await callChat(config, messages)
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Model did not return a valid JSON array')
  return JSON.parse(jsonMatch[0]) as GeneratedAgent[]
}

// ─── Message builders ─────────────────────────────────────────────────────────

function relationsInstruction(otherAgents: { id: string; name: string }[]): string {
  if (!otherAgents.length) return ''
  const list = otherAgents.map((a) => `${a.id} (${a.name})`).join(', ')
  return `\n\nRELATION TAG (required — add as the last line before any SCORE line):
RELATIONS: TYPE:agent_id[, TYPE:agent_id...]
Available TYPEs: AGREE, CHALLENGE, NEUTRAL, BUILDS_ON
Available agents: ${list}
Example: RELATIONS: CHALLENGE:skeptic, BUILDS_ON:analyst`
}

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

/** Round 2..N-1 — Cross-examination / discussion */
export function buildCrossExamMessages(
  systemPrompt: string,
  scenario: string,
  allRound1: { agentName: string; content: string }[],
  previous: { agentName: string; content: string }[],
  injectedContexts: string[],
  myPositionSummary?: string,
  otherAgents: { id: string; name: string }[] = [],
): ChatMessage[] {
  const round1Context = allRound1.map((m) => `[${m.agentName} — Opening]: ${m.content}`).join('\n\n')
  const round2SoFar = previous.length > 0
    ? '\n\nROUND SO FAR:\n' + previous.map((m) => `[${m.agentName}]: ${m.content}`).join('\n\n')
    : ''
  const injected = injectedContexts.length > 0
    ? `\n\nNEW CONTEXT:\n${injectedContexts.join('\n')}`
    : ''
  const positionAnchor = myPositionSummary
    ? `\n\nYOUR OPENING POSITION (maintain coherence — change only if new evidence compels it):\n"${myPositionSummary}"`
    : ''

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `SCENARIO:\n${scenario}${injected}\n\nROUND 1 — OPENING POSITIONS:\n${round1Context}${round2SoFar}${positionAnchor}\n\nCROSS-EXAMINATION: Choose one agent whose argument you most strongly agree with OR disagree with. Address them directly by name. Build on, challenge, or refute their specific claim. Be precise.${relationsInstruction(otherAgents)}`,
    },
  ]
}

/** Round N — Final verdict with structured score */
export function buildFinalVerdictMessages(
  systemPrompt: string,
  scenario: string,
  allPrevious: { agentName: string; content: string; round: number }[],
  injectedContexts: string[],
  myPositionSummary?: string,
  otherAgents: { id: string; name: string }[] = [],
): ChatMessage[] {
  const r1 = allPrevious.filter((m) => m.round === 1).map((m) => `[${m.agentName} — Opening]: ${m.content}`).join('\n\n')
  const middle = allPrevious.filter((m) => m.round > 1).map((m) => `[${m.agentName} — R${m.round}]: ${m.content}`).join('\n\n')
  const injected = injectedContexts.length > 0 ? `\n\nNEW CONTEXT:\n${injectedContexts.join('\n')}` : ''
  const positionAnchor = myPositionSummary
    ? `\n\nYOUR OPENING POSITION (be explicit about whether you stand by it):\n"${myPositionSummary}"`
    : ''

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `SCENARIO:\n${scenario}${injected}\n\nROUND 1 — OPENINGS:\n${r1}${middle ? `\n\nMIDDLE ROUNDS:\n${middle}` : ''}${positionAnchor}\n\nFINAL VERDICT: State your definitive position. Did you change your mind from Round 1? Why or why not? Be decisive.${relationsInstruction(otherAgents)}\n\nEnd your response with EXACTLY this line (after RELATIONS if present):\nSCORE: [1-10] | CONFIDENCE: [low/medium/high] | KEY: [one sentence verdict]`,
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
const SCORE_RE = /^SCORE:\s*(\d+)\s*\|\s*CONFIDENCE:\s*(low|medium|high)\s*\|\s*KEY:\s*(.+)$/im

export function parseScore(content: string): { clean: string; score?: AgentScore } {
  const match = content.match(SCORE_RE)
  if (!match) return { clean: content }
  const score: AgentScore = {
    value: Math.min(10, Math.max(1, parseInt(match[1]))),
    confidence: match[2].toLowerCase() as AgentScore['confidence'],
    keyPoint: match[3].trim(),
  }
  // Remove the matched line from content
  const clean = content.replace(match[0], '').trimEnd()
  return { clean, score }
}

// ─── Relations parser ─────────────────────────────────────────────────────────
const RELATIONS_RE = /^RELATIONS:\s*(.+)$/im

export function parseRelations(
  content: string,
  agentMap: Record<string, string>,
): { clean: string; relations: AgentRelation[] } {
  const match = content.match(RELATIONS_RE)
  if (!match) return { clean: content, relations: [] }

  const relations: AgentRelation[] = []
  const valid = new Set(['AGREE', 'CHALLENGE', 'NEUTRAL', 'BUILDS_ON'])

  for (const part of match[1].split(',')) {
    const [rawType, rawId] = part.trim().split(':').map((s) => s.trim())
    const type = rawType?.toUpperCase()
    const targetId = rawId?.toLowerCase()
    if (type && valid.has(type) && targetId) {
      relations.push({
        type: type as AgentRelation['type'],
        targetAgentId: targetId,
        targetAgentName: agentMap[targetId] ?? targetId,
      })
    }
  }

  const clean = content.replace(match[0], '').trimEnd()
  return { clean, relations }
}
