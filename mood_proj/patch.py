import re, json, unicodedata
from pathlib import Path

root = Path(__file__).resolve().parent

# --- 1) Rewrite LanguageContext.tsx (avoid regex mistakes) ---
lang_path = root/'context'/'LanguageContext.tsx'
lang_path.write_text('''import React, { createContext, useContext, useState, useEffect } from "react";
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
''', encoding='utf-8')

# --- 2) Translate EN ui.* values to English (friendly premium) ---
en_path = root/'constants'/'locales'/'en.ts'
text = en_path.read_text(encoding='utf-8')
lines = text.splitlines(True)

PHRASE = {
  "Sé el primero en comentar.": "Be the first to comment.",
  "¡RACHA EN LLAMAS!": "STREAK ON FIRE!",
  "Cancelar reconocimiento": "Cancel recognition",
  "Describe tu vibe...": "Describe your vibe…",
  "Post no disponible": "Post unavailable",
  "No se pudo abrir el enlace": "We couldn't open that link.",
  "No se pudo abrir WhatsApp": "We couldn't open WhatsApp.",
  "Canciones en Mood": "Songs on Mood",
  "Buscar": "Search",
  "Esta acción es irreversible": "This can’t be undone.",
  "Esta acción es irreversible.": "This can’t be undone.",
  "Gestionar tu publicación": "Manage your post",
  "Eliminar publicación": "Delete post",
  "Voz": "Voice",
  "Reintentar": "Try again",
  "Enlace en el portapapeles.": "Link copied to your clipboard.",
  "URL no disponible": "URL not available",
  "Modo Privacidad": "Privacy Mode",
  "¿Eliminar?": "Delete?",
  "No encontramos resultados. Prueba otro chip.": "No results yet—try a different chip.",
  "Canción agregada.": "Added.",
  "Error al reproducir.": "Playback error.",
  "Compartir Música": "Share Music",
  "Usar este sonido": "Use this sound",
  "No se pudo bloquear al usuario.": "We couldn't block this user.",
  "No se pudo eliminar.": "We couldn't delete that.",
  "🎙️ Grabar voz": "🎙️ Record voice",
  "Crear Publicación": "Create Post",
  "Música": "Music",
  "No se pudo subir. Verifica el formato.": "We couldn't upload that. Please check the file format.",
  "No verás más contenido de este usuario": "You won't see this user’s content anymore.",
  "Renombrar Playlist": "Rename playlist",
  "Ver más": "See more",
  "Opciones del post": "Post options",
  "Nueva": "New",
  "Foto o Video": "Photo or video",
  "RESUMEN SEMANAL": "WEEKLY RECAP",
  "Sin mensajes aún": "No messages yet",
  "Playlist no disponible": "Playlist unavailable",
  "Esta playlist está vacía.": "This playlist is empty.",
  "Galería": "Gallery",
  "Éxito": "Success",
  "Política de Privacidad": "Privacy Policy",
  "Sin Playlists": "No playlists yet",
  "Abre el menú de opciones": "Open options menu",
  "Selecciona una acción": "Choose an action",
  "El audio no se pudo cargar.": "We couldn't load the audio.",
  "Código Promocional": "Promo Code",
  "Inicia una conversación con tus amigos de Mood.": "Start a chat with your Mood friends.",
  "Código inválido": "Invalid code",
  "Hola, necesito asistencia con la aplicación Mood.": "Hi! I need help with the Mood app.",
  "Sin conexión · Algunas acciones pueden fallar": "You're offline · Some actions may not work",
  "No estás identificado.": "You're not signed in.",
  "Comparte una canción": "Share a song",
  "Buscar artista o canción...": "Search artist or song…",
  "No encontramos canciones": "No songs found",
  "El código promocional no existe.": "That promo code doesn’t exist.",
  "días seguidos.": "days in a row.",
  "No se pudo iniciar el chat.": "We couldn't start the chat.",
}

word_map = {
  # tiny fallback map for leftovers
  "cancelar":"cancel", "eliminar":"delete", "buscar":"search", "cargando":"loading",
  "compartir":"share", "selecciona":"choose", "abrir":"open", "menú":"menu", "opciones":"options",
  "usuario":"user", "comentario":"comment", "comentarios":"comments", "canción":"song", "canciones":"songs",
  "música":"music", "privacidad":"privacy", "modo":"mode", "conexión":"connection", "sin":"no",
  "promocional":"promo", "código":"code", "inválido":"invalid", "éxito":"success",
  "inicia":"start", "conversación":"chat", "amigos":"friends", "perfil":"profile", "biblioteca":"library",
  "no":"no", "se":"", "pudo":"could", "crear":"create", "cargar":"load", "subir":"upload",
  "verifica":"check", "formato":"format", "acciones":"actions", "pueden":"may", "fallar":"fail",
  "más":"more",
}

def strip_acc(s: str) -> str:
  return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

