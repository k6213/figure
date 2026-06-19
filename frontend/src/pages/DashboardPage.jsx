import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useGenerationList } from '../hooks/useMeshy'

/* ── Stats card ─────────────────────────────────────────────────────────── */
function StatItem({ label, value, sub, color = 'text-zinc-100' }) {
  return (
    <div className="bg-ink-card border border-ink-line rounded-2xl p-5 flex flex-col gap-1">
      <span className="text-xs text-zinc-600 font-medium">{label}</span>
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
      {sub && <span className="text-[11px] text-zinc-700">{sub}</span>}
    </div>
  )
}

/* ── Recent job card ─────────────────────────────────────────────────────── */
const STATUS_META = {
  queued:    { label: 'Waiting',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  dreaming:  { label: 'Generating', cls: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
  completed: { label: 'Done',      cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  failed:    { label: 'Failed',    cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

function RecentCard({ gen }) {
  const status = gen.state ?? gen.status ?? 'queued'
  const meta   = STATUS_META[status] ?? STATUS_META.queued
  const thumb  = gen.assets?.image

  return (
    <div className="bg-ink border border-ink-line rounded-xl overflow-hidden flex gap-3 p-3 items-center">
      {/* Thumbnail */}
      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-ink-line flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt="thumbnail" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-6 h-6 text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 font-mono truncate">{gen.id}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
            {meta.label}
          </span>
          {(status === 'queued' || status === 'dreaming') && (
            <span className="text-[10px] text-zinc-600">{gen.progress ?? 0}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: generations = [], isLoading } = useGenerationList()

  const stats = useMemo(() => {
    const total     = generations.length
    const completed = generations.filter(g => (g.state ?? g.status) === 'completed').length
    const active    = generations.filter(g => ['queued', 'dreaming'].includes(g.state ?? g.status)).length
    return { total, completed, active }
  }, [generations])

  const recent = generations.slice(0, 6)

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">HeroFig Dashboard</h1>
          <p className="text-sm text-zinc-600 mt-0.5">
            Manage AI 3D model generation and virtual showroom
          </p>
        </div>
        <Link
          to="/generate3d"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400
                     text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New 3D Generation
        </Link>
      </motion.div>

      {/* ── KPIs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        <StatItem
          label="Total Generations"
          value={isLoading ? '…' : stats.total}
          sub="Cumulative 3D models"
        />
        <StatItem
          label="Completed"
          value={isLoading ? '…' : stats.completed}
          sub=".glb file ready"
          color="text-emerald-400"
        />
        <StatItem
          label="In Progress"
          value={isLoading ? '…' : stats.active}
          sub="AI processing"
          color={stats.active > 0 ? 'text-brand-400' : 'text-zinc-100'}
        />
      </motion.div>

      {/* ── Quick navigation ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* 3D generation */}
        <Link
          to="/generate3d"
          className="group bg-ink-card border border-ink-line hover:border-brand-500/40
                     rounded-2xl p-6 flex items-center gap-5 transition-all duration-200
                     hover:bg-brand-500/5"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30
                          flex items-center justify-center text-brand-400 text-xl shrink-0
                          group-hover:bg-brand-500/30 transition-colors">
            ✦
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
              Generate 3D Model
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Meshy AI generates a real .glb from a single photo
            </p>
          </div>
          <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 ml-auto shrink-0 transition-colors"
               fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        {/* Virtual showroom */}
        <Link
          to="/city"
          className="group bg-ink-card border border-ink-line hover:border-emerald-500/40
                     rounded-2xl p-6 flex items-center gap-5 transition-all duration-200
                     hover:bg-emerald-500/5"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30
                          flex items-center justify-center shrink-0 text-emerald-400
                          group-hover:bg-emerald-500/30 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
              Virtual Showroom
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">
              View your figure collection in the 3D city
            </p>
          </div>
          <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 ml-auto shrink-0 transition-colors"
               fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </motion.div>

      {/* ── Recent generation list ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-ink-card border border-ink-line rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Recent 3D Generations</h2>
          <Link to="/generate3d" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            View All →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-500 font-medium">No generation history yet</p>
              <p className="text-xs text-zinc-700 mt-1">Upload a figure photo to create your first 3D model</p>
            </div>
            <Link
              to="/generate3d"
              className="mt-1 px-4 py-2 rounded-xl bg-brand-500/20 border border-brand-500/30
                         text-brand-400 text-sm font-medium hover:bg-brand-500/30 transition-colors"
            >
              Start 3D Generation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recent.map((gen) => (
              <RecentCard key={gen.id} gen={gen} />
            ))}
          </div>
        )}
      </motion.div>

    </div>
  )
}
