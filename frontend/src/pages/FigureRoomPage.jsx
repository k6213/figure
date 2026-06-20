/**
 * FigureRoomPage.jsx — My Figure Room (fullscreen)
 *
 * Camera modes:
 *  - 'overview' : free orbit (default)
 *  - 'third'    : third-person — follows behind character
 *  - 'first'    : first-person — character eye level
 *
 * Shortcuts: V → cycle modes / 1·2·3 → direct select
 * Walking through the front exit arch navigates to Virtual City (/city)
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useGenerationList } from '../hooks/useMeshy'
import { useChat }  from '../hooks/useChat'
import CityScene, { PLAZA_SLOTS } from '../components/city/CityScene'
import FurnitureMenu from '../components/room/FurnitureMenu'
import ChatBox       from '../components/chat/ChatBox'
import { useThemeStore } from '../store/themeStore'

// ── Common navItems ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',           label: '🏠 My Figure Room', sub: 'Figure Collection & Display',  end: true  },
  { to: '/city',       label: '🏙️ Virtual City',   sub: 'City Exploration',              end: false },
  { to: '/generate3d', label: '✦ Generate 3D Figure', sub: 'Create Figures with AI',   end: false },
  { to: '/dashboard',  label: '📊 Dashboard',       sub: 'Market Prices & Stats',           end: false },
]

// ── Camera mode SVG icons ─────────────────────────────────────────────────────
function IconOrbit() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </svg>
  )
}
function IconThirdPerson() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="3" />
      <path d="M5 21v-2a7 7 0 0114 0v2" />
      <path d="M17 14l3-3-3-3" />
    </svg>
  )
}
function IconFirstPerson() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M2 12C4 7 7.5 4 12 4s8 3 10 8c-2 5-5.5 8-10 8S4 17 2 12z" />
    </svg>
  )
}

// ── Camera mode info ──────────────────────────────────────────────────────────
const CAM_MODES = [
  { id: 'overview', Icon: IconOrbit,       label: 'Overview',     sub: 'Orbit Camera'   },
  { id: 'third',    Icon: IconThirdPerson, label: 'Third Person', sub: 'W/A/S/D'        },
  { id: 'first',    Icon: IconFirstPerson, label: 'First Person', sub: 'W/A/S/D'        },
]

// ══════════════════════════════════════════════════════════
//  Camera mode bar (top center)
// ══════════════════════════════════════════════════════════
function CameraModeBar({ mode, onChange }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20
                    flex items-center gap-0.5
                    bg-[#06060f]/80 backdrop-blur-2xl
                    border border-white/[0.07]
                    rounded-2xl px-1.5 py-1.5
                    shadow-xl shadow-black/50
                    ring-1 ring-inset ring-white/[0.03]">
      {CAM_MODES.map(({ id, Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl
                      text-xs font-medium transition-all duration-150
                      ${mode === id
                        ? 'text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'}`}
        >
          {mode === id && (
            <motion.div
              layoutId="cam-active-pill"
              className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/[0.10]"
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            />
          )}
          <span className="relative">
            <Icon />
          </span>
          <span className="relative hidden sm:inline">{label}</span>
        </button>
      ))}

      <div className="w-px h-4 bg-white/[0.08] mx-1" />

      <kbd className="text-[9px] text-zinc-700 font-mono
                      px-2 py-1 rounded-lg
                      bg-white/[0.03] border border-white/[0.06]">
        V
      </kbd>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  WASD hint
// ══════════════════════════════════════════════════════════
function WasdHint({ visible, isFirst }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="wasd"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
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
                <p><span className="text-zinc-300">W/S</span> — Forward / Backward</p>
                <p><span className="text-zinc-300">A/D</span> — Turn Left / Turn Right</p>
                <p><span className="text-zinc-300">S</span>   — Exit direction (front arch)</p>
              </div>
            </div>
            {isFirst && (
              <div className="w-full flex items-center justify-center gap-2 pt-1
                              border-t border-white/8 text-zinc-500">
                <span className="text-zinc-400">🖱</span>
                <span>Click screen → Lock mouse view</span>
                <span className="text-zinc-700">·</span>
                <span className="font-mono text-zinc-600">ESC</span>
                <span>Release</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════
//  Theme toggle button
// ══════════════════════════════════════════════════════════
function ThemeToggleButton() {
  const { themeId, toggleTheme } = useThemeStore()
  const isNaruto = themeId === 'naruto'
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      title={isNaruto ? 'Modern 테마로 전환' : 'Naruto Ninja 테마로 전환'}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md
                  border transition-all duration-200 text-xs font-semibold
                  ${isNaruto
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30'
                    : 'bg-black/45 border-white/12 text-zinc-400 hover:text-zinc-200 hover:border-white/20'}`}
    >
      <span className="text-sm">{isNaruto ? '🏠' : '🍥'}</span>
      <span className="hidden sm:inline">{isNaruto ? 'Modern' : 'Ninja'}</span>
    </motion.button>
  )
}

// ══════════════════════════════════════════════════════════
//  Overlay menu
// ══════════════════════════════════════════════════════════
function OverlayMenu({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const navigate         = useNavigate()
  const handleLogout     = () => { onClose(); logout(); navigate('/login') }

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
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <p className="text-xs text-zinc-500 tracking-widest uppercase">Menu</p>
                <p className="text-base font-bold mt-0.5">
                  <span className="text-zinc-100">HERO</span><span className="text-cyan-400">FIG</span>
                </p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           text-zinc-500 hover:text-zinc-200 hover:bg-white/8 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-white/5 border border-white/8 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30
                              flex items-center justify-center text-cyan-400 text-sm font-bold shrink-0">
                {(user?.nickname || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{user?.nickname || user?.email}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">{user?.provider === 'email' ? 'Email Account' : user?.provider}</p>
              </div>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              <p className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-2 mb-2">Pages</p>
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

            <div className="px-4 py-4 border-t border-white/8 space-y-2">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                           text-zinc-500 hover:text-red-400 hover:bg-red-500/8
                           transition-all duration-150 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Logout
              </button>
              <p className="text-center text-[10px] text-zinc-800 font-mono">v0.1.0</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ══════════════════════════════════════════════════════════
//  Figure list panel
// ══════════════════════════════════════════════════════════
function FigureListPanel({ figures, completedFigures, onSelect, selected, figureOffsets }) {
  const completed  = figures.filter((g) => (g.state ?? g.status) === 'completed')
  const inProgress = figures.filter((g) => ['queued', 'dreaming'].includes(g.state ?? g.status))

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🏠</span>
          <h2 className="text-sm font-bold text-zinc-100">Figure Collection</h2>
        </div>
        <p className="text-xs text-zinc-600">
          {completedFigures.length} / {PLAZA_SLOTS.length} on display
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {completed.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-1 pb-1">
              ✦ On Display ({completed.length})
            </p>
            {completed.map((fig) => {
              const figId      = fig.id ?? fig.generation_id
              const isSelected = (selected?.id ?? selected?.generation_id) === figId
              const offset     = figureOffsets[figId]
              const hasOffset  = offset && (offset.x !== 0 || offset.y !== 0 || offset.z !== 0)
              const slotIndex  = completedFigures.findIndex(
                (f) => (f.id ?? f.generation_id) === figId
              )
              const slotLabel = slotIndex >= 0 && slotIndex < PLAZA_SLOTS.length
                ? PLAZA_SLOTS[slotIndex].label : ''

              return (
                <button
                  key={figId}
                  onClick={() => onSelect(fig)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left
                              ${isSelected
                                ? 'bg-cyan-500/12 border-cyan-500/35'
                                : 'bg-white/4 border-white/8 hover:border-zinc-600'}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/8
                                  overflow-hidden shrink-0 flex items-center justify-center">
                    {fig.assets?.image
                      ? <img src={fig.assets.image} alt="thumb" className="w-full h-full object-cover" />
                      : <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {fig.prompt?.slice(0, 20) || `Figure #${figId.slice(0, 6)}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-zinc-600 font-mono">{slotLabel}</span>
                      {hasOffset && <span className="text-[9px] text-cyan-500">● Moved</span>}
                    </div>
                  </div>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                </button>
              )
            })}
          </>
        )}

        {inProgress.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-1 pt-2 pb-1">
              ⏳ In Production ({inProgress.length})
            </p>
            {inProgress.map((fig) => (
              <div key={fig.id ?? fig.generation_id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/4">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/8 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 truncate">{fig.prompt?.slice(0, 22) || 'Generating...'}</p>
                  <p className="text-[10px] text-zinc-700 mt-0.5">
                    {(fig.state ?? fig.status) === 'dreaming' ? '✦ AI Generating' : 'Queue'}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}

        {figures.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <p className="text-xs text-zinc-600">No figures yet</p>
            <p className="text-[11px] text-zinc-700">Create one in the 3D generation menu</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/8 shrink-0">
        <div className="bg-white/4 rounded-xl p-3 space-y-1 text-[11px] text-zinc-600">
          <p>🖱️ Click — select figure / drag to move</p>
          <p>🌐 Overview → orbit camera</p>
          <p>👤 Third / 👁 First → WASD + front exit to city</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Selected figure detail panel
// ══════════════════════════════════════════════════════════
function FigureDetailPanel({ figure, settings, onClose, onRotate, onToggleAutoRotate, onResetPosition }) {
  if (!figure) return null
  const figId     = figure.id ?? figure.generation_id
  const assets    = figure.assets ?? {}
  const rotDeg    = (((settings?.rotationY ?? 0) * 180) / Math.PI) % 360
  const autoRotate = settings?.autoRotate ?? false

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20
                 w-[420px] max-w-[calc(100vw-24px)]
                 bg-[#08081a]/92 backdrop-blur-xl
                 border border-cyan-500/15 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4 border-b border-white/8">
        <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/8
                        overflow-hidden shrink-0 flex items-center justify-center">
          {assets.image
            ? <img src={assets.image} alt="figure" className="w-full h-full object-cover" />
            : <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
          }
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-0.5">Figure</p>
          <h3 className="text-sm font-bold text-zinc-100 leading-snug line-clamp-2">
            {figure.prompt?.slice(0, 40) || 'Untitled Figure'}
          </h3>
          <p className="text-[10px] text-zinc-700 font-mono mt-0.5">{(figId || '').slice(0, 18)}…</p>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/8 transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">회전 (Rotation)</p>
          <div className="flex items-center gap-2">
            <button onClick={() => onRotate(figId, -Math.PI / 6)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                         bg-white/6 border border-white/10 text-zinc-300
                         hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all text-xs font-semibold">
              ← 30°
            </button>
            <div className="w-16 text-center text-xs font-mono text-zinc-500">{rotDeg.toFixed(0)}°</div>
            <button onClick={() => onRotate(figId, Math.PI / 6)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                         bg-white/6 border border-white/10 text-zinc-300
                         hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all text-xs font-semibold">
              30° →
            </button>
            <button onClick={() => onToggleAutoRotate(figId)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all
                          ${autoRotate
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-white/6 border-white/10 text-zinc-500 hover:text-zinc-300'}`}>
              ⟳ Auto
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => onResetPosition(figId)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                       bg-white/4 border border-white/8 text-zinc-500
                       hover:bg-white/8 hover:text-zinc-300 transition-all text-xs font-medium">
            ↩ Reset Position
          </button>
          {assets.model && (
            <a href={assets.model} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                         bg-cyan-500/12 border border-cyan-500/25 text-cyan-400
                         hover:bg-cyan-500/20 transition-all text-xs font-semibold">
              ↓ GLB Download
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
//  Bottom menu bar (matches reference image)
// ══════════════════════════════════════════════════════════
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconPalette() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0010 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.124a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}
function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}
function IconAvatar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  )
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function BottomMenuBar({ onSearch, onLayout, onVisuals, onMarketplace, onCollection, onAvatar, onLogout, activeItem }) {
  const items = [
    { id: 'search',      label: 'Search\nCollection',     Icon: IconSearch      },
    { id: 'layout',      label: 'Edit Showroom\nLayout',  Icon: IconGrid        },
    { id: 'visuals',     label: 'Customize\nVisuals',     Icon: IconPalette     },
    { id: 'marketplace', label: 'Marketplace /\nBuy & Sell', Icon: IconCart     },
    { id: 'collection',  label: 'My\nCollection',         Icon: IconBox         },
    { id: 'avatar',      label: 'Avatar',                 Icon: IconAvatar      },
    { id: 'logout',      label: 'Logout',                 Icon: IconLogout      },
  ]
  const handlers = { search: onSearch, layout: onLayout, visuals: onVisuals, marketplace: onMarketplace, collection: onCollection, avatar: onAvatar, logout: onLogout }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30
                    flex items-center
                    bg-[#0d0d12]/[0.97] backdrop-blur-xl
                    border border-white/[0.12]
                    rounded-[28px] px-2 py-2
                    shadow-2xl shadow-black/80
                    gap-0.5">
      {items.map(({ id, label, Icon }, idx) => {
        const isActive = activeItem === id
        const lines = label.split('\n')
        return (
          <button
            key={id}
            onClick={handlers[id]}
            className={`relative flex flex-col items-center justify-center gap-1
                        px-1 py-2 w-[50px]
                        rounded-[16px]
                        transition-all duration-150
                        ${isActive
                          ? 'bg-white/[0.12] text-white'
                          : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'}`}
          >
            <Icon />
            <span className="text-center leading-tight w-full" style={{ fontSize: '8px', fontWeight: 500, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>
              {lines.map((l, i) => <span key={i} className="block truncate">{l}</span>)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  Main page
// ══════════════════════════════════════════════════════════
export default function FigureRoomPage() {
  const { data: figures = [] } = useGenerationList()
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { toggleTheme } = useThemeStore()

  const { sendMessage } = useChat()

  const [selectedFigure, setSelectedFigure]   = useState(null)
  const [collectionOpen, setCollectionOpen]   = useState(false)
  const [furnitureOpen, setFurnitureOpen]     = useState(false)
  const [menuOpen, setMenuOpen]               = useState(false)
  const [figureOffsets, setFigureOffsets]     = useState({})
  const [figureSettings, setFigureSettings]   = useState({})
  const [cameraMode, setCameraMode]           = useState('overview')
  const [exiting, setExiting]                 = useState(false)
  const [activeMenu, setActiveMenu]           = useState(null)

  const completedFigures = useMemo(
    () => figures.filter((g) => (g.state ?? g.status) === 'completed'),
    [figures],
  )

  const focusTarget = useMemo(() => {
    if (!selectedFigure || cameraMode !== 'overview') return null
    const idx = completedFigures.findIndex(
      (f) => (f.id ?? f.generation_id) === (selectedFigure.id ?? selectedFigure.generation_id)
    )
    return idx >= 0 && idx < PLAZA_SLOTS.length ? PLAZA_SLOTS[idx].position : null
  }, [selectedFigure, completedFigures, cameraMode])

  const selectedFigureId = selectedFigure?.id ?? selectedFigure?.generation_id ?? null

  // Room exit → Virtual City fade transition
  const handleExitRoom = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => navigate('/city'), 380)
  }, [navigate, exiting])

  // V key / 1·2·3 keys → camera mode cycle
  useEffect(() => {
    const modes = ['overview', 'third', 'first']
    const onKey = (e) => {
      if (e.code === 'KeyV') {
        setCameraMode((m) => {
          const idx = modes.indexOf(m)
          return modes[(idx + 1) % modes.length]
        })
      }
      if (e.code === 'Digit1') setCameraMode('overview')
      if (e.code === 'Digit2') setCameraMode('third')
      if (e.code === 'Digit3') setCameraMode('first')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Deselect figure when camera mode changes
  useEffect(() => {
    if (cameraMode !== 'overview') setSelectedFigure(null)
  }, [cameraMode])

  const handleSelect = useCallback((fig) => {
    setSelectedFigure((prev) =>
      (prev?.id ?? prev?.generation_id) === (fig.id ?? fig.generation_id) ? null : fig
    )
  }, [])

  const handleDragEnd = useCallback((figId, newOffset) => {
    setFigureOffsets((prev) => ({ ...prev, [figId]: newOffset }))
  }, [])

  const handleRotate = useCallback((figId, delta) => {
    setFigureSettings((prev) => ({
      ...prev,
      [figId]: {
        ...(prev[figId] ?? { rotationY: 0, autoRotate: false }),
        rotationY: (prev[figId]?.rotationY ?? 0) + delta,
      },
    }))
  }, [])

  const handleToggleAutoRotate = useCallback((figId) => {
    setFigureSettings((prev) => ({
      ...prev,
      [figId]: {
        ...(prev[figId] ?? { rotationY: 0, autoRotate: false }),
        autoRotate: !(prev[figId]?.autoRotate ?? false),
      },
    }))
  }, [])

  const handleResetPosition = useCallback((figId) => {
    setFigureOffsets((prev) => ({ ...prev, [figId]: { x: 0, y: 0, z: 0 } }))
  }, [])

  const selectedSettings = selectedFigure
    ? (figureSettings[selectedFigure.id ?? selectedFigure.generation_id] ?? { rotationY: 0, autoRotate: false })
    : null

  const handleMenuAction = (id) => {
    setActiveMenu(prev => prev === id ? null : id)
    if (id === 'search')      { setCollectionOpen(v => !v); setFurnitureOpen(false) }
    if (id === 'layout')      { setFurnitureOpen(v => !v);  setCollectionOpen(false) }
    if (id === 'visuals')     { toggleTheme() }
    if (id === 'marketplace') { navigate('/dashboard') }
    if (id === 'collection')  { navigate('/generate3d') }
    if (id === 'avatar')      { setMenuOpen(true) }
    if (id === 'logout')      { logout().then(() => navigate('/login', { replace: true })) }
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">

      {/* ── 3D Scene ── */}
      <CityScene
        figures={completedFigures}
        onSelectFigure={handleSelect}
        focusTarget={focusTarget}
        figureOffsets={figureOffsets}
        figureSettings={figureSettings}
        onDragEnd={handleDragEnd}
        selectedFigureId={selectedFigureId}
        cameraMode={cameraMode}
        onExitRoom={handleExitRoom}
        className="w-full h-full"
      />

      {/* ── Bottom menu bar ── */}
      <BottomMenuBar
        activeItem={collectionOpen ? 'search' : furnitureOpen ? 'layout' : null}
        onSearch={()      => handleMenuAction('search')}
        onLayout={()      => handleMenuAction('layout')}
        onVisuals={()     => handleMenuAction('visuals')}
        onMarketplace={()  => handleMenuAction('marketplace')}
        onCollection={()  => handleMenuAction('collection')}
        onAvatar={()      => handleMenuAction('avatar')}
        onLogout={()      => handleMenuAction('logout')}
      />

      {/* ── Furniture panel (controlled by bottom bar) ── */}
      <FurnitureMenu externalOpen={furnitureOpen} onExternalToggle={setFurnitureOpen} />

      {/* ── Chat (bottom-left · Portal) ── */}
      <ChatBox sendMessage={sendMessage} />

      {/* ── Search Collection side panel ── */}
      <AnimatePresence>
        {collectionOpen && (
          <motion.aside key="collection"
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            className="absolute top-0 right-0 h-full w-72 z-10
                       bg-[#08081a]/92 backdrop-blur-xl border-l border-white/8">
            <FigureListPanel
              figures={figures}
              completedFigures={completedFigures}
              onSelect={handleSelect}
              selected={selectedFigure}
              figureOffsets={figureOffsets}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Selected figure detail panel ── */}
      <AnimatePresence>
        {selectedFigure && cameraMode === 'overview' && (
          <FigureDetailPanel
            figure={selectedFigure}
            settings={selectedSettings}
            onClose={() => setSelectedFigure(null)}
            onRotate={handleRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
            onResetPosition={handleResetPosition}
          />
        )}
      </AnimatePresence>

      {/* ── Avatar overlay menu ── */}
      <OverlayMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── City transition fade ── */}
      <AnimatePresence>
        {exiting && (
          <motion.div key="fade"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
