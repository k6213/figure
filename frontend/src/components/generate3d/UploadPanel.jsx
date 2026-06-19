/**
 * UploadPanel.jsx
 * Left sidebar: image upload + start generation
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUploadAndStart } from '../../hooks/useMeshy'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TIPS = [
  { ok: true,  text: 'Place against a white background' },
  { ok: true,  text: 'Shoot straight-on at eye level' },
  { ok: true,  text: 'Bright lighting, no shadows' },
  { ok: false, text: 'Complex background reduces quality' },
]

export default function UploadPanel({ onStarted, compact = false }) {
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)
  const { mutateAsync, isPending }  = useUploadAndStart()

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Only JPEG · PNG · WebP are supported.')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('Only files up to 20MB can be uploaded.')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Please select an image first.'); return }
    try {
      const result = await mutateAsync({ file })
      toast.success('3D generation started!')
      onStarted?.(result.generation_id)
      setFile(null)
      setPreview(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start generation.')
    }
  }

  return (
    <div className={clsx('flex flex-col', compact ? 'gap-3' : 'gap-0')}>

      {/* ── Section header ── */}
      {!compact && (
        <div className="px-5 py-4 border-b border-ink-line">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Image Upload
          </h2>
        </div>
      )}

      <form onSubmit={handleSubmit} className={clsx('flex flex-col gap-4', compact ? '' : 'p-5')}>

        {/* ── Drop zone ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200',
            'flex flex-col items-center justify-center overflow-hidden',
            compact ? 'min-h-[120px]' : 'min-h-[200px]',
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-ink-line hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full relative"
              >
                <img
                  src={preview}
                  alt="Preview"
                  className={clsx('w-full object-contain', compact ? 'h-28' : 'h-48')}
                />
                <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                  <span className="text-[10px] bg-black/70 text-zinc-300 px-2 py-0.5 rounded-md truncate max-w-[70%]">
                    {file?.name}
                  </span>
                  <span className="text-[10px] bg-black/70 text-zinc-400 px-2 py-0.5 rounded-md">
                    {(file?.size / 1024 / 1024).toFixed(1)}MB
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 p-6 text-center"
              >
                <div className={clsx(
                  'rounded-full bg-zinc-800 flex items-center justify-center',
                  compact ? 'w-10 h-10' : 'w-14 h-14'
                )}>
                  <svg className={clsx('text-zinc-500', compact ? 'w-5 h-5' : 'w-7 h-7')}
                       fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    {isDragging ? 'Drop here' : 'Click or drag'}
                  </p>
                  {!compact && (
                    <p className="text-[11px] text-zinc-600 mt-0.5">JPEG · PNG · WebP · 최대 20MB</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Generate button ── */}
        <motion.button
          type="submit"
          disabled={!file || isPending}
          whileTap={{ scale: 0.97 }}
          className={clsx(
            'w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
            file && !isPending
              ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed',
          )}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>✦</span> Start 3D Generation
            </span>
          )}
        </motion.button>
      </form>

      {/* ── Shooting tips ── */}
      {!compact && (
        <div className="mx-5 mb-5 rounded-xl border border-ink-line bg-zinc-900/50 p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3 h-3 text-brand-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Shooting Tips
          </p>
          <div className="space-y-1.5">
            {TIPS.map(({ ok, text }) => (
              <div key={text} className="flex items-center gap-2">
                <span className={clsx(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                )}>
                  {ok ? '✓' : '✗'}
                </span>
                <span className={clsx('text-[11px]', ok ? 'text-zinc-400' : 'text-zinc-600')}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Meshy AI info ── */}
      {!compact && (
        <div className="mx-5 mb-5 flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-emerald-500/8 border border-emerald-500/15 text-[11px] text-emerald-500/70">
          <span className="shrink-0">✦</span>
          <span>Meshy AI meshy-6 · PBR texture · .glb output · typically 1~3 min</span>
        </div>
      )}
    </div>
  )
}
