import re, json, unicodedata
from pathlib import Path

root = Path(__file__).resolve().parent
p = root/'constants'/'locales'/'en.ts'
text = p.read_text(encoding='utf-8')

KEY_MAP = {
  's_3abf536a': 'Song',
  's_3fab5c57': 'Your weekly recap is ready',
  's_563d5e56': 'Payment',
  's_5a661d50': 'Follow creators and artists to fill your home with the best music.',
  's_7aeddfb8': "We couldn't send the comment.",
  's_7ca59d57': 'With music',
  's_7ce96a09': 'Your feed feels quiet…',
  's_83227328': 'Are you sure you want to delete this comment?',
  's_86d6df01': 'Report post',
  's_9202d8b5': 'Are you sure you want to delete this story?',
  's_a233337c': 'Post shared.',
  's_a2375014': 'Something went wrong',
  's_a6b30ef4': 'Choose a reason:',
  's_a816ff98': 'Add a comment…',
  's_a846a650': 'Select',
  's_addcfb70': 'What would you like to upload?',
  's_b0c28ea0': 'Discover music in seconds',
  's_b27e11d7': 'Terms of Use (EULA)',
  's_bb780b43': 'Your story is uploading in the background…',
  's_c99ca222': "Code redeemed successfully. You're now a verified user.",
  's_cceb0f88': 'How we protect your data',
  's_d0edd9a7': 'MUSIC PLATFORM',
  's_d1489c0f': '🎙️ Record with music',
  's_d96b6b7e': 'Explore by mood or genre',
  's_df6980c4': 'Payments are coming soon. In the meantime, try a promo code.',
  's_ea44fb1e': "We ran into an issue opening the chat.",
  's_eee2c16a': "We couldn't delete the comment.",
  's_f1caef3b': 'More',
  's_f1e99752': 'Create content with this music',
  's_f40d5ede': 'Moods & Genres',
  's_fca9e94b': 'Welcome to Mood Plus!',
  's_23cd3837': 'Keep it up!',
  's_85d853bf': 'Would you like to block ',
  's_a7f94442': '• With music',
}

# Replace each key line inside ui: { ... }
# Pattern matches: <spaces><key>: "...",
for key, val in KEY_MAP.items():
    pat = re.compile(rf"(^\s*{re.escape(key)}:\s*)(\"(?:[^\"\\]|\\.)*\")(\s*,\s*$)", re.MULTILINE)
    rep = lambda m: m.group(1) + json.dumps(val, ensure_ascii=False) + m.group(3)
    text, n = pat.subn(rep, text)
    if n == 0:
        raise SystemExit(f"Key not found: {key}")

p.write_text(text, encoding='utf-8')

# quick check for spanish-ish leftovers in ui block
ui_block = re.search(r"\bui:\s*\{([\s\S]*?)\n\s*\}\s*,", text)
if not ui_block:
    raise SystemExit('ui block not found')
block = ui_block.group(1)

def strip_accents(s:str)->str:
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

def spanishish(s: str) -> bool:
    if any(ch in s for ch in '¿¡áéíóúñÁÉÍÓÚÑ'):
        return True
    s2 = ' ' + strip_accents(s).lower() + ' '
    # look for Spanish stopwords / terms (keep tight to avoid false positives)
    for w in [' el ', ' la ', ' los ', ' las ', ' tu ', ' tus ', ' esta ', ' este ', ' aun', ' mas ', ' menu', ' conversacion', ' cancion', ' musica', ' privacidad', ' terminos', ' condiciones', ' bienvenido', ' que ', ' deseas ', ' subir', ' seguir', ' reportar', ' publicacion', ' pago', ' pasarela', ' codigo', ' exito', ' comentario', ' historias']:
        if w in s2:
            return True
    return False

remaining = []
for m in re.finditer(r"^\s*(s_[0-9a-f]{8}):\s*(\"(?:[^\"\\]|\\.)*\")\s*,\s*$", block, re.MULTILINE):
    key = m.group(1)
    val = json.loads(m.group(2))
    if spanishish(val):
        remaining.append((key, val))

# write report
report = root/'docs'/'I18N_EN_REMAINING_UI.csv'
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text('key,value\n' + '\n'.join(f"{k},{json.dumps(v, ensure_ascii=False)}" for k,v in remaining) + '\n', encoding='utf-8')
print('Remaining:', len(remaining))
