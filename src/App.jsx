import { lazy, Suspense } from 'react'
import Home from './pages/Home'
import Canvas from './canvas'
import Costumizer from './pages/Costumizer'
import { useSnapshot } from 'valtio'
import state from './store'

const WearIt = lazy(() => import('./tryon/WearIt'));

function App() {
  const snap = useSnapshot(state);
  return (
    <main className="app transition-all ease-in">
      {/* Dynamic Animated Studio Atelier Background */}
      <div className="dynamic-background-container" aria-hidden="true">
        <div className="studio-orb orb-violet" />
        <div className="studio-orb orb-amber" />
        <div className="studio-orb orb-indigo" />
        <div className="studio-bg-pattern" />
      </div>

      {!snap.preview && <Home />}
      <Canvas />
      {!snap.preview && <Costumizer />}
      {snap.wearItOpen && <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white" role="status">Opening Wear it…</div>}><WearIt onClose={() => state.wearItOpen = false} /></Suspense>}
      {!snap.preview && snap.garment !== 'tshirt' && <a className="model-credit" href="/garments/credits.html" target="_blank" rel="noreferrer">3D model credits</a>}
    </main>
  )
}

export default App
