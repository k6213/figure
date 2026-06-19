import { memo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

/* ── Config table ─────────────────────────────────────────────────────── */
const PLATFORM = {
  bunjang: { label: 'Bunjang',  cls: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  joongna: { label: 'Joongna',  cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
  daangn:  { label: 'Daangn',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
}

const CONDITION = {
  '미개봉':   'bg-brand-500/15 text-brand-400 border-brand-500/20',
  '새상품':   'bg-brand-500/15 text-brand-400 border-brand-500/20',
  '박스없음': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  '박스훼손': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  '이물질':   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  '오염':     'bg-orange-500/15 text-orange-400 border-orange-500/20',
  '변색':     'bg-orange-600/15 text-orange-500 border-orange-600/20',
  '파손':     'bg-red-500/15 text-red-400 border-red-500/20',
  '결함':     'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS = {
  on_sale:  { label: 'For Sale',  dot: 'bg-emerald-400', text: 'text-emerald-400' },
  reserved: { label: 'Reserved',  dot: 'bg-yellow-400',  text: 'text-yellow-400'  },
  sold:     { label: 'Sold',      dot: 'bg-zinc-600',    text: 'text-zinc-600'    },
}

/* ── Utils ─────────────────────────────────────────────────────────────── */
const fmtPrice = (p) => p ? new Intl.NumberFormat('ko-KR').format(p) + '원' : 'Price not listed'
const fmtDate  = (s) => {
  if (!s) return ''
  const d   = new Date(s), now = new Date()
  const dH  = Math.floor((now - d) / 3_600_000)
  const dD  = Math.floor((now - d) / 86_400_000)
  if (dH < 1)  return 'Just now'
  if (dH < 24) return `${dH}h ago`
  if (dD < 7)  return `${dD}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const honeyTier = (s) => s >= 50 ? '★★★' : s >= 30 ? '★★' : '★'

/* ── Component ─────────────────────────────────────────────────────────── */
const FigureCard = memo(function FigureCard({ item }) {
  const plt    = PLATFORM[item.platform] || { label: item.platform, cls: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' }
  const status = STATUS[item.status] || STATUS.on_sale
  const isSold = item.status === 'sold'

  return (
    <motion.a
      href={item.page_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('card card-hover flex flex-col overflow-hidden group cursor-pointer', isSold && 'opacity-55')}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      {/* 이미지 */}
      <div className="relative aspect-square bg-ink overflow-hidden">

        {/* Best deal badge */}
        {item.is_honey_deal && item.honey_score >= 15 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="badge bg-brand-500 text-white text-[10px] font-bold shadow-lg shadow-brand-500/40">
              Best Deal {honeyTier(item.honey_score)}
            </span>
          </div>
        )}

        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-ink-hover">
            <span className="text-5xl opacity-10">◈</span>
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="font-display text-3xl text-zinc-400 tracking-[0.2em]">SOLD</span>
          </div>
        )}

        {/* Platform badge */}
        <div className="absolute top-2 right-2">
          <span className={clsx('badge border text-[10px]', plt.cls)}>{plt.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">

        {/* Product name */}
        <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {item.name}
        </h3>

        {/* Condition tags */}
        {item.condition_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.condition_tags.map((tag) => (
              <span
                key={tag}
                className={clsx('badge border text-[10px]', CONDITION[tag] || 'bg-zinc-600/20 text-zinc-400 border-zinc-600/20')}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price + status + date */}
        <div className="mt-auto pt-2 border-t border-ink-line flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-bold text-zinc-100 font-mono leading-tight">
              {fmtPrice(item.price)}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={clsx('w-1.5 h-1.5 rounded-full', status.dot)} />
              <span className={clsx('text-xs', status.text)}>{status.label}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-700 shrink-0">{fmtDate(item.crawled_at)}</p>
        </div>

        {/* Character name */}
        {item.character_name && (
          <p className="text-[11px] text-zinc-700 truncate">{item.character_name}</p>
        )}
      </div>
    </motion.a>
  )
})

export default FigureCard
