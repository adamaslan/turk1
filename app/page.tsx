'use client';
import { useState } from 'react';
import { Download, Volume2, Copy, AlertCircle, CheckCircle, Loader, Moon, Sun } from 'lucide-react';

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
  const [darkMode, setDarkMode] = useState(true);

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
      // Use PUT for translation (returns JSON)
      const res = await fetch('/api/v2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          sourceLang,
          targetLang,
          delimiter: '|||SINGLE|||' // Won't split since it's a single phrase
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await res.json();

      // Extract first phrase pair for single translation
      if (data.phrasePairs && data.phrasePairs.length > 0) {
        setResult({
          original: data.phrasePairs[0].original,
          translated: data.phrasePairs[0].translated,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
        });
      }
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

      // Use POST for audio (returns binary blob)
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          sourceLang: lang,
          targetLang: lang, // Same language for single audio
          delimiter: '|||SINGLE|||',
          pauseDuration: 0
        }),
      });

      if (!res.ok) {
        throw new Error('Audio generation failed');
      }

      // Use blob() for binary audio data
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

  const handleDownloadAudio = async () => {
    if (!result) return;

    try {
      // Generate combined audio with both original and translation
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.original,
          sourceLang: result.sourceLang,
          targetLang: result.targetLang,
          delimiter: '|||SINGLE|||',
          pauseDuration: 800
        }),
      });

      if (!res.ok) {
        throw new Error('Audio download failed');
      }

      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-${result.sourceLang}-${result.targetLang}-${Date.now()}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download audio');
    }
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
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
        <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center relative">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="absolute right-0 top-0 p-3 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
              Polyglot Translator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Translate text and hear it spoken in multiple languages
            </p>
          </div>

          {/* Main Container */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-200">
            {/* Language Selection */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                  className="mt-6 sm:mt-8 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition duration-200 transform hover:scale-110"
                  title="Swap languages"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>

                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text to translate</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter the text you want to translate and hear pronounced..."
                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                rows={4}
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{text.length} characters</p>
            </div>

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={loading || !text.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div className="mt-8 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Text */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {LANGUAGES[result.sourceLang as keyof typeof LANGUAGES].flag} Original
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlayAudio('source')}
                          disabled={audioLoading === 'source'}
                          className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                          title="Play pronunciation"
                        >
                          {audioLoading === 'source' ? (
                            <Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyText(result.original, 'source')}
                          className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition"
                          title="Copy text"
                        >
                          {copied === 'source' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{result.original}</p>
                  </div>

                  {/* Translated Text */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {LANGUAGES[result.targetLang as keyof typeof LANGUAGES].flag} Translation
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePlayAudio('target')}
                          disabled={audioLoading === 'target'}
                          className="p-2 hover:bg-white dark:hover:bg-indigo-800 rounded-lg transition disabled:opacity-50"
                          title="Play pronunciation"
                        >
                          {audioLoading === 'target' ? (
                            <Loader className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyText(result.translated, 'target')}
                          className="p-2 hover:bg-white dark:hover:bg-indigo-800 rounded-lg transition"
                          title="Copy text"
                        >
                          {copied === 'target' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{result.translated}</p>
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleDownloadAudio}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Audio (MP3)
                  </button>

                  <button
                    onClick={handleDownloadCSV}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download as CSV
                  </button>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {!result && !loading && (
              <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
                <p>Enter text above to get started with translation and audio playback</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}