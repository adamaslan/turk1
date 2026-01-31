import { NextResponse } from 'next/server';
import { v3 } from '@google-cloud/translate';
import textToSpeech from '@google-cloud/text-to-speech';

// Increase timeout for long audio generation (Vercel Fluid Compute)
export const maxDuration = 60; 

const auth = {
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
};

const translateClient = new v3.TranslationServiceClient(auth);
const ttsClient = new textToSpeech.TextToSpeechClient(auth);

// Map languages to high-quality Native voices
const voiceMap: Record<string, { code: string; name: string }> = {
  en: { code: 'en-US', name: 'en-US-Neural2-F' },
  tr: { code: 'tr-TR', name: 'tr-TR-Wavenet-A' },
  es: { code: 'es-ES', name: 'es-ES-Neural2-F' },
};

export async function POST(req: Request) {
  const { text, sourceLang, targetLang } = await req.json();

  try {
    // 1. Translation
    const [transResponse] = await translateClient.translateText({
      parent: `projects/${auth.projectId}/locations/global`,
      contents: [text],
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    });
    const translatedText = transResponse.translations?.[0].translatedText || '';

    // 2. Generate Audio 1 (Source Language)
    const [audio1] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: voiceMap[sourceLang].code, name: voiceMap[sourceLang].name },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // 3. Generate Audio 2 (Target Language)
    const [audio2] = await ttsClient.synthesizeSpeech({
      input: { text: translatedText },
      voice: { languageCode: voiceMap[targetLang].code, name: voiceMap[targetLang].name },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // 4. Merge (Simply append buffers - most MP3 players handle this perfectly)
    const combinedBuffer = Buffer.concat([
      audio1.audioContent as Buffer,
      audio2.audioContent as Buffer,
    ]);

    // 5. Send as a Downloadable File
    return new Response(combinedBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${sourceLang}-to-${targetLang}.mp3"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}