import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enSettings from './locales/en/settings.json'
import enAuth from './locales/en/auth.json'
import enTasks from './locales/en/tasks.json'
import enHome from './locales/en/home.json'
import enShopping from './locales/en/shopping.json'
import enVouchers from './locales/en/vouchers.json'
import enReservations from './locales/en/reservations.json'
import heCommon from './locales/he/common.json'
import heSettings from './locales/he/settings.json'
import heAuth from './locales/he/auth.json'
import heTasks from './locales/he/tasks.json'
import heHome from './locales/he/home.json'
import heShopping from './locales/he/shopping.json'
import heVouchers from './locales/he/vouchers.json'
import heReservations from './locales/he/reservations.json'

void i18n.use(initReactI18next).init({
  lng: localStorage.getItem('homehub-language') ?? 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      common: enCommon,
      settings: enSettings,
      auth: enAuth,
      tasks: enTasks,
      home: enHome,
      shopping: enShopping,
      vouchers: enVouchers,
      reservations: enReservations,
    },
    he: {
      common: heCommon,
      settings: heSettings,
      auth: heAuth,
      tasks: heTasks,
      home: heHome,
      shopping: heShopping,
      vouchers: heVouchers,
      reservations: heReservations,
    },
  },
  ns: ['common', 'settings', 'auth', 'tasks', 'home', 'shopping', 'vouchers', 'reservations'],
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
