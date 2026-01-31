import { NextResponse } from 'next/server';
import { v3 } from '@google-cloud/translate';
import textToSpeech from '@google-cloud/text-to-speech';

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

const voiceMap: Record<string, { code: string; name: string }> = {
  en: { code: 'en-US', name: 'en-US-Neural2-F' },
  tr: { code: 'tr-TR', name: 'tr-TR-Wavenet-A' },
  es: { code: 'es-ES', name: 'es-ES-Neural2-F' },
  fr: { code: 'fr-FR', name: 'fr-FR-Neural2-A' },
};

// Translation endpoint
export async function POST(req: Request) {
  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text?.trim() || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    if (!voiceMap[sourceLang] || !voiceMap[targetLang]) {
      return NextResponse.json(
        { error: 'Unsupported language pair' },
        { status: 400 }
      );
    }

    const [transResponse] = await translateClient.translateText({
      parent: `projects/${auth.projectId}/locations/global`,
      contents: [text],
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    });

    const translatedText = transResponse.translations?.[0].translatedText || '';

    if (!translatedText) {
      throw new Error('Translation failed - no response from service');
    }

    return NextResponse.json({
      original: text,
      translated: translatedText,
      sourceLang,
      targetLang,
    });
  } catch (err: any) {
    console.error('Translation API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Translation failed' },
      { status: 500 }
    );
  }
}

// Text-to-Speech endpoint
export async function PUT(req: Request) {
  try {
    const { text, languageCode } = await req.json();

    if (!text?.trim() || !languageCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!voiceMap[languageCode]) {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400 }
      );
    }

    const [audio] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: voiceMap[languageCode].code,
        name: voiceMap[languageCode].name,
      },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const audioBuffer = Buffer.from(audio.audioContent as Uint8Array);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('TTS API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Audio generation failed' },
      { status: 500 }
    );
  }
}