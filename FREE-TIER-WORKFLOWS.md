# Free-Tier Workflows (No Paid Cloud API Required)

This document outlines two **free-tier** workflows for generating translated audio (and/or text) without relying on paid Google Cloud APIs. Both workflows are designed to keep costs at $0 by using either browser-native capabilities or open-source local tooling.

> 🚫 **Note:** The current app uses **Google Cloud Translate** + **Google Cloud Text-to-Speech** (`@google-cloud/translate`, `@google-cloud/text-to-speech`), which requires a billing-enabled Google Cloud project and incurs charges as you make API calls. That is why your current workflow is costing money.

---

## 1) Workflow A: Browser-Native TTS + Free Translation API (LibreTranslate)

### ✅ What You Get
- **Text translation** via a free public API (LibreTranslate). ✅
- **Speech synthesis** via the browser’s built-in `SpeechSynthesis` API (no cloud calls). ✅

### 🔧 How It Works
1. Use a **client-side translation endpoint** such as LibreTranslate (https://libretranslate.com/) or self-hosted instance.
2. Use the **Web Speech API** (`window.speechSynthesis`) to speak the translated text in the browser.

### 👍 Pros
- Works without any API keys.
- Free for basic usage.
- No backend required (can be purely frontend).

### ⚠️ Cons
- Public LibreTranslate instances may be rate-limited and can go down.
- Browser voices are limited to what the user’s OS/browser provides.

### ✅ Example (Pseudo-code)
```js
// 1) Translate using LibreTranslate (no key required for public instance)
const translate = async (text, source, target) => {
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source, target, format: 'text' }),
  });
  const data = await res.json();
  return data.translatedText;
};

// 2) Speak via browser TTS
const speak = (text, lang) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang; // e.g., 'fr-FR'
  window.speechSynthesis.speak(utterance);
};
```

---

## 2) Workflow B: Local Open-Source Models (Argos Translate + Coqui TTS)

### ✅ What You Get
- **Offline translation** using open-source models (Argos Translate).
- **Offline high-quality TTS** using Coqui TTS (or similar).
- Works entirely locally (no cloud, no API keys, no billing).

### 🔧 How It Works
1. Install a local Python environment with Argos Translate + Coqui TTS.
2. Use a small local server (Flask/FastAPI) or a CLI to generate translated text and speech.
3. Your Next.js app can call that local server (or run it as a background process).

### 👍 Pros
- Fully free once installed.
- Works offline (no external network required).
- No usage limits.

### ⚠️ Cons
- Requires installing Python and model files (~100–200MB depending on languages).
- A bit more setup than browser-only.

### ✅ High-Level Setup Steps (Python)
1. Create a Python venv (e.g., using `python -m venv .venv`).
2. Install:
   - `pip install argostranslate`
   - `pip install TTS` (Coqui TTS)
3. Download Argos Translate language packages for the pairs you need.
4. Run a small HTTP server (Flask/FastAPI) that:
   - Accepts input text + source/target languages.
   - Uses Argos Translate to translate.
   - Uses Coqui TTS to synthesize audio and return an MP3/OGG.

---

## Quick Reference: Which Episodes Cover Music / Art / Dance / Dating / Sex?
These are the most relevant episodes in `100-episode-vocab-podcast.md`:

- **Music / Dance**
  - Episode 5 – *Le Corps en Mouvement* (dance class, ballet vocabulary)
  - Episode 31–40 (Season 4) – *Le Son et le Mouvement* (rhythm, melody, dancefloor, DJ, studio, festival, vocals)

- **Art**
  - Episode 27 – *Le Poete* (song lyrics, poetry)
  - Episode 61–70 (Season 7) – *L'Art et la Creation* (painting, cinema, photography, sculpture, museums)

- **Dating / Sex**
  - Episode 13 – *L'Amoureux* (romance, attraction, intimacy, passion)

---

## Notes
- This doc avoids embedding any secrets (no service account keys or tokens).
- If you want fully offline audio + translation, Workflow B is the best long-term free solution.
- If you want a zero‑install minimal solution, Workflow A is easiest (but depends on a public API that can be rate-limited).
