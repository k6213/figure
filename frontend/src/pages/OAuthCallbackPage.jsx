/**
 * OAuthCallbackPage.jsx
 *
 * Handles the Supabase OAuth return for Google sign-in.
 * Supabase encodes the session in the URL hash:
 *   /oauth/callback#access_token=xxx&token_type=bearer&...
 * The Supabase JS client reads the hash automatically via getSession().
 *
 * The authStore.init() listener (set up in main.jsx) fires SIGNED_IN and
 * writes the user to Zustand, so we just need to navigate after confirming.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function handle() {
      console.log('[OAuthCallback] URL:', window.location.href)

      const { data: { session }, error } = await supabase.auth.getSession()

      console.log('[OAuthCallback] session:', session ? `✅ ${session.user.email}` : '❌ null')
      if (error) console.error('[OAuthCallback] error:', error.message)

      if (cancelled) return

      if (session) {
        navigate('/', { replace: true })
        return
      }

      toast.error('Sign-in failed. Please try again.')
      navigate('/login', { replace: true })
    }

    handle()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500
                        rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
