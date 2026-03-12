import { formatDistanceToNow, isYesterday } from "date-fns";
import { es, enUS, fr, pt, it } from "date-fns/locale";

const locales: Record<string, any> = {
  es: es,
  en: enUS,
  fr: fr,
  pt: pt,
  it: it,
};

const yesterdayLabel: Record<string, string> = {
  es: "Ayer",
  en: "Yesterday",
  fr: "Hier",
  pt: "Ontem",
  it: "Ieri",
};

export const getRelativeTime = (dateString: string, languageCode: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const currentLocale = locales[languageCode] || enUS;

  if (isYesterday(date)) {
    return yesterdayLabel[languageCode] || "Yesterday";
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: currentLocale,
  });
};
