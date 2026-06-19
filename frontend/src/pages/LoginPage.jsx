/**
 * LoginPage.jsx
 *
 * Auth flows:
 *   1. Google OAuth  — supabase.auth.signInWithOAuth → /oauth/callback
 *   2. Email OTP     — supabase.auth.signInWithOtp  → 6-digit code boxes
 *                      supabase.auth.verifyOtp      → session via onAuthStateChange
 *
 * Steps:
 *   'entry'  — Google button + email input
 *   'otp'    — 6-digit code verification + resend countdown
 *   'done'   — brief success flash before redirect
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

const REDIRECT_TO  = `${window.location.origin}/oauth/callback`
const OTP_LENGTH   = 6
const RESEND_DELAY = 60

const slideIn = { opacity: 0, x: 24 }
const slideOut = { opacity: 0, x: -24 }
const visible  = { opacity: 1, x: 0 }
const spring   = { type: 'spring', stiffness: 340, damping: 28 }

// ── OTP digit-box input ───────────────────────────────────────────────────────

function OtpBoxes({ value, onChange, disabled }) {
  const boxRefs = Array.from({ length: OTP_LENGTH }, () => useRef(null)) // eslint-disable-line react-hooks/rules-of-hooks
  const digits  = value.padEnd(OTP_LENGTH, '').split('')

  const handleChange = useCallback((idx, e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      const next = [...digits]; next[idx] = ''
      onChange(next.join('').trimEnd())
      return
    }
    const next = [...digits]; next[idx] = raw[raw.length - 1]
    onChange(next.join(''))
    if (idx < OTP_LENGTH - 1) boxRefs[idx + 1].current?.focus()
  }, [digits, onChange, boxRefs])

  const handleKeyDown = useCallback((idx, e) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const next = [...digits]; next[idx - 1] = ''
        onChange(next.join('').trimEnd())
        boxRefs[idx - 1].current?.focus()
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      boxRefs[idx - 1].current?.focus()
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      boxRefs[idx + 1].current?.focus()
    }
  }, [digits, onChange, boxRefs])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    boxRefs[focusIdx].current?.focus()
  }, [onChange, boxRefs])

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={boxRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          className={[
            'w-11 text-center text-xl font-bold rounded-xl border',
            'bg-ink-card text-zinc-100 transition-all duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            digits[i]
              ? 'border-brand-500 ring-brand-500/30'
              : 'border-white/10 focus:border-brand-500 focus:ring-brand-500/25',
          ].join(' ')}
          style={{ height: '3.25rem' }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

// ── Resend countdown ──────────────────────────────────────────────────────────

function useResendTimer() {
  const [secs, setSecs] = useState(RESEND_DELAY)
  const timerRef = useRef(null)

  const start = useCallback(() => {
    setSecs(RESEND_DELAY)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0 }
        return s - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => clearInterval(timerRef.current), [])

  return { secs, start, canResend: secs === 0 }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  )
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate()
  const { t }    = useTranslation()
  const { guestLogin, isAuthenticated } = useAuthStore()

  const [step,  setStep]  = useState('entry')
  const [email, setEmail] = useState('')
  const [otp,   setOtp]   = useState('')
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const { secs, start: startTimer, canResend } = useResendTimer()

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const clearErr = () => setError('')

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); clearErr()
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
      })
      if (err) throw err
      setOtp('')
      setStep('otp')
      startTimer()
      toast.success(t('login.otpSent'))
    } catch (err) {
      setError(err.message || t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e?.preventDefault()
    if (otp.length < OTP_LENGTH) return
    setBusy(true); clearErr()
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type:  'email',
      })
      if (err) throw err
      setStep('done')
      // onAuthStateChange in authStore fires → isAuthenticated → navigate via effect
    } catch (err) {
      setError(err.message || t('login.otpInvalid'))
      setOtp('')
    } finally {
      setBusy(false)
    }
  }

  // Auto-submit on last digit
  useEffect(() => {
    if (step === 'otp' && otp.length === OTP_LENGTH && !busy) {
      handleVerify()
    }
  }, [otp]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend || busy) return
    setBusy(true); clearErr()
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: REDIRECT_TO, shouldCreateUser: true },
      })
      if (err) throw err
      setOtp('')
      startTimer()
      toast.success(t('login.otpResent'))
    } catch (err) {
      setError(err.message || t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!anonKey || anonKey === 'your_supabase_anon_key_here') {
      toast.error('VITE_SUPABASE_ANON_KEY is not configured.')
      return
    }
    setBusy(true); clearErr()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_TO,
        queryParams: { access_type: 'online', prompt: 'select_account' },
      },
    })
    if (err) { toast.error(err.message); setBusy(false) }
  }

  // ── Guest ─────────────────────────────────────────────────────────────────
  const handleGuest = () => { guestLogin(); navigate('/city') }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4 relative">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2
                        w-[480px] h-[480px] bg-brand-500/6 rounded-full blur-[130px]" />
      </div>

      <div className="absolute top-5 right-5 z-10">
        <LanguageSwitcher />
      </div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-6xl tracking-widest">
            HERO<span className="text-brand-500">FIG</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{t('login.subtitle')}</p>
        </div>

        <div className="card p-6 shadow-2xl shadow-black/60 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>

            {/* ── entry ──────────────────────────────────────────────────── */}
            {step === 'entry' && (
              <motion.div key="entry"
                initial={slideIn} animate={visible} exit={slideOut}
                transition={spring} className="space-y-5">

                <button
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                             font-medium text-sm bg-white text-[#3c4043]
                             border border-[#dadce0] hover:bg-[#f5f5f5]
                             transition-all duration-150 active:scale-[0.98]
                             disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span className="flex-1 text-left">{t('login.continueGoogle')}</span>
                  {busy && <Spinner />}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-ink-line" />
                  <span className="text-xs text-zinc-600">{t('login.or')}</span>
                  <div className="flex-1 h-px bg-ink-line" />
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400 font-medium">
                      {t('login.email')}
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearErr() }}
                      required
                      autoComplete="email"
                      disabled={busy}
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20
                                  rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                  >
                    {busy ? <Spinner /> : <><MailIcon />{t('login.sendCode')}</>}
                  </button>
                </form>

                <div className="pt-1 border-t border-white/6">
                  <button
                    onClick={handleGuest}
                    className="w-full flex flex-col items-center gap-0.5 px-4 py-3
                               rounded-xl border border-dashed border-zinc-700
                               hover:border-zinc-500 text-zinc-400 hover:text-zinc-200
                               transition-all duration-150 hover:bg-white/4 active:scale-[0.98]"
                  >
                    <span className="text-sm font-semibold">👤 {t('login.guestBtn')}</span>
                    <span className="text-[11px] text-zinc-600">{t('login.guestDesc')}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── otp ────────────────────────────────────────────────────── */}
            {step === 'otp' && (
              <motion.div key="otp"
                initial={slideIn} animate={visible} exit={slideOut}
                transition={spring} className="space-y-5">

                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/15
                                  flex items-center justify-center mb-3">
                    <MailIcon />
                  </div>
                  <p className="font-semibold text-zinc-100">{t('login.checkEmail')}</p>
                  <p className="text-xs text-zinc-400">
                    {t('login.otpSentTo')}{' '}
                    <span className="text-zinc-200 font-medium">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <OtpBoxes value={otp} onChange={setOtp} disabled={busy} />

                  {error && (
                    <p className="text-xs text-center text-red-400 bg-red-400/10
                                  border border-red-400/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy || otp.length < OTP_LENGTH}
                    className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                  >
                    {busy ? <Spinner /> : t('login.verify')}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-1 border-t border-white/6">
                  <button
                    onClick={() => { setStep('entry'); setOtp(''); clearErr() }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    ← {t('login.changeEmail')}
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={!canResend || busy}
                    className="text-xs transition-colors disabled:cursor-not-allowed
                               disabled:text-zinc-600 enabled:text-brand-400
                               enabled:hover:text-brand-300"
                  >
                    {canResend ? t('login.resend') : t('login.resendIn', { secs })}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── done ───────────────────────────────────────────────────── */}
            {step === 'done' && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                className="py-6 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-500/15
                                flex items-center justify-center">
                  <svg className="w-7 h-7 text-brand-500" fill="none"
                       stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <p className="text-zinc-100 font-semibold">{t('login.verified')}</p>
                <p className="text-xs text-zinc-500">{t('login.redirecting')}</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-zinc-700 mt-4">
          {t('login.terms')}{' '}
          <span className="text-zinc-500 underline underline-offset-2 cursor-pointer">
            {t('login.termsLink')}
          </span>
        </p>
      </motion.div>
    </div>
  )
}
