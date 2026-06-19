/**
 * ResultModal.jsx
 * Fullscreen modal shown when a completed job is clicked in the history panel.
 * - .glb file → ModelEditor (interactive 3D + color edit + export)
 * - Image only → image viewer
 */
import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ModelEditor from './ModelEditor'

export default function ResultModal({ generation, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleOverlay = useCallback((e) => {
    if (e.target === overlayRef.current) onClose?.()
  }, [onClose])

  if (!generation) return null

  const assets      = generation.assets ?? {}
  const generationId = generation.generation_id ?? generation.id ?? ''
  const modelUrl    = assets.model
  const imageUrl    = assets.image
  const hasModel    = Boolean(modelUrl)

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        onClick={handleOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4
                   bg-black/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-5xl bg-ink-card border border-ink-line rounded-2xl
                     shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '88vh' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5
                          border-b border-ink-line shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30
                               flex items-center justify-center text-emerald-400 text-sm">✦</span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">3D Editor</h3>
                <p className="text-[11px] text-zinc-600 font-mono mt-0.5 truncate max-w-[300px]">
                  {generationId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-600 hover:text-zinc-200
                         hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-hidden p-3">
            {hasModel ? (
              <ModelEditor
                src={modelUrl}
                filename={`herofig-${generationId.slice(0, 8)}`}
              />
            ) : imageUrl ? (
              <div className="h-full flex items-center justify-center bg-zinc-950 rounded-xl">
                <img
                  src={imageUrl}
                  alt="Result Image"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                Preview cannot be displayed.
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-3 border-t border-ink-line flex items-center
                          justify-between shrink-0">
            <p className="text-xs text-zinc-600">
              Drag: Rotate &nbsp;·&nbsp; Scroll: Zoom &nbsp;·&nbsp; Right-click: Pan
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-zinc-500
                         hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Close (ESC)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
