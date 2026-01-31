'use client';
import { useState } from 'react';
import { Download, Volume2, Copy, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
}

const LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
};

export default function Home() {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('tr');

  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioLoading, setAudioLoading] = useState<'source' | 'target' | null>(null);
  const [copied, setCopied] = useState<'source' | 'target' | null>(null);

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (result) {
      setResult({
        ...result,
        original: result.translated,
        translated: result.original,
        sourceLang: targetLang,
        targetLang: sourceLang,
      });
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    if (sourceLang === targetLang) {
      setError('Source and target languages must be different');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          sourceLang,
          targetLang,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (type: 'source' | 'target') => {
    if (!result) return;

    setAudioLoading(type);
    try {
      const textToSpeak = type === 'source' ? result.original : result.translated;
      const lang = type === 'source' ? result.sourceLang : result.targetLang;

      const res = await fetch('/api/v2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          languageCode: lang,
        }),
      });

      if (!res.ok) {
        throw new Error('Audio generation failed');
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch (err) {
      setError('Failed to generate audio');
    } finally {
      setAudioLoading(null);
    }
  };

  const handleCopyText = (text: string, type: 'source' | 'target') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadCSV = () => {
    if (!result) return;

    const rows = [
      ['Original', 'Translation'],
      [result.original, result.translated],
    ];

    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-${result.sourceLang}-${result.targetLang}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Polyglot Translator</h1>
          <p className="text-lg text-gray-600">Translate text and hear it spoken in multiple languages</p>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {/* Language Selection */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                    <option key={code} value={code}>
                      {flag} {name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={swapLanguages}
                className="mt-6 sm:mt-8 p-3 hover:bg-gray-100 rounded-full transition duration-200 transform hover:scale-110"
                title="Swap languages"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                    <option key={code} value={code}>
                      {flag} {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Input Text Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Text to translate</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to translate and hear pronounced..."
              className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              rows={4}
            />
            <p className="mt-2 text-sm text-gray-500">{text.length} characters</p>
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate & Compare'
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="mt-8 space-y-6 border-t pt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Text */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {LANGUAGES[result.sourceLang as keyof typeof LANGUAGES].flag} Original
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlayAudio('source')}
                        disabled={audioLoading === 'source'}
                        className="p-2 hover:bg-white rounded-lg transition disabled:opacity-50"
                        title="Play pronunciation"
                      >
                        {audioLoading === 'source' ? (
                          <Loader className="w-5 h-5 animate-spin text-blue-600" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyText(result.original, 'source')}
                        className="p-2 hover:bg-white rounded-lg transition"
                        title="Copy text"
                      >
                        {copied === 'source' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 text-lg leading-relaxed">{result.original}</p>
                </div>

                {/* Translated Text */}
                <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {LANGUAGES[result.targetLang as keyof typeof LANGUAGES].flag} Translation
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlayAudio('target')}
                        disabled={audioLoading === 'target'}
                        className="p-2 hover:bg-white rounded-lg transition disabled:opacity-50"
                        title="Play pronunciation"
                      >
                        {audioLoading === 'target' ? (
                          <Loader className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-indigo-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyText(result.translated, 'target')}
                        className="p-2 hover:bg-white rounded-lg transition"
                        title="Copy text"
                      >
                        {copied === 'target' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 text-lg leading-relaxed">{result.translated}</p>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadCSV}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download as CSV
              </button>
            </div>
          )}

          {/* Welcome Message */}
          {!result && !loading && (
            <div className="mt-12 text-center text-gray-500">
              <p>Enter text above to get started with translation and audio playback</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}