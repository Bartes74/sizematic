'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'pl' | 'en';

type Messages = {
  [key: string]: any;
};

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pl');
  const [messages, setMessages] = useState<Messages>({});

  // Load messages when locale changes
  useEffect(() => {
    async function loadMessages() {
      const msgs = await import(`../../messages/${locale}.json`);
      setMessages(msgs.default);
    }
    loadMessages();
  }, [locale]);

  // Load locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale;
    if (stored && (stored === 'pl' || stored === 'en')) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  // Simple translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
