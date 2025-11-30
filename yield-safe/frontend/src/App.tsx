import { Routes, Route } from 'react-router-dom'
import { WalletProvider } from './providers/WalletProvider'
import { Layout } from './components/Layout'
import { RealDashboard } from './pages/RealDashboard'
import { VaultDetails } from './pages/VaultDetails'
import { CreateVault } from './pages/CreateVault'
import { VaultManagement } from './pages/VaultManagement'
import { MasumiAgentPanel } from './components/MasumiAgentPanel'
import { AIRebalancer } from './components/AIRebalancer'

function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<RealDashboard />} />
          <Route path="/vault/:vaultId" element={<VaultDetails />} />
          <Route path="/create" element={<CreateVault />} />
          <Route path="/manage" element={<VaultManagement />} />
          <Route path="/ai-agent" element={
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              <MasumiAgentPanel />
            </div>
          } />
          <Route path="/ai-rebalancer" element={
            <div className="container mx-auto px-4 py-8 max-w-6xl">
              <AIRebalancer />
            </div>
          } />
        </Routes>
      </Layout>
    </WalletProvider>
  )
}

export default App