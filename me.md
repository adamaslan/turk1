To build this with the **fewest files possible**, we will use **Next.js (App Router)**. This allows us to keep the "Engine" (backend) and the "UI" (frontend) in the same project.

In this setup, we avoid complex audio libraries by using simple **Buffer concatenation**. Since Google TTS outputs consistent MP3 bitrates, most modern players will play the combined file perfectly.

### The "Minimalist" File Structure

1. **`package.json`**: Dependencies.
2. **`.env.local`**: Your secret keys.
3. **`lib/supabase.ts`**: The connection to your database/storage.
4. **`app/api/generate/route.ts`**: **The Engine.** (Translation + TTS + Merging + Upload).
5. **`app/page.tsx`**: The UI.

---

### 1. The Engine (`app/api/generate/route.ts`)

This single file replaces your entire Python script. It handles the full pipeline in one request.

```typescript
import { NextResponse } from 'next/server';
import { v3 } from '@google-cloud/translate';
import textToSpeech from '@google-cloud/text-to-speech';
import { supabase } from '@/lib/supabase';

// To keep file count low, we pass credentials directly in the code
const auth = {
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
};

const translateClient = new v3.TranslationServiceClient(auth);
const ttsClient = new textToSpeech.TextToSpeechClient(auth);

export async function POST(req: Request) {
  const { text, targetLang = 'es' } = await req.json();

  try {
    // 1. Translation
    const [response] = await translateClient.translateText({
      parent: `projects/${auth.projectId}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      targetLanguageCode: targetLang,
    });
    const translatedText = response.translations?.[0].translatedText || '';

    // 2. Generate Audio for BOTH (English and Translated)
    const [originalAudio] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const [translatedAudio] = await ttsClient.synthesizeSpeech({
      input: { text: translatedText },
      voice: { languageCode: targetLang, ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // 3. Merge Audios (Simplest way: Buffer concatenation)
    // We add a small "silence" buffer between them (optional)
    const combinedBuffer = Buffer.concat([
      originalAudio.audioContent as Buffer,
      translatedAudio.audioContent as Buffer,
    ]);

    // 4. Upload to Supabase Storage
    const fileName = `track-${Date.now()}.mp3`;
    const { data, error } = await supabase.storage
      .from('learning-tracks')
      .upload(fileName, combinedBuffer, { contentType: 'audio/mpeg' });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('learning-tracks')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, translation: translatedText });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

```

---

### 2. The UI (`app/page.tsx`)

A clean, functional interface to trigger the engine.

```tsx
'use client';
import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{url: string, translation: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const generateTrack = async () => {
    setLoading(true);
    const res = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLang: 'es' }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <main className="p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Linguist Engine v1</h1>
      <textarea 
        className="w-full p-2 border rounded text-black" 
        rows={4} 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to translate and hear..."
      />
      <button 
        onClick={generateTrack}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 mt-2 rounded disabled:bg-gray-400"
      >
        {loading ? 'Processing...' : 'Generate Learning Track'}
      </button>

      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <p className="font-semibold text-black">Translation: {result.translation}</p>
          <audio controls src={result.url} className="mt-4 w-full" />
          <a href={result.url} download className="block mt-2 text-blue-500 underline">Download MP3</a>
        </div>
      )}
    </main>
  );
}

```

---

### Setup Instructions (The "Generous" Free Tier)

1. **Google Cloud:** Create a project, enable **Cloud Translation API** and **Text-to-Speech API**. Generate a Service Account Key (JSON) and copy the values to your `.env.local`.
2. **Supabase:** Create a free project. Go to **Storage**, create a public bucket named `learning-tracks`.
3. **Vercel (Crucial):** When you deploy, go to **Settings > Functions** and enable **"Fluid Compute"**.
* **Why?** Standard serverless functions on the free tier timeout after 10 seconds. Fluid Compute extends this to **60 seconds**, which gives the APIs enough time to translate, generate two audios, and upload them.



### Why this works:

* **0 Overheads:** No separate Python server to manage.
* **Massive Free Tier:** You get 500,000 characters of translation and 1,000,000 characters of high-quality speech for $0/month.
* **Persistent:** Every track is saved in Supabase, so you can easily add a "History" tab later just by fetching from the database.

**Would you like me to provide the `package.json` dependencies and the specific `.env.local` template to get this running immediately?**