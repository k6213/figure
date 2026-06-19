import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout            from './components/layout/Layout'
import DashboardPage     from './pages/DashboardPage'
import Generate3DPage    from './pages/Generate3DPage'
import FigureRoomPage    from './pages/FigureRoomPage'
import VirtualCityPage   from './pages/VirtualCityPage'
import LoginPage         from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import ShowroomPage      from './pages/ShowroomPage'

/** Requires any authenticated session (including guest) */
function Guard({ children }) {
  const ok = useAuthStore((s) => s.isAuthenticated)
  return ok ? children : <Navigate to="/login" replace />
}

/** Requires a full (non-guest) account */
function AccountGuard({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.isGuest)    return <Navigate to="/city"  replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      {/* Virtual City → now the Building Showroom (Atlanta + urban park) */}
      <Route path="/city"     element={<Guard><ShowroomPage /></Guard>} />
      {/* Old procedural city kept at /city-classic if needed */}
      <Route path="/city-classic" element={<Guard><VirtualCityPage /></Guard>} />

      {/* My Figure Room — guest access allowed */}
      <Route path="/"     element={<Guard><FigureRoomPage /></Guard>} />

      {/* Account-only pages */}
      <Route element={<AccountGuard><Layout /></AccountGuard>}>
        <Route path="/dashboard"  element={<DashboardPage />} />
        <Route path="/generate3d" element={<Generate3DPage />} />
      </Route>
    </Routes>
  )
}
