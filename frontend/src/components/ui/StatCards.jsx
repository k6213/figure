import { motion } from 'framer-motion'

const fmt = (v) => v ? new Intl.NumberFormat('ko-KR').format(v) + '원' : '-'

const DEFS = [
  { key: 'total',    label: 'Total Listings', color: 'text-indigo-400',  bg: 'bg-indigo-500/10', sym: '⬡', format: (v) => `${v.toLocaleString()}` },
  { key: 'onSale',   label: 'For Sale',       color: 'text-emerald-400', bg: 'bg-emerald-500/10', sym: '●', format: (v) => `${v.toLocaleString()}` },
  { key: 'avgPrice', label: 'Avg. Price',     color: 'text-brand-400',   bg: 'bg-brand-500/10',   sym: '◈', format: fmt },
  { key: 'minPrice', label: 'Lowest Price',   color: 'text-sky-400',     bg: 'bg-sky-500/10',     sym: '▽', format: fmt },
  { key: 'honey',    label: 'Best Deals',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   sym: '✦', format: (v) => `${v}` },
]

export default function StatCards({ stats }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {DEFS.map((d, i) => (
        <motion.div
          key={d.key}
          className="card p-4 flex flex-col gap-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.28 }}
        >
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg ${d.bg} flex items-center justify-center text-xs ${d.color}`}>
              {d.sym}
            </span>
            <span className="text-xs text-zinc-600">{d.label}</span>
          </div>
          <p className={`text-xl font-bold font-mono ${d.color}`}>
            {d.format(stats[d.key] ?? 0)}
          </p>
        </motion.div>
      ))}
    </div>
  )
}
