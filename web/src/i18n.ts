import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  he: {
    translation: {
      appTitle: 'הכסף שלי',
      settings: 'הגדרות',
      transactions: 'תנועות',
      stats: 'סטטיסטיקות',
      login: 'התחברות',
      logout: 'התנתקות',
      connectCta: 'חיבור בנק/כרטיס',
      connectDesc: 'התחבר לבנקים וחברות אשראי כדי למשוך תנועות אוטומטית.',
      refresh: 'רענון',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
  });

export default i18n;
