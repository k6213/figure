/**
 * WorkspaceView.jsx
 * Central viewer area:
 *  - Empty: guidance screen
 *  - Waiting/generating: circular progress gauge
 *  - Completed: ModelEditor (interactive 3D editing)
 *  - Failed: error guidance
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useGenerationStatus } from '../../hooks/useMeshy'
import ModelEditor from './ModelEditor'

/* ── Circular progress gauge ──────────────────────────────────────────────────── */
function CircleProgress({ progress, status }) {
  const r    = 54
  const circ = 2 * Math.PI * r
  const off  = circ - (progress / 100) * circ
  const color = status === 'completed' ? '#10b981'
              : status === 'failed'    ? '#f87171'
              :                          '#818cf8'
  const isActive = status === 'queued' || status === 'dreaming'

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {status === 'completed' ? (
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : status === 'failed' ? (
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <span className="text-2xl font-bold font-mono text-zinc-100">{progress}</span>
            <span className="text-xs text-zinc-500">%</span>
          </>
        )}
      </div>
      {isActive && (
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20 animate-ping" />
      )}
    </div>
  )
}

/* ── Status meta ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  queued:   { label: 'Waiting',         sub: 'Waiting to be processed in the Meshy AI queue...', color: 'text-amber-400'  },
  dreaming: { label: 'Generating 3D',   sub: 'Meshy AI is analyzing the image and generating a 3D mesh...', color: 'text-brand-400'  },
  failed:   { label: 'Generation Failed', sub: 'An error occurred. Please try again with a different image.', color: 'text-red-400'    },
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function WorkspaceView({ generationId }) {
  const { data, isLoading } = useGenerationStatus(generationId)

  /* ── Empty state ── */
  if (!generationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-24 h-24 rounded-3xl bg-zinc-800/60 border border-zinc-700/50
                     flex items-center justify-center"
        >
          <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        </motion.div>
        <div>
          <h3 className="text-base font-semibold text-zinc-400">3D Editor</h3>
          <p className="text-sm text-zinc-600 mt-1 max-w-xs">
            Upload an image on the left<br />to edit the 3D model in real time here
          </p>
        </div>
        <div className="flex items-center gap-3 text-zinc-800 w-full max-w-xs">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs shrink-0">or select previous work on the right</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-36 h-36 rounded-full bg-zinc-800/50 animate-pulse" />
      </div>
    )
  }

  const status   = data?.status ?? 'queued'
  const progress = data?.progress ?? 0
  const assets   = data?.assets
  const modelUrl = assets?.model   // .glb URL

  /* ── Completed + GLB available → ModelEditor fullscreen ── */
  if (status === 'completed' && modelUrl) {
    return (
      <motion.div
        key="editor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full p-3"
      >
        <ModelEditor
          src={modelUrl}
          filename={`herofig-${generationId.slice(0, 8)}`}
        />
      </motion.div>
    )
  }

  /* ── Completed but GLB not yet available (texture processing) ── */
  if (status === 'completed' && !modelUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <svg className="w-8 h-8 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm text-zinc-500">Preparing file... Please wait</p>
      </div>
    )
  }

  /* ── In progress / failed ── */
  const meta = STATUS_META[status] ?? STATUS_META.queued

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 p-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex flex-col items-center gap-6"
        >
          <CircleProgress progress={progress} status={status} />
          <div className="text-center">
            <p className={`text-lg font-bold ${meta.color}`}>{meta.label}</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs">{meta.sub}</p>
          </div>
          {/* ID badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span className="text-[11px] text-zinc-600 font-mono">{generationId}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {status === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-red-400/80 bg-red-500/5
                     border border-red-500/10 px-5 py-3 rounded-xl max-w-sm"
        >
          Try again with a different image or a clearer photo.
        </motion.div>
      )}
    </div>
  )
}
