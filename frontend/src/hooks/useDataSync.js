/**
 * useDataSync.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to the backend SSE stream (/api/v1/listings/stream) and
 * automatically invalidates the React Query cache whenever the crawler updates JSON.
 *
 * Returns:
 *   lastUpdate : Date | null  — timestamp of the last update
 *   syncing    : boolean      — flash flag immediately after an update (for UI indicator)
 *   total      : number | null — current total listing count from the server
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const RECONNECT_DELAY_MS = 5_000   // reconnect delay (5 seconds)
const SYNCING_FLASH_MS   = 2_000   // syncing flag duration

export function useDataSync() {
  const qc         = useQueryClient()
  const token      = useAuthStore((s) => s.token)
  const esRef      = useRef(null)
  const timerRef   = useRef(null)

  const [lastUpdate, setLastUpdate] = useState(null)
  const [syncing,    setSyncing]    = useState(false)
  const [total,      setTotal]      = useState(null)

  /** Invalidate all React Query caches → refetch on next render */
  const invalidateAll = useCallback((payload) => {
    qc.invalidateQueries({ queryKey: ['listings'] })
    qc.invalidateQueries({ queryKey: ['chart']    })
    qc.invalidateQueries({ queryKey: ['chars']    })

    setLastUpdate(new Date())
    setTotal(payload?.total ?? null)

    // Turn syncing flag ON for 2 seconds (for header indicator animation)
    setSyncing(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSyncing(false), SYNCING_FLASH_MS)

    // Toast notification
    const cnt = payload?.total != null ? ` (total ${payload.total.toLocaleString()} listings)` : ''
    toast.success(`New listings updated${cnt}`, {
      icon:     '🔄',
      duration: 3_500,
      style: {
        background: '#17171e',
        color:      '#f4f4f5',
        border:     '1px solid #4f46e5',
        borderRadius: '10px',
        fontSize:   '14px',
      },
    })
  }, [qc])

  useEffect(() => {
    if (!token) return

    let destroyed = false

    function connect() {
      if (destroyed) return

      const url = `/api/v1/listings/stream?token=${encodeURIComponent(token)}`
      const es  = new EventSource(url)
      esRef.current = es

      // Connection confirmed
      es.addEventListener('connected', () => {
        // Silently confirm connection (no UI notification)
      })

      // Update event
      es.addEventListener('update', (e) => {
        try {
          const payload = JSON.parse(e.data)
          invalidateAll(payload)
        } catch {
          invalidateAll(null)
        }
      })

      // Error → auto reconnect
      es.onerror = () => {
        es.close()
        if (!destroyed) {
          setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      esRef.current?.close()
      clearTimeout(timerRef.current)
    }
  }, [token, invalidateAll])

  return { lastUpdate, syncing, total }
}
