/**
 * UploadSection.jsx
 * Image drag & drop / file select → upload + start Meshy AI 3D model generation
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUploadAndStart } from '../../hooks/useMeshy'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function UploadSection({ onStarted }) {
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const inputRef = useRef(null)
  const { mutateAsync, isPending } = useUploadAndStart()

  // ── File selection handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((selected) => {
    if (!selected) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(selected.type)) {
      toast.error('Only JPEG, PNG, WebP files can be uploaded.')
      return
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error('Only files up to 20MB can be uploaded.')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }, [])

  // ── Drag and drop ──────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Please select an image first.'); return }

    try {
      const result = await mutateAsync({ file })
      toast.success('3D model generation started! (typically 1~3 min)')
      onStarted?.(result.generation_id)
      setFile(null)
      setPreview(null)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start generation.'
      toast.error(msg)
    }
  }

  return (
    <div className="bg-ink-card border border-ink-line rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30
                         flex items-center justify-center text-brand-400 text-sm">
          ✦
        </span>
        Generate 3D Model
      </h2>

      {/* Meshy AI info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
        <span>✦</span>
        <span>Meshy AI — generate a real 3D model (.glb) from 1 photo · typically 1~3 min</span>
      </div>

      {/* Shooting tips */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          For better 3D results
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            ['✓', 'Place against white wall/paper'],
            ['✓', 'Shoot straight-on at eye level'],
            ['✓', 'Bright environment, no shadows'],
            ['✗', 'Complex background reduces quality'],
          ].map(([icon, text]) => (
            <span key={text} className={`text-[11px] flex items-center gap-1 ${icon === '✓' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span className={icon === '✓' ? 'text-emerald-500' : 'text-red-500'}>{icon}</span>
              {text}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Drag and drop area ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200',
            'flex flex-col items-center justify-center min-h-[200px] overflow-hidden',
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-ink-line hover:border-zinc-600 bg-ink hover:bg-ink-hover',
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-full"
              >
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-contain"
                />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg">
                  {file?.name} · {(file?.size / 1024 / 1024).toFixed(1)}MB
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 p-8 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                  <svg className="w-7 h-7 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Click or drag an image
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">JPEG, PNG, WebP · 최대 20MB</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* ── Submit button ── */}
        <motion.button
          type="submit"
          disabled={!file || isPending}
          whileTap={{ scale: 0.97 }}
          className={clsx(
            'w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
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
            '✦ Start 3D Generation'
          )}
        </motion.button>
      </form>
    </div>
  )
}
