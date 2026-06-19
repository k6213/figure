/**
 * HistoryPanel.jsx
 * Right sidebar: generation history list
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationList, useDeleteGeneration } from '../../hooks/useMeshy'
import ResultModal from './ResultModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_META = {
  queued:    { label: 'Waiting',    dot: 'bg-amber-400',   text: 'text-amber-400'   },
  dreaming:  { label: 'Generating', dot: 'bg-brand-400',   text: 'text-brand-400'   },
  completed: { label: 'Done',       dot: 'bg-emerald-400', text: 'text-emerald-400' },
  failed:    { label: 'Failed',     dot: 'bg-red-400',     text: 'text-red-400'     },
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function HistoryItem({ gen, isActive, isSelected, onSelect, onDelete }) {
  const status = gen.state ?? gen.status ?? 'queued'
  const meta   = STATUS_META[status] ?? STATUS_META.queued
  const thumb  = gen.assets?.image

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      onClick={() => onSelect(gen)}
      className={clsx(
        'group relative flex flex-col gap-2 p-3 rounded-xl border cursor-pointer',
        'transition-all duration-150',
        isSelected
          ? 'border-brand-500/50 bg-brand-500/10'
          : isActive
            ? 'border-brand-500/30 bg-brand-500/5'
            : 'border-ink-line hover:border-zinc-700 bg-ink hover:bg-ink-hover',
      )}
    >
      {/* Top: status + delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={clsx(
            'w-1.5 h-1.5 rounded-full shrink-0',
            meta.dot,
            (status === 'queued' || status === 'dreaming') && 'animate-pulse'
          )} />
          <span className={clsx('text-[11px] font-semibold', meta.text)}>{meta.label}</span>
          {isActive && (
            <span className="text-[10px] text-brand-400/60 ml-0.5">← Current</span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(gen.id) }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-700
                     hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Thumbnail (when completed) */}
      {status === 'completed' && thumb && (
        <div className="rounded-lg overflow-hidden border border-ink-line h-20">
          <img src={thumb} alt="thumbnail" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Progress bar */}
      {(status === 'queued' || status === 'dreaming') && (
        <div className="space-y-0.5">
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-700"
              style={{ width: `${gen.progress ?? 0}%` }}
            />
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">{gen.progress ?? 0}%</span>
        </div>
      )}

      {/* ID + date */}
      <div className="flex items-end justify-between gap-1">
        <span className="text-[10px] text-zinc-700 font-mono truncate max-w-[100px]">
          {gen.id?.slice(0, 12)}…
        </span>
        <span className="text-[10px] text-zinc-700 shrink-0">{fmtDate(gen.created_at)}</span>
      </div>
    </motion.div>
  )
}

export default function HistoryPanel({ activeId, selectedId, onSelect }) {
  const { data: list = [], isLoading, isError, refetch } = useGenerationList()
  const { mutateAsync: remove } = useDeleteGeneration()
  const [modalGen, setModalGen] = useState(null)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job?')) return
    try {
      await remove(id)
      toast.success('Deleted.')
    } catch {
      toast.error('Failed to delete.')
    }
  }

  const handleSelect = (gen) => {
    const status = gen.state ?? gen.status ?? 'queued'
    if (status === 'completed' && gen.assets) {
      setModalGen(gen)
    }
    onSelect?.(gen)
  }

  const active  = list.filter(g => ['queued', 'dreaming'].includes(g.state ?? g.status)).length

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-ink-line flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              History
            </h2>
            {active > 0 && (
              <span className="text-[10px] text-brand-400 mt-0.5 block animate-pulse">
                {active} generating
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300
                       hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-xs text-red-400 text-center py-6">
              Load failed
            </p>
          )}

          {!isLoading && !isError && list.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <svg className="w-8 h-8 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <p className="text-xs text-zinc-600">No history yet</p>
            </div>
          )}

          <AnimatePresence>
            {list.map((gen) => (
              <HistoryItem
                key={gen.id}
                gen={gen}
                isActive={gen.id === activeId}
                isSelected={gen.id === selectedId}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {modalGen && (
          <ResultModal
            generation={{
              generation_id: modalGen.id,
              assets: modalGen.assets,
            }}
            onClose={() => setModalGen(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
