import { NextResponse } from 'next/server';
import { v3 } from '@google-cloud/translate';
import textToSpeech from '@google-cloud/text-to-speech';

export const maxDuration = 60;

const translateClient = new v3.TranslationServiceClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const getProjectId = async () => {
    const client = new v3.TranslationServiceClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    return await client.getProjectId();
};

const voiceMap: Record<string, { code: string; name: string }> = {
    en: { code: 'en-US', name: 'en-US-Neural2-F' },
    tr: { code: 'tr-TR', name: 'tr-TR-Wavenet-A' },
    es: { code: 'es-ES', name: 'es-ES-Neural2-F' },
    fr: { code: 'fr-FR', name: 'fr-FR-Neural2-A' },
};

// Helper to generate speech for a single phrase
async function generateSpeech(text: string, languageCode: string): Promise<Buffer> {
    const [audio] = await ttsClient.synthesizeSpeech({
        input: { text },
        voice: {
            languageCode: voiceMap[languageCode].code,
            name: voiceMap[languageCode].name,
        },
        audioConfig: { audioEncoding: 'MP3' },
    });
    return Buffer.from(audio.audioContent as Uint8Array);
}

// Helper to generate actual silent audio using TTS
async function generateSilence(durationMs: number, languageCode: string): Promise<Buffer> {
    // Generate silence using TTS with SSML break tag
    const silenceSsml = `<speak><break time="${durationMs}ms"/></speak>`;

    const [audio] = await ttsClient.synthesizeSpeech({
        input: { ssml: silenceSsml },
        voice: {
            languageCode: voiceMap[languageCode].code,
            name: voiceMap[languageCode].name,
        },
        audioConfig: { audioEncoding: 'MP3' },
    });

    return Buffer.from(audio.audioContent as Uint8Array);
}

// Translation + Combined Audio endpoint
export async function POST(req: Request) {
    try {
        const {
            text,
            sourceLang,
            targetLang,
            delimiter = ',',
            pauseDuration = 800
        } = await req.json();

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

        // Split text by delimiter
        const phrases = text.split(delimiter).map((p: string) => p.trim()).filter(Boolean);

        if (phrases.length === 0) {
            return NextResponse.json(
                { error: 'No phrases found' },
                { status: 400 }
            );
        }

        const projectId = await getProjectId();

        // Translate all phrases
        const [transResponse] = await translateClient.translateText({
            parent: `projects/${projectId}/locations/global`,
            contents: phrases,
            sourceLanguageCode: sourceLang,
            targetLanguageCode: targetLang,
        });

        const translations = transResponse.translations || [];

        // Generate audio for each phrase pair (original + translation)
        const audioBuffers: Buffer[] = [];

        for (let i = 0; i < phrases.length; i++) {
            const original = phrases[i];
            const translated = translations[i]?.translatedText || '';

            // Generate audio for original phrase
            const originalAudio = await generateSpeech(original, sourceLang);
            audioBuffers.push(originalAudio);

            // Add small pause (using source language for silence)
            const pause1 = await generateSilence(pauseDuration, sourceLang);
            audioBuffers.push(pause1);

            // Generate audio for translated phrase
            const translatedAudio = await generateSpeech(translated, targetLang);
            audioBuffers.push(translatedAudio);

            // Add longer pause between phrase pairs (except after last one)
            if (i < phrases.length - 1) {
                const pause2 = await generateSilence(Math.floor(pauseDuration * 1.5), targetLang);
                audioBuffers.push(pause2);
            }
        }

        // Combine all audio buffers
        const combinedAudio = Buffer.concat(audioBuffers);

        // Return as binary Response (NOT JSON)
        return new Response(combinedAudio, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': combinedAudio.length.toString(),
                'Content-Disposition': 'attachment; filename="translation-audio.mp3"',
            },
        });
    } catch (err: any) {
        console.error('Translation + Audio API Error:', err);
        return NextResponse.json(
            { error: err.message || 'Translation and audio generation failed' },
            { status: 500 }
        );
    }
}

// Separate endpoint to get just translation data (no audio)
export async function PUT(req: Request) {
    try {
        const { text, sourceLang, targetLang, delimiter = ',' } = await req.json();

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

        const phrases = text.split(delimiter).map((p: string) => p.trim()).filter(Boolean);
        const projectId = await getProjectId();

        const [transResponse] = await translateClient.translateText({
            parent: `projects/${projectId}/locations/global`,
            contents: phrases,
            sourceLanguageCode: sourceLang,
            targetLanguageCode: targetLang,
        });

        const translations = transResponse.translations || [];
        const phrasePairs = phrases.map((original: string, i: number) => ({
            original,
            translated: translations[i]?.translatedText || '',
        }));

        return NextResponse.json({
            phrasePairs,
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