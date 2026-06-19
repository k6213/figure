/**
 * LanguageSwitcher.jsx
 * Compact EN / KO toggle button — persists choice to localStorage via i18next.
 */
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const isKo = i18n.language?.startsWith('ko')

  const toggle = () => i18n.changeLanguage(isKo ? 'en' : 'ko')

  return (
    <button
      onClick={toggle}
      title={isKo ? 'Switch to English' : '한국어로 전환'}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg
                  border border-white/12 bg-black/30 backdrop-blur-sm
                  text-xs font-bold tracking-widest transition-all duration-150
                  hover:bg-white/10 hover:border-white/25 select-none
                  ${isKo ? 'text-cyan-300' : 'text-zinc-300'} ${className}`}
    >
      <span className={isKo ? 'opacity-40' : 'opacity-100'}>EN</span>
      <span className="text-white/20">|</span>
      <span className={isKo ? 'opacity-100' : 'opacity-40'}>KO</span>
    </button>
  )
}
