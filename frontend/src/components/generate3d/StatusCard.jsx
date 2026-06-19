/**
 * StatusCard.jsx
 * Card that displays Meshy AI generation job status in real time.
 * Receives actual progress (0~100%) from the server and reflects it in the progress bar.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStatus } from '../../hooks/useMeshy'
import ResultModal from './ResultModal'

const STATUS_META = {
  queued: {
    label: 'Waiting',
    color: 'text-amber-400',
    bg:    'bg-amber-500/10 border-amber-500/20',
    defaultProgress: 5,
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
  },
  dreaming: {
    label: 'Generating 3D',
    color: 'text-brand-400',
    bg:    'bg-brand-500/10 border-brand-500/20',
    defaultProgress: 30,
    icon: (
      <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  completed: {
    label: 'Done',
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10 border-emerald-500/20',
    defaultProgress: 100,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    bg:    'bg-red-500/10 border-red-500/20',
    defaultProgress: 100,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
}

function ProgressBar({ status, progress }) {
  const isComplete = status === 'completed'
  const isFailed   = status === 'failed'
  const isActive   = !isComplete && !isFailed

  return (
    <div className="space-y-1.5">
      <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isFailed   ? 'bg-red-500' :
            isComplete ? 'bg-emerald-500' :
                         'bg-gradient-to-r from-brand-500 to-brand-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[11px]">
        <span className={isActive ? 'text-zinc-500 animate-pulse' : 'text-zinc-600'}>
          {isComplete ? 'Model generation complete' : isFailed ? 'Generation failed' : 'Meshy AI processing...'}
        </span>
        <span className={`font-mono font-semibold ${
          isComplete ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-brand-400'
        }`}>
          {progress}%
        </span>
      </div>
    </div>
  )
}

export default function StatusCard({ generationId }) {
  const { data, isLoading, isError } = useGenerationStatus(generationId)
  const [showModal, setShowModal] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-ink-card border border-ink-line rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-2 bg-zinc-800 rounded-full" />
        <div className="flex justify-between mt-1.5">
          <div className="h-3 w-16 bg-zinc-800 rounded" />
          <div className="h-3 w-8 bg-zinc-800 rounded" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-ink-card border border-red-500/20 rounded-2xl p-5 text-sm text-red-400">
        An error occurred while fetching status.
      </div>
    )
  }

  const status   = data?.status ?? 'queued'
  const meta     = STATUS_META[status] ?? STATUS_META.queued
  const assets   = data?.assets
  // Use Meshy actual progress (0~100) first; fallback to status default value
  const progress = data?.progress ?? meta.defaultProgress

  return (
    <motion.div layout className={`border rounded-2xl p-5 space-y-4 ${meta.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-sm font-semibold ${meta.color}`}>
          {meta.icon}
          {meta.label}
        </div>
        <span className="text-[10px] text-zinc-700 font-mono truncate max-w-[150px]">
          {generationId?.slice(0, 8)}...
        </span>
      </div>

      {/* Actual progress % progress bar */}
      <ProgressBar status={status} progress={progress} />

      {/* Result button when completed */}
      <AnimatePresence>
        {status === 'completed' && assets && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Thumbnail preview */}
            {assets.image && (
              <img
                src={assets.image}
                alt="3D thumbnail"
                className="w-full h-36 object-contain rounded-lg border border-emerald-500/20 mb-3 bg-black/30"
              />
            )}
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                         bg-emerald-500/10 border border-emerald-500/20
                         text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              View / Download 3D Model
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ResultModal
            generation={{ generation_id: generationId, assets }}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Failure message */}
      {status === 'failed' && (
        <p className="text-xs text-red-400/80 bg-red-500/5 px-3 py-2 rounded-lg">
          Generation failed. Please try again.
        </p>
      )}
    </motion.div>
  )
}
