import Home from './pages/Home'
import Canvas from './canvas'
import Costumizer from './pages/Costumizer'
import { useSnapshot } from 'valtio'
import state from './store'

function App() {
  const snap = useSnapshot(state);
  return (
    <main className="app transition-all ease-in bg-gray-300">
      {!snap.preview && <Home />}
      <Canvas />
      {!snap.preview && <Costumizer />}
      {!snap.preview && snap.garment !== 'tshirt' && <a className="model-credit" href="/garments/credits.html" target="_blank" rel="noreferrer">3D model credits</a>}
    </main>
  )
}

export default App
