import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "en" | "zh";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, zh?: string) => string;
  isTranslating: boolean;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

// Cache dictionaries across language switches so the UI keeps the last
// known translations while a new language is loading. This avoids a brief
// flash of English when switching from zh -> en (or vice versa).
const dictionaryCache = new Map<Lang, Record<string, string>>();

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("helstare-lang");
    return saved === "en" || saved === "zh" ? saved : "zh";
  });
  const [dictionary, setDictionary] = useState<Record<string, string>>(
    () => dictionaryCache.get(lang) ?? {},
  );
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem("helstare-lang", lang);

    if (dictionaryCache.has(lang)) {
      setDictionary(dictionaryCache.get(lang) ?? {});
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);
    let cancelled = false;
    fetch(`/locales/${lang}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Locale file not found");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        dictionaryCache.set(lang, data);
        setDictionary(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(
          "Failed to load external locale dict, falling back to inline translations:",
          err,
        );
        setDictionary({});
      })
      .finally(() => {
        if (!cancelled) setIsTranslating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const t = useMemo(() => {
    return (en: string, zh?: string) => {
      if (lang === "en") return dictionary[en] || en;
      if (lang === "zh") return dictionary[en] || zh || en;
      return en;
    };
  }, [dictionary, lang]);

  const value = useMemo<LangContextType>(
    () => ({ lang, setLang, t, isTranslating }),
    [lang, t, isTranslating],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
};
