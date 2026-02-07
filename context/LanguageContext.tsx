import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { translations } from "../constants/translations";

// Global language cache so non-hook code can translate safely (used by tStatic).
let currentLanguage: string = "es";

const translatePath = (path: string, language: string) => {
  const keys = path.split(".");
  let current = (translations as any)[language];

  if (!current) {
    console.warn(`Idioma ${language} no encontrado, usando fallback 'es'`);
    current = (translations as any)["es"];
  }

  for (const key of keys) {
    if (current && current[key] !== undefined) {
      current = current[key];
    } else {
      let fallback = (translations as any)["es"];
      for (const fbKey of keys) {
        if (fallback) fallback = fallback[fbKey];
      }
      if (!fallback) {
        return path;
      }
      return fallback;
    }
  }
  return current;
};

// Use this when you need translations outside React hooks/components.
export const tStatic = (path: string, language: string = currentLanguage) => {
  return translatePath(path, language);
};


type LanguageCode = "es" | "en" | "fr" | "pt" | "it";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  availableLanguages: { code: LanguageCode; label: string; flag: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const availableLanguages: {
  code: LanguageCode;
  label: string;
  flag: string;
}[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
];

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguageState] = useState<LanguageCode>("es");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem("user-language");

        if (storedLang && ["es", "en", "fr", "pt", "it"].includes(storedLang)) {
          setLanguageState(storedLang as LanguageCode);
        } else {
          const locales = Localization.getLocales();
          if (locales && locales.length > 0) {
            const deviceLang = locales[0].languageCode;
            if (deviceLang && ["en", "fr", "pt", "it"].includes(deviceLang)) {
              setLanguageState(deviceLang as LanguageCode);
            }
          }
        }
      } catch (e) {
        console.log("Error loading language", e);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: LanguageCode) => {
    setLanguageState(lang);
    await AsyncStorage.setItem("user-language", lang);
  };

  const t = (path: string) => {
    return translatePath(path, language);
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, availableLanguages }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};