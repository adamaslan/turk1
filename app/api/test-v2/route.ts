// app/api/test-v2/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download');

    // If download=true, return the audio file directly
    if (download === 'true') {
        try {
            const audioResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'i am excited for your this app to work',
                    sourceLang: 'en',
                    targetLang: 'fr',
                    delimiter: ',',
                    pauseDuration: 800
                })
            });

            if (audioResponse.ok) {
                const audioBuffer = await audioResponse.arrayBuffer();

                return new Response(audioBuffer, {
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Content-Disposition': 'attachment; filename="test-translation.mp3"',
                    },
                });
            } else {
                const error = await audioResponse.json();
                return NextResponse.json({ error }, { status: 500 });
            }
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    // Otherwise, return test results as JSON
    const results = {
        translationTest: {
            status: 'pending' as 'pending' | 'success' | 'error',
            data: null as any
        },
        audioTest: {
            status: 'pending' as 'pending' | 'success' | 'error',
            info: null as any
        }
    };

    // Test 1: Translation only (PUT)
    try {
        const translationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v2`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'hi',
                sourceLang: 'en',
                targetLang: 'fr',
                delimiter: ','
            })
        });

        const translationData = await translationResponse.json();

        results.translationTest = {
            status: 'success',
            data: translationData
        };
    } catch (err: any) {
        results.translationTest = {
            status: 'error',
            data: err.message
        };
    }

    // Test 2: Audio generation (POST)
    try {
        const audioResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'mili is so hot',
                sourceLang: 'en',
                targetLang: 'es',
                delimiter: ',',
                pauseDuration: 800
            })
        });

        if (audioResponse.ok) {
            const contentType = audioResponse.headers.get('content-type');
            const contentLength = audioResponse.headers.get('content-length');

            results.audioTest = {
                status: 'success',
                info: {
                    contentType,
                    contentLength: `${contentLength} bytes`,
                    message: 'Audio generated successfully',
                    downloadLink: '/api/test-v2?download=true'
                }
            };
        } else {
            const errorData = await audioResponse.json();
            results.audioTest = {
                status: 'error',
                info: errorData
            };
        }
    } catch (err: any) {
        results.audioTest = {
            status: 'error',
            info: err.message
        };
    }

    return NextResponse.json(results, { status: 200 });
}