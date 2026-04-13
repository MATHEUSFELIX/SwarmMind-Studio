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
