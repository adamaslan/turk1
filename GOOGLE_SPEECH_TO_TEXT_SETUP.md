# Adding Google Speech-to-Text API to the Translator App

This document outlines the step-by-step process to integrate Google Cloud Speech-to-Text API into your translation application, allowing users to speak text instead of typing it.

## Table of Contents

1. [Google Cloud Project Setup](#google-cloud-project-setup)
2. [Install Dependencies](#install-dependencies)
3. [Create API Endpoint](#create-api-endpoint)
4. [Update Frontend UI](#update-frontend-ui)
5. [Environment Configuration](#environment-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Google Cloud Project Setup

### 1. Enable the Speech-to-Text API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project (the one you already use for Translation and Text-to-Speech)
3. Navigate to **APIs & Services** > **Enabled APIs & services**
4. Click **+ ENABLE APIS AND SERVICES**
5. Search for `Speech-to-Text API`
6. Click on it and press **ENABLE**

### 2. Verify Service Account Permissions

The service account you already have should be updated to include Speech-to-Text permissions:

1. Go to **APIs & Services** > **Service Accounts**
2. Click on your service account
3. Go to the **Roles** tab
4. Your account should have these roles:
   - `Cloud Translation API User` (or `Editor`)
   - `Cloud Text-to-Speech User` (or `Editor`)
   - `Cloud Speech-to-Text User` (or `Editor`) - **ADD THIS if missing**

If the Speech-to-Text role is missing:
- Click **Grant Access**
- Select `Cloud Speech-to-Text User` (or `Editor`)
- Click **Save**

---

## Install Dependencies

### Check if Already Installed

The required package might already be available through your existing Google Cloud dependencies. First, check your `package.json`:

```bash
npm list @google-cloud/speech
```

### Install if Missing

If not already installed, add the Speech-to-Text client library:

```bash
npm install @google-cloud/speech
```

Your `package.json` should now include:
```json
{
  "dependencies": {
    "@google-cloud/speech": "^5.0.0",
    "@google-cloud/translate": "^7.0.0",
    "@google-cloud/text-to-speech": "^4.0.0"
  }
}
```

---

## Create API Endpoint

### Create New Route File

Create a new API route file at `app/api/speech-to-text/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import speech, { protos } from '@google-cloud/speech';

export const maxDuration = 60;

// Minimal credentials helper - supports both local file and Vercel env var
function getGoogleCredentials() {
  // Vercel: Use base64-encoded JSON from environment variable
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const jsonString = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
  }
  // Local: Use file path (returns undefined to let SDK use keyFilename)
  return undefined;
}

const credentials = getGoogleCredentials();

const client = credentials
  ? new speech.SpeechClient({ credentials })
  : new speech.SpeechClient({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });

// Language code mapping
const languageCodeMap: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  es: 'es-ES',
  fr: 'fr-FR',
};

export async function POST(req: Request) {
  try {
    const { audioContent, languageCode, encoding = 'LINEAR16', sampleRateHertz = 16000 } = await req.json();

    if (!audioContent || !languageCode) {
      return NextResponse.json(
        { error: 'Missing required fields: audioContent and languageCode' },
        { status: 400 }
      );
    }

    if (!languageCodeMap[languageCode]) {
      return NextResponse.json(
        { error: `Unsupported language: ${languageCode}` },
        { status: 400 }
      );
    }

    // Decode the base64 audio content
    const audioBuffer = Buffer.from(audioContent, 'base64');

    const audio: protos.google.cloud.speech.v1.RecognitionAudio = {
      content: audioBuffer,
    };

    const request: protos.google.cloud.speech.v1.RecognizeRequest = {
      config: {
        encoding: encoding as protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding,
        sampleRateHertz,
        languageCode: languageCodeMap[languageCode],
        enableAutomaticPunctuation: true,
      },
      audio,
    };

    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      return NextResponse.json(
        {
          text: '',
          confidence: 0,
          message: 'No speech detected'
        }
      );
    }

    // Get the most confident result
    const result = response.results[0];
    if (!result.alternatives || result.alternatives.length === 0) {
      return NextResponse.json(
        {
          text: '',
          confidence: 0,
          message: 'No speech alternatives found'
        }
      );
    }

    const alternative = result.alternatives[0];
    const confidence = alternative.confidence || 0;

    return NextResponse.json({
      text: alternative.transcript || '',
      confidence,
      isFinal: result.isFinal || false,
    });
  } catch (err: any) {
    console.error('Speech-to-Text API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Speech recognition failed' },
      { status: 500 }
    );
  }
}
```

---

## Update Frontend UI

### Update page.tsx

Add the following to `app/page.tsx`:

#### 1. Add Imports (at the top)

```typescript
import { Mic, Square } from 'lucide-react';
```

#### 2. Add State Variables (in the `useState` section)

```typescript
const [isRecording, setIsRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
const [recordingError, setRecordingError] = useState('');
```

#### 3. Add Recording Handler Functions (before the return statement)

```typescript
const startRecording = async () => {
  try {
    setRecordingError('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await sendAudioToAPI(audioBlob);

      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  } catch (err) {
    setRecordingError(
      err instanceof Error
        ? err.message
        : 'Unable to access microphone. Please check permissions.'
    );
  }
};

const stopRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    setIsRecording(false);
  }
};

const sendAudioToAPI = async (audioBlob: Blob) => {
  try {
    // Convert blob to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];

      const res = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioContent: base64Audio,
          languageCode: sourceLang,
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Speech recognition failed');
        return;
      }

      const data = await res.json();
      if (data.text) {
        setText(data.text);
      } else {
        setRecordingError('No speech detected. Please try again.');
      }
    };
    reader.readAsDataURL(audioBlob);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to process audio');
  }
};
```

#### 4. Add Recording Button UI

Add this button section in the JSX right after the **Delimiter Input** section and before the **Input Text Area**:

```typescript
{/* Microphone Recording Section */}
<div className="mb-8">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
    Or use your microphone
  </label>
  <button
    onClick={isRecording ? stopRecording : startRecording}
    className={`w-full py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-bold text-white ${
      isRecording
        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
    }`}
  >
    {isRecording ? (
      <>
        <Square className="w-5 h-5 animate-pulse" />
        Stop Recording
      </>
    ) : (
      <>
        <Mic className="w-5 h-5" />
        Start Recording
      </>
    )}
  </button>
  {recordingError && (
    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{recordingError}</p>
  )}
  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
    Click to start recording in {LANGUAGES[sourceLang as keyof typeof LANGUAGES].name}. Click again to finish.
  </p>
</div>
```

---

## Environment Configuration

### Local Development

1. Ensure your `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set to your service account JSON file path
2. Or use `GOOGLE_CREDENTIALS_BASE64` with your base64-encoded credentials

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add your existing `GOOGLE_CREDENTIALS_BASE64` variable (if not already there)
   - This same variable will be used for both Translation, Text-to-Speech, and Speech-to-Text APIs
4. Redeploy your application

---

## Testing

### Local Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Test the microphone recording:
   - Select a language from the dropdown
   - Click **Start Recording**
   - Speak clearly in that language
   - Click **Stop Recording**
   - The transcribed text should appear in the textarea

### Test Speech Recognition

Test with different audio samples:

- **Clear speech**: Speak slowly and clearly
- **Accented speech**: Test with different accents
- **Background noise**: Test in a slightly noisy environment to see accuracy impact
- **Different languages**: Try English, Turkish, Spanish, and French

### Troubleshooting Tests

If speech recognition returns empty text:
- Check the browser console for errors
- Verify microphone is enabled and working
- Try speaking more clearly
- Check that the correct language is selected

---

## Troubleshooting

### Issue: "Unable to access microphone"

**Solution**:
- Check browser permissions for microphone access
- Try in a different browser
- Ensure you're using HTTPS (required for microphone access on production)
- Test with a different website's microphone feature to verify hardware works

### Issue: Speech not being recognized

**Possible causes**:
- Speaking too quietly - speak louder and clearer
- Wrong language selected - ensure the language matches your speech
- Microphone quality - try a better quality microphone
- API quota exceeded - check Google Cloud Console for quota usage

**Solution**:
- Check [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Quotas**
- Verify Speech-to-Text API quota limits
- Consider increasing quota if needed

### Issue: Audio encoding errors

**Solution**:
- Ensure the audio encoding matches what's being sent
- The `WEBM_OPUS` encoding is standard for browser MediaRecorder
- If using different audio, adjust the `encoding` parameter in the API call

### Issue: "Unsupported language" error

**Solution**:
- Only English (en), Turkish (tr), Spanish (es), and French (fr) are currently supported
- Add more language codes by updating the `languageCodeMap` in the API route

### Issue: API returns 500 error

**Solution**:
- Check server logs for the actual error
- Verify service account has `Cloud Speech-to-Text User` role
- Ensure `GOOGLE_CREDENTIALS_BASE64` or `GOOGLE_APPLICATION_CREDENTIALS` is properly set
- Check that Speech-to-Text API is enabled in Google Cloud Console

---

## Advanced Features (Optional)

### Add Real-Time Speech Recognition

For streaming speech recognition during recording (shows text as you speak):

1. Use WebSocket connection to the API
2. Send audio chunks as they're recorded
3. Return partial results in real-time

### Add Confidence Threshold

Filter out low-confidence results:

```typescript
if (data.confidence < 0.7) {
  setError('Low confidence in speech recognition. Please try again.');
  return;
}
```

### Add Audio Playback Visualization

Show waveform while recording using `analyser` from Web Audio API.

### Support Multiple File Upload Formats

Allow users to upload pre-recorded audio files (MP3, WAV, etc.).

---

## Related Documentation

- [Google Cloud Speech-to-Text API](https://cloud.google.com/speech-to-text/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech/docs)

---

## Summary of Changes

| Component | Change | File |
|-----------|--------|------|
| API Endpoint | Create new Speech-to-Text endpoint | `app/api/speech-to-text/route.ts` |
| Frontend | Add microphone recording UI | `app/page.tsx` |
| Frontend | Add recording state management | `app/page.tsx` |
| Frontend | Add audio processing and API calls | `app/page.tsx` |
| Google Cloud | Enable Speech-to-Text API | Google Cloud Console |
| Google Cloud | Update Service Account roles | Google Cloud Console |
| Dependencies | Add Speech-to-Text client | `package.json` |

---

## Next Steps

1. Follow the Google Cloud Project Setup section to enable the API
2. Install the dependency
3. Create the API endpoint file
4. Update the frontend with recording UI and handlers
5. Test locally with microphone access
6. Deploy to Vercel and verify on production

