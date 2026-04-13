import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import NewSimulationPage from '@/pages/NewSimulationPage'
import SimulationPage from '@/pages/SimulationPage'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewSimulationPage />} />
        <Route path="/simulation/:id" element={<SimulationPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  )
}
