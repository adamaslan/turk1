// app/api/test-google/route.ts
import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { v2 } from '@google-cloud/translate';

type TestResult = {
    status: 'success' | 'error' | 'pending';
    voiceCount?: number;
    example?: string;
    message?: string;
};

type ResponseData = {
    textToSpeech: TestResult;
    translate: TestResult;
};

export async function GET() {
    const results: ResponseData = {
        textToSpeech: { status: 'pending' },
        translate: { status: 'pending' }
    };

    // Test Text-to-Speech
    try {
        const ttsClient = new TextToSpeechClient();
        const [voices] = await ttsClient.listVoices({});
        results.textToSpeech = {
            status: 'success',
            voiceCount: voices.voices?.length || 0,
            example: voices.voices?.[0]?.name || 'none'
        };
    } catch (error) {
        results.textToSpeech = {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }

    // Test Translate
    try {
        const translateClient = new v2.Translate();
        const [translation] = await translateClient.translate('Hello!', 'es');
        results.translate = {
            status: 'success',
            example: `"Hello!" → "${translation}"`
        };
    } catch (error) {
        results.translate = {
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }

    return NextResponse.json(results);
}