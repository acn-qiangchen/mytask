import React, { createContext, useState } from 'react';
import type { Lang, Translations } from '../i18n/translations';
import { translations } from '../i18n/translations';

const STORAGE_KEY = 'mytask_lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

export const LangContext = createContext<LangContextValue | null>(null);

function loadLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'ja' ? 'ja' : 'en';
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}
