/**
 * VirtualCityPage.jsx — Virtual City (fullscreen)
 *
 * Camera modes: overview / third / first (V key to cycle)
 * Approaching the figure room building navigates to My Figure Room (/)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useCityStore } from '../store/cityStore'
import VirtualCityScene from '../components/city/VirtualCityScene'
import CityMinimap from '../components/city/CityMinimap'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

// ══════════════════════════════════════════════════════════
//  Camera mode bar
// ══════════════════════════════════════════════════════════
function CameraModeBar({ mode, onChange }) {
  const { t } = useTranslation()
  const CAM_MODES = [
    { id: 'overview', icon: '🌐', label: t('city.overview')    },
    { id: 'third',    icon: '👤', label: t('city.thirdPerson') },
    { id: 'first',    icon: '👁️', label: t('city.firstPerson') },
  ]
  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20
                    flex items-center gap-1
                    bg-black/55 backdrop-blur-md border border-white/10
                    rounded-2xl px-2 py-1.5">
      {CAM_MODES.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                      text-xs font-semibold transition-all duration-150
                      ${mode === id
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/8 border border-transparent'}`}
        >
          <span className="text-sm">{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
      <div className="w-px h-5 bg-white/10 mx-1" />
      <div className="text-[9px] text-zinc-700 font-mono px-1">{t('city.vKey')}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  WASD hint
// ══════════════════════════════════════════════════════════
function WasdHint({ visible, isFirst }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="wasd"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="bg-black/70 backdrop-blur-md border border-white/10
                          rounded-2xl px-5 py-3 flex flex-col items-center gap-3 text-[11px]">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20
                                  flex items-center justify-center text-zinc-300 font-mono text-xs">W</div>
                </div>
                <div className="flex gap-1">
                  {['A','S','D'].map(k => (
                    <div key={k} className="w-7 h-7 rounded-lg bg-white/10 border border-white/20
                                    flex items-center justify-center text-zinc-300 font-mono text-xs">{k}</div>
                  ))}
                </div>
              </div>
              <div className="text-zinc-500 space-y-0.5">
                <p><span className="text-zinc-300">W/S</span> — {t('city.forward')}</p>
                <p><span className="text-zinc-300">A/D</span> — {t('city.turn')}</p>
                <p><span className="text-zinc-300">W</span>   — {t('city.enterHint')}</p>
              </div>
            </div>
            {isFirst && (
              <div className="w-full flex items-center justify-center gap-2 pt-1
                              border-t border-white/8 text-zinc-500">
                <span className="text-zinc-400">🖱</span>
                <span>{t('city.clickLock')}</span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-600">ESC</span>
                <span>{t('city.esc')}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════
//  Overlay menu
// ══════════════════════════════════════════════════════════
function OverlayMenu({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()
  const { t }            = useTranslation()
  const handleLogout     = () => { onClose(); logout(); navigate('/login') }

  const NAV_ITEMS = [
    { to: '/',           label: t('nav.myRoom'),      sub: t('nav.roomSub'),      end: true  },
    { to: '/city',       label: t('nav.virtualCity'), sub: t('nav.citySub'),      end: false },
    { to: '/generate3d', label: t('nav.generate3d'),  sub: t('nav.gen3dSub'),     end: false },
    { to: '/dashboard',  label: t('nav.dashboard'),   sub: t('nav.dashboardSub'), end: false },
  ]

  const providerLabel = () => {
    if (user?.isGuest)         return t('guest.badge')
    if (user?.provider === 'email') return t('common.emailAcc')
    return user?.provider ?? ''
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="dim"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div key="panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 right-0 h-full w-72 z-50
                       bg-[#08081a]/95 backdrop-blur-xl border-l border-white/8
                       flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <p className="text-xs text-zinc-500 tracking-widest uppercase">{t('common.menu')}</p>
                <p className="text-base font-bold mt-0.5">
                  <span className="text-zinc-100">HERO</span><span className="text-cyan-400">FIG</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <button onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                             text-zinc-500 hover:text-zinc-200 hover:bg-white/8 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User info */}
            <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30
                              flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">
                {(user?.nickname || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">
                  {user?.nickname || user?.email}
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5">{providerLabel()}</p>
              </div>
              {user?.isGuest && (
                <span className="ml-auto shrink-0 text-[9px] font-bold px-1.5 py-0.5
                                 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  GUEST
                </span>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-2 mb-2">
                {t('common.pages')}
              </p>
              {NAV_ITEMS.map(({ to, label, sub, end }) => (
                <NavLink key={to} to={to} end={end} onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-150 border
                     ${isActive
                       ? 'bg-cyan-500/15 border-cyan-500/25 text-zinc-100'
                       : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/6 border-transparent'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${isActive ? 'text-zinc-100' : ''}`}>{label}</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{sub}</p>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-white/8 space-y-2">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                           text-zinc-500 hover:text-red-400 hover:bg-red-500/8
                           transition-all duration-150 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                {t('common.logout')}
              </button>
              <p className="text-center text-[10px] text-zinc-800 font-mono">{t('common.version')}</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════
//  Main page
// ══════════════════════════════════════════════════════════
export default function VirtualCityPage() {
  const navigate = useNavigate()
  const { t }    = useTranslation()
  const [cameraMode, setCameraMode] = useState('third')
  const [menuOpen, setMenuOpen]     = useState(false)
  const [entering, setEntering]     = useState(false)

  const playerPosRef = useRef({ x: 0, z: 0 })
  const playerRotRef = useRef(0)
  const { roomCell } = useCityStore()

  const handleEnterRoom = useCallback(() => {
    if (entering) return
    setEntering(true)
    setTimeout(() => navigate('/'), 380)
  }, [navigate, entering])

  useEffect(() => {
    const modes = ['overview', 'third', 'first']
    const onKey = (e) => {
      if (e.code === 'KeyV')   setCameraMode((m) => modes[(modes.indexOf(m) + 1) % 3])
      if (e.code === 'Digit1') setCameraMode('overview')
      if (e.code === 'Digit2') setCameraMode('third')
      if (e.code === 'Digit3') setCameraMode('first')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const CAM_MODES = [
    { id: 'overview', icon: '🌐', label: t('city.overview')    },
    { id: 'third',    icon: '👤', label: t('city.thirdPerson') },
    { id: 'first',    icon: '👁️', label: t('city.firstPerson') },
  ]
  const currentMode = CAM_MODES.find((m) => m.id === cameraMode)

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">

      {/* 3D Scene */}
      <VirtualCityScene
        cameraMode={cameraMode}
        onEnterRoom={handleEnterRoom}
        playerPosRef={playerPosRef}
        playerRotRef={playerRotRef}
        className="w-full h-full"
      />

      {/* Camera mode bar */}
      <CameraModeBar mode={cameraMode} onChange={setCameraMode} />

      {/* Top-left title */}
      <div className="absolute top-5 left-5 pointer-events-none z-10">
        <div className="bg-black/55 backdrop-blur-md border border-cyan-900/40 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">🏙️</span>
            <p className="text-xs font-bold text-cyan-200 tracking-wide">{t('city.title')}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-zinc-500">
              {currentMode?.icon} {currentMode?.label}
            </span>
            <span className="text-[9px] text-zinc-700">·</span>
            <span className="text-[9px] text-zinc-600">{t('city.freeExplore')}</span>
          </div>
        </div>
      </div>

      {/* Top-right menu button */}
      <div className="absolute top-5 right-5 z-20">
        <motion.button whileTap={{ scale: 0.92 }}
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 rounded-xl bg-black/45 backdrop-blur-md
                     border border-white/12 text-zinc-400 hover:text-zinc-200
                     flex items-center justify-center transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </motion.button>
      </div>

      {/* WASD hint */}
      <WasdHint visible={cameraMode !== 'overview'} isFirst={cameraMode === 'first'} />

      {/* Minimap (bottom-right) */}
      <CityMinimap
        playerPosRef={playerPosRef}
        playerRotRef={playerRotRef}
        roomCell={roomCell}
      />

      {/* Overlay menu */}
      <OverlayMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Room entry fade */}
      <AnimatePresence>
        {entering && (
          <motion.div
            key="fade"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
