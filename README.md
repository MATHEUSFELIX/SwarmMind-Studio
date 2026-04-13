# SwarmMind Studio

Multi-agent swarm intelligence platform for strategic simulations, social opinion analysis, research synthesis, and fashion retail intelligence.

## Features

- **4 simulation modes**: Consulting, Social, Research, Fashion Intelligence
- **Real-time streaming** agent debates via SSE across all providers
- **4 LLM providers**: OpenAI, Google Gemini, Anthropic Claude, Ollama (local or cloud)
- **Fashion Intelligence**: structured brief for collections & licensed brands, with retail-specific agents (Forecaster, Buyer, Shopper, Brand Lead, VM, ESG Auditor)
- **Metrics dashboard**: sentiment timeline, consensus score, and fashion-specific KPIs (Trend Score, Sell-Through prediction, Licensing Fit, Virality, ESG Risk)
- Fully responsive — desktop sidebar + mobile bottom nav

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run dev server
npm run dev
```

Open [http://localhost:3334](http://localhost:3334).

## LLM Providers

| Provider | Default Model | Notes |
|----------|--------------|-------|
| Ollama | `gemma3:4b` | Local (free) or Ollama Cloud |
| OpenAI | `gpt-4o-mini` | Requires API key |
| Gemini | `gemini-2.5-flash` | Requires Google AI API key |
| Anthropic | `claude-sonnet-4-5` | Proxied via Vite to bypass CORS |

Switch providers anytime using the selector in the sidebar.

## Stack

- **React 18** + TypeScript + Vite
- **Tailwind CSS** + custom design system
- **Zustand** (state, persisted to localStorage)
- **Recharts** (sentiment timeline chart)
- **React Router v7**

## Project Structure

```
src/
├── config/llm.ts          # LLM provider configs (reads from .env)
├── services/llm.ts        # Streaming service (OpenAI/Gemini/Anthropic/Ollama)
├── data/personas.ts       # 20 agent personas across 4 modes
├── stores/                # Zustand stores
├── components/            # Layout + UI components
└── pages/                 # HomePage, NewSimulationPage, SimulationPage
```