_spanish_markers = [
  "no se pudo", "no encontramos", "no se encontraron", "sin conexión", "menú", "acción", "acciones",
  "comentario", "comentarios", "canción", "canciones", "música", "privacidad", "términos", "condiciones",
  "bienvenido", "pasarela", "pago", "promocional", "código", "inicia una", "abre el", "selecciona",
]

def looks_spanish(s: str) -> bool:
  if any(ch in s for ch in "¿¡áéíóúñÁÉÍÓÚÑ"): return True
  sl = strip_acc(s).lower()
  return any(m in sl for m in _spanish_markers)

def translate_action(rest: str) -> str:
  r = strip_acc(rest).lower().strip().rstrip('.')
  r = r.replace('al usuario','this user').replace('la playlist','the playlist').replace('tu biblioteca','your library')
  r = r.replace('el chat','the chat').replace('el audio','the audio').replace('el enlace','the link')
  r = r.replace('whatsapp','WhatsApp')
  # verbs
  for es,en in [
    ('iniciar','start'), ('abrir','open'), ('cargar','load'), ('crear','create'), ('eliminar','delete'),
    ('bloquear','block'), ('seguir','follow'), ('sincronizar','sync'), ('actualizar','update'), ('compartir','share'),
    ('subir','upload'), ('enviar','send'), ('reproducir','play')
  ]:
    r = re.sub(rf"\b{es}\b", en, r)
  # nouns
  for es,en in [('playlist','playlist'),('perfil','profile'),('usuario','user'),('cancion','song'),('mensaje','message')]:
    r = re.sub(rf"\b{es}\b", en, r)
  return r

def fallback_translate(s: str) -> str:
  # Pattern: No se pudo X
  m = re.match(r"^No se pudo (.+?)\.?$", s.strip())
  if m:
    return f"We couldn't {translate_action(m.group(1))}."
  # Token-level fallback
  parts = re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñüÜ]+|\d+|\s+|[^\w\s]", s, flags=re.UNICODE)
  out=[]
  for p in parts:
    if re.match(r"^[A-Za-zÁÉÍÓÚÑáéíóúñüÜ]+$", p):
      low=strip_acc(p).lower()
      rep=word_map.get(low)
      if rep is None:
        rep=p
      # preserve capitalization
      if p[:1].isupper() and rep and rep[:1].islower():
        rep=rep[:1].upper()+rep[1:]
      out.append(rep)
    else:
      out.append(p)
  res=''.join(out)
  # Clean double spaces
  res=re.sub(r"\s{2,}"," ",res)
  return res.strip()

# Find ui block
ui_start = None
ui_end = None
for i,l in enumerate(lines):
  if ui_start is None and re.search(r"\bui:\s*\{\s*$", l):
    ui_start = i
    continue
  if ui_start is not None and ui_end is None and re.match(r"\s*\}\s*,\s*$", l):
    ui_end = i
    break

if ui_start is None or ui_end is None:
  raise SystemExit("Could not locate ui block in en.ts")

changed=0
remaining=[]
for i in range(ui_start+1, ui_end):
  line = lines[i]
  m = re.match(r"^(\s*s_[0-9a-f]{8}\s*:\s*)(\"(?:[^\"\\]|\\.)*\")(\s*,\s*)$", line)
  if not m:
    continue
  key_prefix, literal, suffix = m.group(1), m.group(2), m.group(3)
  try:
    original = json.loads(literal)
  except Exception:
    continue

  new = PHRASE.get(original)
  if new is None and looks_spanish(original):
    new = fallback_translate(original)

  if new is not None and new != original:
    lines[i] = f"{key_prefix}{json.dumps(new, ensure_ascii=False)}{suffix}\n"
    changed += 1

# Rebuild file
new_text = ''.join(lines)
en_path.write_text(new_text, encoding='utf-8')

# Validate: any ui strings still look Spanish?
lines2 = new_text.splitlines()
in_ui=False
for l in lines2:
  if re.search(r"\bui:\s*\{\s*$", l):
    in_ui=True; continue
  if in_ui and re.match(r"\s*\}\s*,\s*$", l):
    in_ui=False
  if in_ui:
    mm = re.match(r"^\s*(s_[0-9a-f]{8})\s*:\s*(\"(?:[^\"\\]|\\.)*\")", l)
    if mm:
      val = json.loads(mm.group(2))
      if looks_spanish(val):
        remaining.append((mm.group(1), val))

# Write report (if any)
docs = root/'docs'
docs.mkdir(exist_ok=True)
rep_path = docs/'I18N_EN_REMAINING_UI.csv'
rep_path.write_text("key,value\n" + "\n".join([f"{k},{json.dumps(v, ensure_ascii=False)}" for k,v in remaining]) + "\n", encoding='utf-8')

print(f"LanguageContext rewritten ✅")
print(f"en.ts ui updated: {changed} entries")
print(f"Remaining spanish-ish ui strings: {len(remaining)}")
