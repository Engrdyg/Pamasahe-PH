import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import fil from './fil.json'
import { getPref } from '../lib/prefs'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fil: { translation: fil } },
  lng: getPref('lang', 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
