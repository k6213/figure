/**
 * Generate3DPage.jsx
 * Meshy AI style workspace layout
 *
 * Structure:
 *  - Top header bar (title + status badge)
 *  - 3-column layout:
 *    Left  (320px): upload panel + options
 *    Center(flex) : current job viewer / status
 *    Right (280px): history panel
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import UploadPanel    from '../components/generate3d/UploadPanel'
import WorkspaceView  from '../components/generate3d/WorkspaceView'
import HistoryPanel   from '../components/generate3d/HistoryPanel'

export default function Generate3DPage() {
  // Current active generation_id
  const [activeId, setActiveId] = useState(null)
  // Item selected from history
  const [selectedGen, setSelectedGen] = useState(null)

  const viewId = selectedGen?.id ?? activeId

  return (
    <div className="flex flex-col -m-6 overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Top header bar ── */}
      <div className="flex items-center justify-between px-6 py-3
                      border-b border-ink-line bg-ink shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30
                          flex items-center justify-center text-brand-400 text-sm">✦</div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100">3D Workspace</h1>
            <p className="text-[11px] text-zinc-600 hidden sm:block">
              Meshy AI · Image to 3D · .glb 출력
            </p>
          </div>
        </div>

        {/* Active job badge */}
        <AnimatePresence>
          {activeId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-brand-500/15 border border-brand-500/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-xs text-brand-400 font-medium">Generating</span>
              <button
                onClick={() => { setActiveId(null); setSelectedGen(null) }}
                className="text-brand-400/50 hover:text-brand-400 transition-colors ml-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Workspace body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: upload panel ── */}
        <div className="w-[320px] shrink-0 border-r border-ink-line bg-ink overflow-y-auto
                        hidden lg:block">
          <UploadPanel
            onStarted={(id) => {
              setActiveId(id)
              setSelectedGen(null)
            }}
          />
        </div>

        {/* ── Center: viewer / status ── */}
        <div className="flex-1 overflow-y-auto bg-ink-card">
          <WorkspaceView generationId={viewId} />
        </div>

        {/* ── Right: history panel ── */}
        <div className="w-[280px] shrink-0 border-l border-ink-line bg-ink overflow-y-auto
                        hidden xl:block">
          <HistoryPanel
            activeId={activeId}
            selectedId={selectedGen?.id}
            onSelect={(gen) => {
              setSelectedGen(gen)
            }}
          />
        </div>
      </div>

      {/* ── Mobile: bottom tab ── */}
      <div className="lg:hidden border-t border-ink-line bg-ink px-4 py-3 shrink-0">
        <div className="max-w-lg mx-auto">
          <UploadPanel
            compact
            onStarted={(id) => {
              setActiveId(id)
              setSelectedGen(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}
