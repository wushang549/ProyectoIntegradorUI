import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing/landing'
import Login from './pages/login/login'
import Signup from './pages/signup/signup'
import Analysis from './pages/analysis/analysis'
import Chat from './pages/chat/chat'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  )
}
