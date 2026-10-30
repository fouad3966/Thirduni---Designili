import { lazy, Suspense } from 'react'
import Home from './pages/Home'
import Canvas from './canvas'
import Costumizer from './pages/Costumizer'
import { useSnapshot } from 'valtio'
import state from './store'
import PricingModal from './comp/PricingModal'
import SubscriptionCheckoutModal from './comp/SubscriptionCheckoutModal'
import OrderPrintModal from './comp/OrderPrintModal'

const WearIt = lazy(() => import('./tryon/WearIt'));

function App() {
  const snap = useSnapshot(state);
  return (
    <main className={`app ${snap.preview ? 'preview-mode' : snap.intro ? 'home-mode' : 'editor-mode'} transition-all ease-in bg-gray-300`}>
      {!snap.preview && <Home />}
      <Canvas />
      {!snap.preview && <Costumizer />}
      {snap.wearItOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white" role="status">Opening Wear it…</div>}>
          <WearIt onClose={() => state.wearItOpen = false} />
        </Suspense>
      )}
      {!snap.preview && snap.garment !== 'tshirt' && (
        <a className="model-credit" href="/garments/credits.html" target="_blank" rel="noreferrer">3D model credits</a>
      )}

      {/* Monetization, Checkout, and Partner Order Systems */}
      <PricingModal />
      <SubscriptionCheckoutModal />
      <OrderPrintModal />
    </main>
  )
}

export default App
