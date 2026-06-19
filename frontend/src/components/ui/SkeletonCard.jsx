export default function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square shimmer" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3.5 shimmer rounded w-full" />
        <div className="h-3.5 shimmer rounded w-3/4" />
        <div className="flex gap-1.5 pt-0.5">
          <div className="h-4 w-12 shimmer rounded" />
          <div className="h-4 w-10 shimmer rounded" />
        </div>
        <div className="h-px bg-ink-line my-0.5" />
        <div className="flex justify-between items-end">
          <div className="h-5 w-24 shimmer rounded" />
          <div className="h-3 w-12 shimmer rounded" />
        </div>
      </div>
    </div>
  )
}
