import { NextResponse } from 'next/server';
import { v3 } from '@google-cloud/translate';
import textToSpeech from '@google-cloud/text-to-speech';

export const maxDuration = 60;

// Minimal credentials helper - supports both local file and Vercel env var
function getGoogleCredentials() {
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        const jsonString = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
        return JSON.parse(jsonString);
    }
    return undefined;
}

const credentials = getGoogleCredentials();

const translateClient = credentials
    ? new v3.TranslationServiceClient({ credentials })
    : new v3.TranslationServiceClient({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });

const ttsClient = credentials
    ? new textToSpeech.TextToSpeechClient({ credentials })
    : new textToSpeech.TextToSpeechClient({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });

const projectIdPromise = translateClient.getProjectId();

// Enhanced voice map with multiple voice options
const voiceMap: Record<string, { code: string; name: string; alternates?: string[] }> = {
    en: {
        code: 'en-US',
        name: 'en-US-Neural2-F',
        alternates: ['en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D']
    },
    tr: {
        code: 'tr-TR',
        name: 'tr-TR-Wavenet-A',
        alternates: ['tr-TR-Wavenet-B', 'tr-TR-Wavenet-C']
    },
    es: {
        code: 'es-ES',
        name: 'es-ES-Neural2-F',
        alternates: ['es-ES-Neural2-A', 'es-ES-Neural2-B']
    },
    fr: {
        code: 'fr-FR',
        name: 'fr-FR-Neural2-A',
        alternates: ['fr-FR-Neural2-B', 'fr-FR-Neural2-C', 'fr-FR-Neural2-D']
    },
};

function decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
        '&#39;': "'",
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
        '&apos;': "'",
    };

    let decoded = text;
    Object.entries(entities).forEach(([entity, char]) => {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
    });

    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
    });

    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    return decoded;
}

// Enhanced speech generation with speed control
async function generateSpeech(
    text: string,
    languageCode: string,
    speed: number = 1.0,
    voiceGender?: string
): Promise<Buffer> {
    const voice = voiceMap[languageCode];

    const [audio] = await ttsClient.synthesizeSpeech({
        input: { text: decodeHtmlEntities(text) },
        voice: {
            languageCode: voice.code,
            name: voice.name,
            // Optional: specify voice gender if provided
        },
        audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed, // 0.25 to 4.0
            pitch: 0.0,
        },
    });
    return Buffer.from(audio.audioContent as Uint8Array);
}

// Generate silence using TTS
async function generateSilence(durationMs: number, languageCode: string): Promise<Buffer> {
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

// Main translation + audio endpoint with podcast features
export async function POST(req: Request) {
    try {
        const {
            text,
            sourceLang,
            targetLang,
            delimiter = ',',
            pauseDuration = 1200,
            repeatCount = 1,
            sourceSpeed = 0.9,
            targetSpeed = 0.85,
            mode = 'standard' // 'standard', 'immersion', 'drill'
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

        const phrases = text.split(delimiter).map((p: string) => p.trim()).filter(Boolean);

        if (phrases.length === 0) {
            return NextResponse.json(
                { error: 'No phrases found' },
                { status: 400 }
            );
        }

        const projectId = await projectIdPromise;

        const [transResponse] = await translateClient.translateText({
            parent: `projects/${projectId}/locations/global`,
            contents: phrases,
            sourceLanguageCode: sourceLang,
            targetLanguageCode: targetLang,
        });

        const translations = transResponse.translations || [];
        const audioBuffers: Buffer[] = [];

        for (let i = 0; i < phrases.length; i++) {
            const original = phrases[i];
            const translated = decodeHtmlEntities(translations[i]?.translatedText || '');

            // Different modes for different learning styles
            if (mode === 'immersion') {
                // Target language only, repeated
                for (let r = 0; r < repeatCount; r++) {
                    const targetAudio = await generateSpeech(translated, targetLang, targetSpeed);
                    audioBuffers.push(targetAudio);

                    if (r < repeatCount - 1) {
                        const pause = await generateSilence(pauseDuration * 0.8, targetLang);
                        audioBuffers.push(pause);
                    }
                }

                if (i < phrases.length - 1) {
                    const longPause = await generateSilence(pauseDuration * 2, targetLang);
                    audioBuffers.push(longPause);
                }
            }
            else if (mode === 'drill') {
                // Rapid repetition: Source -> Target -> Target -> Target
                const sourceAudio = await generateSpeech(original, sourceLang, sourceSpeed);
                audioBuffers.push(sourceAudio);

                const pause1 = await generateSilence(pauseDuration * 0.6, sourceLang);
                audioBuffers.push(pause1);

                for (let r = 0; r < 3; r++) {
                    const targetAudio = await generateSpeech(translated, targetLang, targetSpeed);
                    audioBuffers.push(targetAudio);

                    const pause = await generateSilence(pauseDuration * 0.5, targetLang);
                    audioBuffers.push(pause);
                }

                if (i < phrases.length - 1) {
                    const longPause = await generateSilence(pauseDuration * 1.5, targetLang);
                    audioBuffers.push(longPause);
                }
            }
            else {
                // Standard mode: Source -> Pause -> Target (repeated)
                for (let r = 0; r < repeatCount; r++) {
                    const originalAudio = await generateSpeech(original, sourceLang, sourceSpeed);
                    audioBuffers.push(originalAudio);

                    const pause1 = await generateSilence(pauseDuration, sourceLang);
                    audioBuffers.push(pause1);

                    const translatedAudio = await generateSpeech(translated, targetLang, targetSpeed);
                    audioBuffers.push(translatedAudio);

                    if (r < repeatCount - 1) {
                        const repeatPause = await generateSilence(Math.floor(pauseDuration * 1.2), targetLang);
                        audioBuffers.push(repeatPause);
                    }
                }

                if (i < phrases.length - 1) {
                    const pause2 = await generateSilence(Math.floor(pauseDuration * 1.8), targetLang);
                    audioBuffers.push(pause2);
                }
            }
        }

        const combinedAudio = Buffer.concat(audioBuffers);

        return new Response(combinedAudio, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': combinedAudio.length.toString(),
                'Content-Disposition': `attachment; filename="french-podcast-${mode}-${Date.now()}.mp3"`,
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

// Translation-only endpoint (no changes needed, works as-is)
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
        const projectId = await projectIdPromise;

        const [transResponse] = await translateClient.translateText({
            parent: `projects/${projectId}/locations/global`,
            contents: phrases,
            sourceLanguageCode: sourceLang,
            targetLanguageCode: targetLang,
        });

        const translations = transResponse.translations || [];
        const phrasePairs = phrases.map((original: string, i: number) => ({
            original,
            translated: decodeHtmlEntities(translations[i]?.translatedText || ''),
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