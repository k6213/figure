/**
 * i18n/index.js — react-i18next configuration
 *
 * Language detection order:
 *   1. localStorage  (user-chosen preference persists across sessions)
 *   2. navigator     (browser language)
 *   3. htmlTag       (html lang attribute)
 *
 * Supported locales: en (default), ko
 * If browser reports any variant of 'ko' (ko, ko-KR, ko-KP …)  → Korean
 * Otherwise → English
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import ko from './locales/ko.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },

    // Fall back to English if browser language is not Korean
    fallbackLng: 'en',

    // Detection configuration
    detection: {
      // Persist the user's explicit choice in localStorage
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'hf-lang',
      caches: ['localStorage'],
    },

    // 'ko' is the only non-English we support; anything else → 'en'
    supportedLngs: ['en', 'ko'],
    nonExplicitSupportedLngs: true,   // 'ko-KR' → 'ko'
    load: 'languageOnly',             // strip region codes

    interpolation: {
      escapeValue: false,             // React handles XSS
    },

    react: {
      useSuspense: false,             // avoid Suspense wrapper requirement
    },
  })

export default i18n
