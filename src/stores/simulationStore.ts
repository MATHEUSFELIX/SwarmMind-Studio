import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Simulation, AgentMessage, SimulationConfig, SimulationMetrics } from '@/types'

interface SimulationStore {
  simulations: Simulation[]
  activeId: string | null

  createSimulation: (config: SimulationConfig) => Simulation
  addMessage: (simId: string, message: AgentMessage) => void
  appendToLastMessage: (simId: string, agentId: string, chunk: string) => void
  finalizeMessage: (simId: string, agentId: string) => void
  setStatus: (simId: string, status: Simulation['status']) => void
  setMetrics: (simId: string, metrics: SimulationMetrics) => void
  setRound: (simId: string, round: number) => void
  injectContext: (simId: string, context: string) => void
  forkSimulation: (simId: string) => Simulation
  linkSimulations: (idA: string, idB: string) => void
  setActive: (id: string | null) => void
  getSimulation: (id: string) => Simulation | undefined
  deleteSimulation: (id: string) => void
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      simulations: [],
      activeId: null,

      createSimulation: (config) => {
        const sim: Simulation = {
          ...config,
          status: 'idle',
          messages: [],
          createdAt: Date.now(),
          currentRound: 1,
          injectedContexts: [],
        }
        set((s) => ({ simulations: [sim, ...s.simulations], activeId: sim.id }))
        return sim
      },

      addMessage: (simId, message) => {
        set((s) => ({
          simulations: s.simulations.map((sim) =>
            sim.id === simId ? { ...sim, messages: [...sim.messages, message] } : sim,
          ),
        }))
      },

      appendToLastMessage: (simId, agentId, chunk) => {
        set((s) => ({
          simulations: s.simulations.map((sim) => {
            if (sim.id !== simId) return sim
            const msgs = [...sim.messages]
            let idx = -1
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].agentId === agentId && msgs[i].isStreaming) { idx = i; break }
            }
            if (idx === -1) return sim
            msgs[idx] = { ...msgs[idx], content: msgs[idx].content + chunk }
            return { ...sim, messages: msgs }
          }),
        }))
      },

      finalizeMessage: (simId, agentId) => {
        set((s) => ({
          simulations: s.simulations.map((sim) => {
            if (sim.id !== simId) return sim
            const msgs = sim.messages.map((m) =>
              m.agentId === agentId && m.isStreaming ? { ...m, isStreaming: false } : m,
            )
            return { ...sim, messages: msgs }
          }),
        }))
      },

      setStatus: (simId, status) => {
        set((s) => ({
          simulations: s.simulations.map((sim) =>
            sim.id === simId
              ? { ...sim, status, ...(status === 'completed' ? { completedAt: Date.now() } : {}) }
              : sim,
          ),
        }))
      },

      setMetrics: (simId, metrics) => {
        set((s) => ({
          simulations: s.simulations.map((sim) =>
            sim.id === simId ? { ...sim, metrics } : sim,
          ),
        }))
      },

      setRound: (simId, round) => {
        set((s) => ({
          simulations: s.simulations.map((sim) =>
            sim.id === simId ? { ...sim, currentRound: round } : sim,
          ),
        }))
      },

      injectContext: (simId, context) => {
        set((s) => ({
          simulations: s.simulations.map((sim) =>
            sim.id === simId
              ? { ...sim, injectedContexts: [...sim.injectedContexts, context] }
              : sim,
          ),
        }))
      },

      forkSimulation: (simId) => {
        const original = get().simulations.find((s) => s.id === simId)
        if (!original) throw new Error('Simulation not found')
        const forked: Simulation = {
          ...original,
          id: crypto.randomUUID(),
          name: `Fork of ${original.name}`,
          status: 'idle',
          messages: [],
          metrics: undefined,
          createdAt: Date.now(),
          completedAt: undefined,
          currentRound: 1,
          injectedContexts: [],
          linkedSimId: undefined,
        }
        set((s) => ({ simulations: [forked, ...s.simulations], activeId: forked.id }))
        return forked
      },

      linkSimulations: (idA, idB) => {
        set((s) => ({
          simulations: s.simulations.map((sim) => {
            if (sim.id === idA) return { ...sim, linkedSimId: idB }
            if (sim.id === idB) return { ...sim, linkedSimId: idA }
            return sim
          }),
        }))
      },

      setActive: (id) => set({ activeId: id }),

      getSimulation: (id) => get().simulations.find((s) => s.id === id),

      deleteSimulation: (id) => {
        set((s) => ({
          simulations: s.simulations.filter((sim) => sim.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        }))
      },
    }),
    { name: 'swarmmind-simulations' },
  ),
)
