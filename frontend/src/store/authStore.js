/**
 * authStore.js — Authentication state (Zustand + Supabase)
 *
 * Single source of truth: supabase.auth.onAuthStateChange
 * No password-based or backend-dependent flows remain.
 *
 * Auth paths supported:
 *   1. Google OAuth   → supabase.auth.signInWithOAuth  → onAuthStateChange
 *   2. Email OTP      → supabase.auth.signInWithOtp    → onAuthStateChange
 *   3. Magic Link     → supabase.auth.signInWithOtp    → onAuthStateChange
 *   4. Guest          → local anonymous session only
 *
 * Call useAuthStore.getState().init() ONCE at app startup (main.jsx).
 * The listener runs for the app's entire lifetime — no cleanup needed.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabaseClient'

function randomGuestName() {
  return `Guest_${Math.floor(1000 + Math.random() * 9000)}`
}

/** Normalise a Supabase user object into our app's user shape. */
function buildUser(supabaseUser) {
  return {
    id:         supabaseUser.id,
    email:      supabaseUser.email,
    nickname:   supabaseUser.user_metadata?.full_name
             || supabaseUser.user_metadata?.name
             || supabaseUser.email?.split('@')[0]
             || 'User',
    avatar_url: supabaseUser.user_metadata?.avatar_url ?? null,
    provider:   supabaseUser.app_metadata?.provider ?? 'email',
    isGuest:    false,
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,

      // ── Supabase auth listener ───────────────────────────────────────────────
      /**
       * Call once at app startup (main.jsx).
       *
       * Events handled:
       *   INITIAL_SESSION — restores an existing Supabase session on page load
       *   SIGNED_IN       — any successful sign-in (OAuth, OTP, magic link)
       *   TOKEN_REFRESHED — Supabase silently refreshed the access token
       *   USER_UPDATED    — profile metadata changed
       *   SIGNED_OUT      — explicit logout or token expiry
       *
       * Guest sessions are never touched by this listener because the
       * Supabase session will be null when a guest is active.
       */
      init: () => {
        supabase.auth.onAuthStateChange((event, session) => {
          console.log(`[Auth] event=${event} | user=${session?.user?.email ?? 'none'} | provider=${session?.user?.app_metadata?.provider ?? '-'}`)

          const isGuest = get().user?.isGuest

          // Never overwrite a local guest session with an empty Supabase state
          if (!session && isGuest) return

          if (session) {
            set({
              user:            buildUser(session.user),
              token:           session.access_token,
              isAuthenticated: true,
            })
          } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
            // INITIAL_SESSION with no session means Supabase has no active login.
            // Clear any stale token left from a previous auth system.
            set({ user: null, token: null, isAuthenticated: false })
          }
        })
      },

      // ── Guest / anonymous ────────────────────────────────────────────────────
      guestLogin: () => {
        set({
          user:            { nickname: randomGuestName(), provider: 'guest', isGuest: true },
          token:           null,
          isAuthenticated: true,
        })
      },

      // ── Logout ───────────────────────────────────────────────────────────────
      logout: async () => {
        if (!get().user?.isGuest) {
          // Tell Supabase to invalidate the session server-side.
          // onAuthStateChange will fire SIGNED_OUT and clear state automatically.
          await supabase.auth.signOut()
        } else {
          // Guest: just clear local state
          set({ user: null, token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'hf-auth',
      partialize: (s) => ({
        user:            s.user,
        token:           s.token,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
