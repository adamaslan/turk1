'use client';
import { useState } from 'react';
import { Download, Volume2, Copy, AlertCircle, CheckCircle, Loader, Moon, Sun, FileText } from 'lucide-react';

interface PhrasePair {
  original: string;
  translated: string;
}

interface TranslationResult {
  phrasePairs: PhrasePair[];
  sourceLang: string;
  targetLang: string;
}

type Mode = 'standard' | 'drill' | 'immersion';

const LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  tr: { name: 'Turkish', flag: '🇹🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
};

const MODES: { value: Mode; label: string; description: string }[] = [
  { value: 'standard',  label: 'Standard',  description: 'Source → pause → target' },
  { value: 'drill',     label: 'Drill',     description: 'Source → target × 3 rapid' },
  { value: 'immersion', label: 'Immersion', description: 'Target only, repeated' },
];

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span className="text-gray-800 dark:text-gray-200 font-medium">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-500" />
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('tr');
  const [delimiter, setDelimiter] = useState('/');
  const [darkMode, setDarkMode] = useState(true);

  // v3 audio controls
  const [mode, setMode] = useState<Mode>('standard');
  const [sourceSpeed, setSourceSpeed] = useState(0.9);
  const [targetSpeed, setTargetSpeed] = useState(0.85);
  const [repeatCount, setRepeatCount] = useState(1);
  const [pauseDuration, setPauseDuration] = useState(1200);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioLoading, setAudioLoading] = useState<number | 'all' | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [podcastCopied, setPodcastCopied] = useState(false);

  const audioParams = () => ({
    sourceLang: result?.sourceLang ?? sourceLang,
    targetLang: result?.targetLang ?? targetLang,
    delimiter: delimiter.trim() || ',',
    mode, sourceSpeed, targetSpeed, repeatCount, pauseDuration,
  });

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (result) {
      setResult({
        ...result,
        phrasePairs: result.phrasePairs.map(pair => ({
          original: pair.translated,
          translated: pair.original,
        })),
        sourceLang: targetLang,
        targetLang: sourceLang,
      });
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) { setError('Please enter some text'); return; }
    if (sourceLang === targetLang) { setError('Source and target languages must be different'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/v3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), sourceLang, targetLang, delimiter: delimiter.trim() || ',' }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Translation failed');
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (index: number) => {
    if (!result) return;
    setAudioLoading(index);
    try {
      const res = await fetch('/api/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: result.phrasePairs[index].original,
          ...audioParams(),
          delimiter: '|||SINGLE|||',
        }),
      });
      if (!res.ok) throw new Error('Audio generation failed');
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setError('Failed to generate audio');
    } finally {
      setAudioLoading(null);
    }
  };

  const handlePlayAllAudio = async () => {
    if (!result) return;
    setAudioLoading('all');
    try {
      const allText = result.phrasePairs.map(p => p.original).join(delimiter.trim() || ',');
      const res = await fetch('/api/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allText, ...audioParams() }),
      });
      if (!res.ok) throw new Error('Audio generation failed');
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setError('Failed to generate audio');
    } finally {
      setAudioLoading(null);
    }
  };

  const handleDownloadAudio = async () => {
    if (!result) return;
    try {
      const allText = result.phrasePairs.map(p => p.original).join(delimiter.trim() || ',');
      const res = await fetch('/api/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allText, ...audioParams() }),
      });
      if (!res.ok) throw new Error('Audio download failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-${result.sourceLang}-${result.targetLang}-${Date.now()}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download audio');
    }
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    const rows = [['Original', 'Translation'], ...result.phrasePairs.map(p => [p.original, p.translated])];
    const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-${result.sourceLang}-${result.targetLang}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (index: number) => {
    if (!result) return;
    const { original, translated } = result.phrasePairs[index];
    navigator.clipboard.writeText(`${original}\n${translated}`);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyPodcastFormat = () => {
    if (!result) return;
    const text = result.phrasePairs
      .map((p, i) => `${i + 1}. Original: ${p.original}\n   Translation: ${p.translated}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setPodcastCopied(true);
    setTimeout(() => setPodcastCopied(false), 2000);
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
        <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8 text-center relative">
            <button onClick={() => setDarkMode(!darkMode)}
              className="absolute right-0 top-0 p-3 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200"
              title={darkMode ? 'Light mode' : 'Dark mode'}>
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
              Adam's Real Good Translator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">Translate text and hear it spoken in multiple languages</p>
            <div className="mt-4 flex justify-center gap-3">
              <a href="/auto1" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">Podcast Studio</a>
              <a href="/batch" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition">Batch Episodes</a>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 transition-colors duration-200">

            {/* Language Selection */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From</label>
                  <select value={sourceLang} onChange={e => setSourceLang(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition">
                    {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                      <option key={code} value={code}>{flag} {name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={swapLanguages}
                  className="mt-6 sm:mt-8 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition duration-200 transform hover:scale-110"
                  title="Swap languages">
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To</label>
                  <select value={targetLang} onChange={e => setTargetLang(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition">
                    {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                      <option key={code} value={code}>{flag} {name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Delimiter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phrase Delimiter</label>
              <input type="text" value={delimiter} onChange={e => setDelimiter(e.target.value)}
                placeholder='e.g., / or , or $$'
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Example: "hello / goodbye" with delimiter "/"</p>
            </div>

            {/* Text area */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Text to translate</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder={`Enter text... use "${delimiter}" to separate phrases`}
                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                rows={4} />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {text.length} characters
                {delimiter.trim() && text.includes(delimiter.trim()) &&
                  ` • ${text.split(delimiter.trim()).filter(p => p.trim()).length} phrases`}
              </p>
            </div>

            {/* Advanced audio controls */}
            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <span>Audio settings</span>
                <span className="text-xs text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 pt-2 space-y-4 bg-gray-50 dark:bg-gray-700/30">
                  {/* Mode */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Mode</p>
                    <div className="flex gap-2 flex-wrap">
                      {MODES.map(m => (
                        <button key={m.value} onClick={() => setMode(m.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${mode === m.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                          {m.label}
                          <span className="ml-1 opacity-60">{m.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <Slider label="Source speed" value={sourceSpeed} min={0.5} max={1.5} step={0.05}
                      onChange={setSourceSpeed} format={v => `${v.toFixed(2)}×`} />
                    <Slider label="Target speed" value={targetSpeed} min={0.5} max={1.5} step={0.05}
                      onChange={setTargetSpeed} format={v => `${v.toFixed(2)}×`} />
                    <Slider label="Repeat count" value={repeatCount} min={1} max={5} step={1}
                      onChange={setRepeatCount} format={v => `${v}×`} />
                    <Slider label="Pause duration" value={pauseDuration} min={200} max={3000} step={100}
                      onChange={setPauseDuration} format={v => `${v}ms`} />
                  </div>
                </div>
              )}
            </div>

            {/* Translate button */}
            <button onClick={handleTranslate} disabled={loading || !text.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2">
              {loading ? <><Loader className="w-5 h-5 animate-spin" />Translating...</> : 'Translate'}
            </button>

            {/* Error */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Results */}
            {result && result.phrasePairs.length > 0 && (
              <div className="mt-8 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">

                {result.phrasePairs.length > 1 && (
                  <button onClick={handlePlayAllAudio} disabled={audioLoading !== null}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                    {audioLoading === 'all'
                      ? <><Loader className="w-5 h-5 animate-spin" />Playing...</>
                      : <><Volume2 className="w-5 h-5" />Play All Phrases</>}
                  </button>
                )}

                <div className="space-y-4">
                  {result.phrasePairs.map((pair, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {LANGUAGES[result.sourceLang as keyof typeof LANGUAGES].flag} Original
                            </div>
                            <p className="text-gray-900 dark:text-gray-100">{pair.original}</p>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              {LANGUAGES[result.targetLang as keyof typeof LANGUAGES].flag} Translation
                            </div>
                            <p className="text-indigo-700 dark:text-indigo-300 font-medium">{pair.translated}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handlePlayAudio(index)} disabled={audioLoading !== null}
                            className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                            title="Play this phrase">
                            {audioLoading === index
                              ? <Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                              : <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          </button>
                          <button onClick={() => handleCopyText(index)}
                            className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition"
                            title="Copy both texts">
                            {copied === index
                              ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                              : <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button onClick={handleDownloadAudio}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />Download Audio (MP3)
                  </button>
                  <button onClick={handleDownloadCSV}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />Download as CSV
                  </button>
                  <button onClick={handleCopyPodcastFormat}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2">
                    {podcastCopied
                      ? <><CheckCircle className="w-5 h-5" />Copied!</>
                      : <><FileText className="w-5 h-5" />Copy for Podcast</>}
                  </button>
                </div>
              </div>
            )}

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
