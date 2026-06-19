import { memo } from 'react'
import clsx from 'clsx'

const SORT_OPTS = [
  { v: 'latest',     l: 'Latest'       },
  { v: 'price_asc',  l: 'Price: Low'   },
  { v: 'price_desc', l: 'Price: High'  },
  { v: 'honey',      l: 'Best Deals'   },
]

const PLATFORM_OPTS = [
  { v: '',        l: 'All'       },
  { v: 'bunjang', l: 'Bunjang'   },
  { v: 'joongna', l: 'Joongna'   },
  { v: 'daangn',  l: 'Daangn'    },
]

function Seg({ opts, value, onChange }) {
  return (
    <div className="flex bg-ink rounded-lg p-0.5 gap-0.5 flex-wrap">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={clsx(
            'seg-btn',
            value === o.v ? 'seg-btn-active' : 'seg-btn-idle'
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

const FilterBar = memo(function FilterBar({ characters = [], filters, onChange }) {
  return (
    <div className="card p-3 flex flex-wrap items-center gap-3">

      {/* Character select */}
      <select
        value={filters.character}
        onChange={(e) => onChange('character', e.target.value)}
        className="bg-ink-hover border border-ink-line rounded-lg px-3 py-1.5
                   text-xs text-zinc-200 focus:outline-none focus:border-brand-500/60
                   transition-all duration-150 cursor-pointer min-w-[130px]"
      >
        <option value="">All Characters</option>
        {characters.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>

      {/* Platform */}
      <Seg opts={PLATFORM_OPTS} value={filters.platform} onChange={(v) => onChange('platform', v)} />

      {/* Divider */}
      <div className="h-5 w-px bg-ink-line hidden sm:block" />

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-600 hidden sm:block">Sort</span>
        <Seg opts={SORT_OPTS} value={filters.sort} onChange={(v) => onChange('sort', v)} />
      </div>
    </div>
  )
})

export default FilterBar
