import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink } from 'react-router-dom'

/* ── Sidebar ─────────────────────────────────────────────────────────── */
function Sidebar({ open }) {
  return (
    <motion.aside
      animate={{ width: open ? 220 : 56 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-full bg-ink-card border-r border-ink-line
                 flex flex-col z-40 overflow-hidden shrink-0"
    >
      <div className="h-16 flex items-center px-4 border-b border-ink-line shrink-0">
        <span className="font-display text-2xl tracking-widest">
          {open ? <><span className="text-zinc-100">HERO</span><span className="text-brand-500">FIG</span></> : <span className="text-brand-500">H</span>}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
             overflow-hidden whitespace-nowrap transition-all duration-150
             ${isActive ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-ink-hover'}`
          }
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
          </svg>
          <AnimatePresence>
            {open && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                Dashboard
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {/* Figure Room */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
             overflow-hidden whitespace-nowrap transition-all duration-150
             ${isActive ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-ink-hover'}`
          }
        >
          {/* City icon */}
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
          <AnimatePresence>
            {open && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                Figure Room
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {/* 3D Generate */}
        <NavLink
          to="/generate3d"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
             overflow-hidden whitespace-nowrap transition-all duration-150
             ${isActive ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-zinc-500 hover:text-zinc-200 hover:bg-ink-hover'}`
          }
        >
          {/* Cube icon */}
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          <AnimatePresence>
            {open && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                3D Generate
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </nav>
      {open && <p className="p-4 text-xs text-zinc-800 font-mono border-t border-ink-line">v0.1.0</p>}
    </motion.aside>
  )
}


/* ── Header ──────────────────────────────────────────────────────────── */
function Header({ onToggle }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-ink-card border-b border-ink-line flex items-center justify-between px-5 shrink-0 sticky top-0 z-30">
      <button onClick={onToggle} className="btn-ghost p-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      </button>
      <div className="flex items-center gap-3">
        <div className="w-px h-5 bg-ink-line hidden sm:block" />

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-zinc-200">{user?.nickname || user?.email}</p>
          <p className="text-xs text-zinc-600">{user?.provider === 'email' ? 'Email' : user?.provider}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30
                        flex items-center justify-center text-brand-400 text-sm font-semibold">
          {(user?.nickname || user?.email || 'U')[0].toUpperCase()}
        </div>
        <button onClick={() => { logout(); navigate('/login') }} className="btn-ghost text-xs text-zinc-600">
          Logout
        </button>
      </div>
    </header>
  )
}

/* ── Layout ──────────────────────────────────────────────────────────── */
export default function Layout() {
  const [open, setOpen] = useState(true)
  return (
    <div className="min-h-screen bg-ink flex">
      <Sidebar open={open} />
      <div className={`flex-1 flex flex-col transition-all duration-[220ms] ${open ? 'ml-[220px]' : 'ml-14'}`}>
        <Header onToggle={() => setOpen((v) => !v)} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
