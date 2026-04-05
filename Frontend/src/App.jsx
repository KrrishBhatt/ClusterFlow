import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './utils/auth'

import LandingPage   from './pages/LandingPage'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import FriendsPage   from './pages/FriendsPage'
import RoomsPage     from './pages/RoomsPage'
import RoomView      from './pages/RoomView'

function Guard({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}
function PublicOnly({ children }) {
  return isLoggedIn() ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/login"      element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register"   element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/dashboard"  element={<Guard><DashboardPage /></Guard>} />
        <Route path="/friends"    element={<Guard><FriendsPage /></Guard>} />
        <Route path="/rooms"      element={<Guard><RoomsPage /></Guard>} />
        <Route path="/room/:roomId" element={<Guard><RoomView /></Guard>} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}