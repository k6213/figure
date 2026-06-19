/**
 * FurnitureMenu.jsx
 * Furniture add UI panel (2D overlay)
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { FURNITURE_CATALOG, CATEGORIES } from '../../data/furnitureData'
import { useRoomStore }                  from '../../store/roomStore'
import { rotationTargetMap }             from './furnitureRotationMap'
import { clampToRoom }                   from './roomBounds'

// ── SVG icon set (1.5px stroke, consistent sizing) ─────────────────────────────
function IconSofa({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10V7a2 2 0 012-2h14a2 2 0 012 2v3" />
      <path d="M1 10h2a2 2 0 012 2v1H1v-3zM19 10h2v3h-4v-1a2 2 0 012-2z" />
      <rect x="5" y="12" width="14" height="5" rx="1" />
      <path d="M5 17v2M19 17v2" />
    </svg>
  )
}
function IconX({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
function IconRotateCw({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-3.2-6.8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}
function IconTrash({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

// Category key → SVG icon
function CatIcon({ catKey, className = 'w-3.5 h-3.5' }) {
  if (catKey === 'storage') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="7" rx="1.5" />
      <rect x="2" y="14" width="20" height="7" rx="1.5" />
      <path d="M6 6.5h.01M6 17.5h.01" />
    </svg>
  )
  if (catKey === 'furniture') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V7a2 2 0 012-2h12a2 2 0 012 2v2" />
      <path d="M2 11a2 2 0 012-2h16a2 2 0 012 2v2H2v-2z" />
      <path d="M4 13v3M20 13v3M4 16h16" />
    </svg>
  )
  if (catKey === 'lighting') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  )
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.47L19.5 9l-4.25 4.15 1.27 6.02L12 16.3l-4.52 2.87 1.27-6.02L4.5 9l5.62-.53z" />
    </svg>
  )
}

// ── Category tab (dark segmented-control style) ───────────────────────────────
function CategoryTab({ cat, active, onClick }) {
  return (
    <button
      onClick={() => onClick(cat.key)}
      className={`relative flex-1 flex flex-col items-center justify-center gap-[5px]
                  h-[52px] rounded-[10px] overflow-hidden
                  text-[9px] font-semibold tracking-[0.07em] uppercase
                  transition-colors duration-150
                  ${active ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
    >
      {/* Sliding active background */}
      {active && (
        <motion.div
          layoutId="cat-active-bg"
          className="absolute inset-0 rounded-[10px]
                     bg-zinc-800
                     border border-white/[0.09]
                     shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_8px_rgba(0,0,0,0.4)]"
          transition={{ type: 'spring', stiffness: 440, damping: 36 }}
        />
      )}
      <CatIcon
        catKey={cat.key}
        className={`relative w-[15px] h-[15px] shrink-0 transition-colors
                    ${active ? 'text-zinc-100' : 'text-zinc-600'}`}
      />
      <span className="relative leading-none truncate w-full text-center px-0.5">
        {cat.label}
      </span>
    </button>
  )
}

// ── Furniture card ─────────────────────────────────────────────────────────────────
function FurnitureCard({ furniture, onAdd }) {
  return (
    <button
      onClick={() => onAdd(furniture)}
      className="flex flex-col items-center justify-start gap-2 px-1.5 py-3 rounded-xl
                 border border-white/[0.06] bg-white/[0.025]
                 hover:bg-white/[0.07] hover:border-cyan-500/[0.18]
                 transition-all duration-150 text-center group active:scale-[0.94]
                 min-h-[76px]"
    >
      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08]
                      flex items-center justify-center text-[18px] leading-none shrink-0
                      group-hover:border-cyan-500/[0.18] group-hover:bg-white/[0.07]
                      transition-all duration-150">
        {furniture.icon}
      </div>
      <span className="text-[9.5px] font-medium text-zinc-400 group-hover:text-zinc-200
                       leading-tight transition-colors line-clamp-2 w-full">
        {furniture.name}
      </span>
    </button>
  )
}

