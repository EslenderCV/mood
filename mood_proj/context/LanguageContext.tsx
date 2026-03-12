import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations } from "../constants/translations";

type LanguageCode = "en" | "es" | "fr" | "pt" | "it";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  availableLanguages: { code: LanguageCode; label: string; flag: string }[];
}

// Global language cache so non-hook code can translate safely (used by tStatic).
let currentLanguage: LanguageCode = "en";

const translatePath = (path: string, language: LanguageCode) => {
  const keys = path.split(".");
  let current = (translations as any)[language];

  if (!current) {
    console.warn(`Language ${language} not found — falling back to English.`);
    current = (translations as any)["en"];
  }

  for (const key of keys) {
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      // Fallback to English
      let fallback = (translations as any)["en"];
      for (const fbKey of keys) {
        if (fallback) fallback = fallback[fbKey];
      }
      return fallback ?? path;
    }
  }

  return current;
};

// Use this when you need translations outside React hooks/components.
export const tStatic = (path: string, language: LanguageCode = currentLanguage) => {
  return translatePath(path, language);
};

export const availableLanguages: {
  code: LanguageCode;
  label: string;
  flag: string;
}[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem("user-language");
        if (storedLang && ["en", "es", "fr", "pt", "it"].includes(storedLang)) {
          setLanguageState(storedLang as LanguageCode);
        } else {
          // Default: English (premium-first)
          setLanguageState("en");
          await AsyncStorage.setItem("user-language", "en");
        }
      } catch (e) {
        console.log("Error loading language", e);
      }
    };
    loadLanguage();
  }, []);

  // Keep global language in sync for tStatic()
  useEffect(() => {
    currentLanguage = language;
  }, [language]);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    currentLanguage = lang;
    await AsyncStorage.setItem("user-language", lang);
  };

  const t = (key: string) => translatePath(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
