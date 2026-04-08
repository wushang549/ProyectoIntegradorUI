import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing/landing'
import Login from './pages/login/login'
import Signup from './pages/signup/signup'
import ForgotPassword from './pages/forgot-password/ForgotPassword'
import ResetPassword from './pages/reset-password/ResetPassword'
import Analysis from './pages/analysis/analysis'
import Chat from './pages/chat/chat'
import ProtectedRoute from './auth/ProtectedRoute'
import GuestRoute from './auth/GuestRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestRoute>
              <ForgotPassword />
            </GuestRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