// ── Selected furniture control panel ──────────────────────────────────────────
function SelectedControls() {
  const { selectedId, placedItems, removeItem, deselect } = useRoomStore()

  if (!selectedId) return null

  const item = placedItems.find(i => i.instanceId === selectedId)
  if (!item) return null

  const handleRotate = () => {
    const cur    = rotationTargetMap.get(selectedId) ?? 0
    const newRot = cur + Math.PI / 2
    rotationTargetMap.set(selectedId, newRot)
    const [px, py, pz] = item.position
    const { x: cx, z: cz } = clampToRoom(px, pz, item.dimensions, newRot)
    const { updateTransform } = useRoomStore.getState()
    updateTransform(selectedId, [cx, py, cz], [0, newRot, 0])
  }

  return (
    <motion.div
      key="ctrl"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{  opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="px-3 pb-3"
    >
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
        {/* Item row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.06]">
          <span className="text-base leading-none shrink-0">{item.icon}</span>
          <span className="flex-1 text-[11px] font-medium text-zinc-200 truncate">{item.name}</span>
          <button
            onClick={deselect}
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0
                       text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-all"
          >
            <IconX className="w-3 h-3" />
          </button>
        </div>

        <div className="p-2.5 space-y-2">
          {/* Hints */}
          <p className="text-[9px] text-zinc-600 leading-relaxed">
            Drag to move ·{' '}
            <kbd className="font-mono bg-white/8 px-1 py-0.5 rounded text-zinc-500">R</kbd>{' '}
            rotate ·{' '}
            <kbd className="font-mono bg-white/8 px-1 py-0.5 rounded text-zinc-500">Del</kbd>{' '}
            delete
          </p>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleRotate}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium
                         bg-white/[0.04] border border-white/[0.08] text-zinc-400
                         hover:bg-cyan-500/10 hover:border-cyan-500/25 hover:text-cyan-300
                         transition-all duration-150"
            >
              <IconRotateCw className="w-3 h-3" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => removeItem(selectedId)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium
                         bg-red-500/[0.06] border border-red-500/15 text-red-500/80
                         hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400
                         transition-all duration-150"
            >
              <IconTrash className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function FurnitureMenu() {
  const [open, setOpen]         = useState(false)
  const [activeCategory, setActiveCat] = useState('storage')

  const { addItem, removeItem, placedItems } = useRoomStore()

  const catItems = FURNITURE_CATALOG[activeCategory] ?? []

  return (
    <>
      {/* FAB toggle */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-6 right-6 z-30
                   w-11 h-11 rounded-2xl backdrop-blur-xl
                   border flex items-center justify-center
                   shadow-xl transition-all duration-200
                   ${open
                     ? 'bg-white/10 border-white/20 text-zinc-200 shadow-black/40'
                     : 'bg-[#06060f]/80 border-white/[0.09] text-zinc-400 hover:text-zinc-200 hover:border-white/15 shadow-black/50'}`}
        title="Add furniture"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'close' : 'sofa'}
            initial={{ opacity: 0, rotate: open ? -45 : 45, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{   opacity: 0, rotate: open ? 45 : -45, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <IconX className="w-4 h-4" /> : <IconSofa className="w-4 h-4" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{   opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="absolute bottom-[4.5rem] right-6 z-30
                       w-72 max-h-[72vh] flex flex-col
                       bg-[#06060f]/92 backdrop-blur-2xl
                       border border-white/[0.07]
                       rounded-2xl shadow-2xl shadow-black/60
                       ring-1 ring-inset ring-white/[0.03]
                       overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/[0.12] border border-cyan-500/[0.18]
                                flex items-center justify-center">
                  <IconSofa className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-[11px] font-semibold text-zinc-200 tracking-wide">Furniture</p>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono tabular-nums
                               bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {placedItems.length} placed
              </span>
            </div>

            {/* ── Category tabs — dark segmented control ── */}
            <div className="grid grid-cols-4 gap-0.5 mx-3 mt-3 mb-1
                            p-[3px] rounded-xl
                            bg-black/60 border border-white/[0.05]">
              {CATEGORIES.map(cat => (
                <CategoryTab
                  key={cat.key}
                  cat={cat}
                  active={activeCategory === cat.key}
                  onClick={setActiveCat}
                />
              ))}
            </div>

            {/* ── Furniture grid ── */}
            <div className="overflow-y-auto flex-1 px-3 py-2.5
                            [&::-webkit-scrollbar]:w-[3px]
                            [&::-webkit-scrollbar-track]:bg-transparent
                            [&::-webkit-scrollbar-thumb]:bg-white/[0.08]
                            [&::-webkit-scrollbar-thumb]:rounded-full
                            [&::-webkit-scrollbar-thumb:hover]:bg-white/[0.16]">
              {catItems.length > 0
                ? (
                  <div className="grid grid-cols-3 gap-1.5 items-stretch">
                    {catItems.map(furniture => (
                      <FurnitureCard
                        key={furniture.id}
                        furniture={furniture}
                        onAdd={addItem}
                      />
                    ))}
                  </div>
                )
                : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <span className="text-2xl opacity-30">📦</span>
                    <p className="text-[10px] text-zinc-600">No items in this category</p>
                  </div>
                )}
            </div>

            {/* ── Selected controls ── */}
            <AnimatePresence>
              <SelectedControls />
            </AnimatePresence>

            {/* ── Placed items list ── */}
            {placedItems.length > 0 && (
              <div className="border-t border-white/[0.07] mt-0">
                {/* Section label row */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                  <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.12em]">
                    Placed
                  </span>
                  <span className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[9px] font-mono text-zinc-700 tabular-nums">
                    {placedItems.length}
                  </span>
                </div>
                {/* Item rows */}
                <div className="flex flex-col max-h-[116px] overflow-y-auto px-3 pb-3
                                [&::-webkit-scrollbar]:w-[3px]
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:bg-white/[0.07]
                                [&::-webkit-scrollbar-thumb]:rounded-full
                                [&::-webkit-scrollbar-thumb:hover]:bg-white/[0.14]">
                  {placedItems.map(item => (
                    <div
                      key={item.instanceId}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg
                                 hover:bg-white/[0.04] transition-colors group cursor-default"
                    >
                      <span className="text-sm leading-none shrink-0 w-5 text-center">
                        {item.icon}
                      </span>
                      <span className="flex-1 text-[10.5px] text-zinc-400 truncate">
                        {item.name}
                      </span>
                      <button
                        onClick={() => removeItem(item.instanceId)}
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0
                                   text-zinc-700 hover:text-red-400 hover:bg-red-500/[0.10]
                                   transition-all opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
