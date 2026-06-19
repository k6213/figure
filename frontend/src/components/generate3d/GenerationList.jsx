/**
 * GenerationList.jsx
 * Full list of Meshy AI 3D generation jobs.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationList, useDeleteGeneration } from '../../hooks/useMeshy'
import ResultModal from './ResultModal'
import toast from 'react-hot-toast'

// ── Status badge ─────────────────────────────────────────────────────────────────
const BADGE = {
  queued:    { label: 'Waiting',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  dreaming:  { label: 'Generating', cls: 'bg-brand-500/15 text-brand-400 border-brand-500/25' },
  completed: { label: 'Done',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  failed:    { label: 'Failed',    cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
}

function StatusBadge({ status }) {
  const b = BADGE[status] ?? BADGE.queued
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      text-[11px] font-semibold border ${b.cls}`}>
      {(status === 'queued' || status === 'dreaming') && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {b.label}
    </span>
  )
}


function MiniProgress({ progress, status }) {
  if (status === 'completed' || status === 'failed') return null
  return (
    <div className="space-y-0.5">
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-700"
          style={{ width: progress + '%' }}
        />
      </div>
      <span className="text-[10px] text-zinc-600 font-mono">{progress ?? 0}%</span>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Single card ─────────────────────────────────────────────────────────────────
function GenerationCard({ gen, onView, onDelete }) {
  const status   = gen.state ?? gen.status ?? 'queued'
  const assets   = gen.assets ?? {}
  const isClickable = status === 'completed' && (assets.model || assets.image)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`bg-ink border border-ink-line rounded-xl p-4 flex flex-col gap-3
                  transition-colors duration-150 group
                  ${isClickable ? 'hover:border-emerald-500/40 cursor-pointer' : ''}`}
      onClick={() => isClickable && onView(gen)}
    >
      {/* ── Top ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <StatusBadge status={status} />
          <p className="text-xs text-zinc-600 font-mono mt-1.5 truncate" title={gen.id}>
            {gen.id}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(gen.id) }}
          className="shrink-0 p-1.5 rounded-lg text-zinc-700 hover:text-red-400
                     hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* ── Progress bar (generating) ── */}
      <MiniProgress progress={gen.progress} status={status} />

      {/* ── Thumbnail (when completed) ── */}
      <AnimatePresence>
        {status === 'completed' && assets.image && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="relative overflow-hidden rounded-lg border border-ink-line"
          >
            <img
              src={assets.image}
              alt="Result thumbnail"
              className="w-full h-32 object-cover"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40
                            flex items-center justify-center transition-all duration-200">
              <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5
                               text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full
                               transition-opacity duration-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Result
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-700">{formatDate(gen.created_at)}</span>

        {isClickable && (
          <span className="text-xs text-emerald-500/70 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
              <path strokeLinecap="round" d="M18 9l3 3m0 0l-3 3m3-3H9" />
            </svg>
            Click to view
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-ink border border-ink-line rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-zinc-800 rounded-full" />
        <div className="h-5 w-5 bg-zinc-800 rounded-lg" />
      </div>
      <div className="h-3 w-48 bg-zinc-800 rounded" />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GenerationList() {
  const { data: list = [], isLoading, isError, refetch } = useGenerationList()
  const { mutateAsync: remove } = useDeleteGeneration()
  const [selectedGen, setSelectedGen] = useState(null)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job?')) return
    try {
      await remove(id)
      toast.success('Deleted.')
    } catch {
      toast.error('Failed to delete.')
    }
  }

  return (
    <>
      <div className="bg-ink-card border border-ink-line rounded-2xl p-6 space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              My 3D Generation List
              {list.filter(g => ['queued','dreaming'].includes(g.state ?? g.status)).length > 0 && (
                <span className="text-[11px] bg-brand-500/20 text-brand-400 border border-brand-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  {list.filter(g => ['queued','dreaming'].includes(g.state ?? g.status)).length} in progress
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">Click completed items to view results</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-zinc-600 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>

        {/* ── List ── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-400 text-center py-6">
            An error occurred while loading the list.
          </p>
        )}

        {!isLoading && !isError && list.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No generation jobs yet.</p>
            <p className="text-xs text-zinc-700">Upload a photo to create a 3D model!</p>
          </div>
        )}

        {!isLoading && !isError && list.length > 0 && (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {list.map((gen) => (
                <GenerationCard
                  key={gen.id}
                  gen={gen}
                  onView={setSelectedGen}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Result viewer modal ── */}
      <AnimatePresence>
        {selectedGen && (
          <ResultModal
            generation={{
              generation_id: selectedGen.id,
              assets: selectedGen.assets,
              prompt: selectedGen.prompt,
            }}
            onClose={() => setSelectedGen(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
