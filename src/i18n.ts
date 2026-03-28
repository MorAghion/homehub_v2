import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enSettings from './locales/en/settings.json'
import heCommon from './locales/he/common.json'
import heSettings from './locales/he/settings.json'

void i18n.use(initReactI18next).init({
  lng: localStorage.getItem('homehub-language') ?? 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      common: enCommon,
      settings: enSettings,
    },
    he: {
      common: heCommon,
      settings: heSettings,
    },
  },
  ns: ['common', 'settings'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

/** Apply RTL/LTR direction and lang attribute to <html>. */
function applyDir(lng: string) {
  const isRtl = lng === 'he'
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
}

applyDir(i18n.language)

i18n.on('languageChanged', (lng) => {
  applyDir(lng)
  localStorage.setItem('homehub-language', lng)
})

export default i18n
