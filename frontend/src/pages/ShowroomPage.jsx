import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BuildingShowroom from '../components/showroom/BuildingShowroom'

export default function ShowroomPage() {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="w-full h-screen bg-[#0a1018] relative">
      <BuildingShowroom className="w-full h-full" />

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between
                      px-5 py-3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        {/* Logo */}
        <span className="font-display text-2xl tracking-widest text-white pointer-events-auto">
          HERO<span className="text-brand-500">FIG</span>
        </span>

        {/* Nav + user */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link to="/city-classic"
                className="text-zinc-400 hover:text-white text-sm transition-colors">
            Procedural City →
          </Link>
          <Link to="/"
                className="text-zinc-400 hover:text-white text-sm transition-colors">
            My Room
          </Link>

          {/* Divider */}
          <div className="w-px h-4 bg-white/15" />

          {/* User chip */}
          {user && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md
                            border border-white/10 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-brand-500/30 border border-brand-500/40
                              flex items-center justify-center text-brand-400 text-[11px] font-bold">
                {(user.nickname || user.email || 'U')[0].toUpperCase()}
              </div>
              <span className="text-xs text-zinc-300 max-w-[96px] truncate hidden sm:block">
                {user.nickname || user.email}
              </span>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                       bg-black/40 backdrop-blur-md border border-white/10
                       text-zinc-400 hover:text-red-400 hover:border-red-500/30
                       transition-all duration-150 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                 strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
