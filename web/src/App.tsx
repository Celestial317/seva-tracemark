import { Route, Routes } from 'react-router-dom'
import Start from './pages/Start'
import Papers from './pages/Papers'
import Unlock from './pages/Unlock'
import Trace from './pages/Trace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Start />} />
      <Route path="/papers" element={<Papers />} />
      <Route path="/unlock" element={<Unlock />} />
      <Route path="/trace" element={<Trace />} />
    </Routes>
  )
}
