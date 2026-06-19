import {
  ComposedChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'

/* ── Custom tooltip ─────────────────────────────────────────────────────── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const fmt = (v) => v != null ? new Intl.NumberFormat('ko-KR').format(v) + '원' : '-'
  return (
    <div className="bg-ink-card border border-ink-line rounded-xl p-3 shadow-xl shadow-black/50 text-xs min-w-[170px]">
      <p className="text-zinc-500 mb-2 font-mono">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
            <span className="text-zinc-500">{e.name}</span>
          </div>
          <span className="font-mono font-medium text-zinc-100">
            {e.dataKey === 'listing_count' ? `${e.value}건` : fmt(e.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Custom legend ────────────────────────────────────────────────────── */
function Lgd({ payload }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-1.5">
      {payload?.map((e) => (
        <div key={e.dataKey} className="flex items-center gap-1.5 text-xs text-zinc-600">
          <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: e.color }} />
          {e.value}
        </div>
      ))}
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────── */
function Skel() {
  return (
    <div className="card p-6 space-y-4">
      <div className="h-4 w-44 shimmer rounded" />
      <div className="h-80 shimmer rounded-xl" />
    </div>
  )
}

/* ── Main chart ───────────────────────────────────────────────────────── */
export default function FigureChart({ data = [], loading, character }) {
  if (loading) return <Skel />
  if (!data.length) {
    return (
      <div className="card p-16 text-center">
        <p className="text-4xl mb-3 opacity-30">📊</p>
        <p className="text-zinc-400 font-medium">No chart data</p>
        <p className="text-zinc-600 text-sm mt-1">Data will appear once it accumulates</p>
      </div>
    )
  }

  const avgPrice = Math.round(
    data.reduce((s, d) => s + (d.avg_price || 0), 0) /
    (data.filter((d) => d.avg_price).length || 1)
  )

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

      {/* Price trend chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              {character || 'All'} Daily Price Trend
            </h2>
            <p className="text-xs text-zinc-600 mt-0.5">Avg · Min · Max price and moving averages</p>
          </div>
          {avgPrice > 0 && (
            <div className="text-right">
              <p className="text-xs text-zinc-600">Period Avg.</p>
              <p className="font-mono text-sm font-bold text-brand-400">
                {new Intl.NumberFormat('ko-KR').format(avgPrice)}원
              </p>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#e8175d" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#e8175d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={{ stroke: '#2a2a38' }}
              tickFormatter={(v) => v?.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={false} width={44}
            />
            <Tooltip content={<Tip />} />
            <Legend content={<Lgd />} />
            {/* Price range band */}
            <Area dataKey="price_band" name="Price Range" fill="#6366f1" stroke="none" fillOpacity={0.08} connectNulls dot={false} activeDot={false} />
            {/* Average price */}
            <Area dataKey="avg_price" name="Avg. Price" fill="url(#ga)" stroke="#e8175d" strokeWidth={2} fillOpacity={1} connectNulls dot={false}
              activeDot={{ r: 4, fill: '#e8175d', stroke: '#17171e', strokeWidth: 2 }} />
            {/* Moving averages */}
            <Line dataKey="ma_30" name="30d MA" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
            <Line dataKey="ma_7"  name="7d MA"  stroke="#34d399" strokeWidth={1.5} strokeDasharray="3 3" dot={false} connectNulls />
            {/* Reference line */}
            {avgPrice > 0 && <ReferenceLine y={avgPrice} stroke="#e8175d" strokeDasharray="6 3" strokeOpacity={0.35} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Daily listing count bar chart */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-zinc-200 mb-4">Daily New Listings</h2>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false}
              axisLine={{ stroke: '#2a2a38' }} tickFormatter={(v) => v?.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="listing_count" name="Listings" fill="url(#gb)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Line dataKey="active_count" name="For Sale" stroke="#34d399" strokeWidth={1.5} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </motion.div>
  )
}
