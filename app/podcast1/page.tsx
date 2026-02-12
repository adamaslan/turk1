'use client';
import { useState } from 'react';
import { Download, Volume2, Copy, AlertCircle, CheckCircle, Loader, Moon, Sun, FileText, Repeat, Headphones, Zap } from 'lucide-react';

interface PhrasePair {
    original: string;
    translated: string;
}

interface TranslationResult {
    phrasePairs: PhrasePair[];
    sourceLang: string;
    targetLang: string;
}

const LANGUAGES = {
    en: { name: 'English', flag: '🇺🇸' },
    fr: { name: 'French', flag: '🇫🇷' },
    es: { name: 'Spanish', flag: '🇪🇸' },
    tr: { name: 'Turkish', flag: '🇹🇷' },
};

const LEARNING_MODES = {
    standard: {
        name: 'Standard',
        icon: Headphones,
        description: 'English → pause → French (clear and methodical)',
        pauseDuration: 1200,
        repeatCount: 1,
        sourceSpeed: 0.9,
        targetSpeed: 0.85,
    },
    drill: {
        name: 'Drill Mode',
        icon: Zap,
        description: 'English → French × 3 (rapid repetition for muscle memory)',
        pauseDuration: 800,
        repeatCount: 1,
        sourceSpeed: 0.95,
        targetSpeed: 0.9,
    },
    immersion: {
        name: 'Immersion',
        icon: Volume2,
        description: 'French only × 2 (advanced - no English)',
        pauseDuration: 1000,
        repeatCount: 2,
        sourceSpeed: 1.0,
        targetSpeed: 0.9,
    },
};

export default function FrenchPodcastApp() {
    const [text, setText] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('fr');
    const [delimiter, setDelimiter] = useState('$$');
    const [darkMode, setDarkMode] = useState(true);
    const [learningMode, setLearningMode] = useState<keyof typeof LEARNING_MODES>('standard');

    // Advanced settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customPause, setCustomPause] = useState(1200);
    const [customRepeat, setCustomRepeat] = useState(1);
    const [sourceSpeed, setSourceSpeed] = useState(0.9);
    const [targetSpeed, setTargetSpeed] = useState(0.85);

    const [result, setResult] = useState<TranslationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioLoading, setAudioLoading] = useState<number | 'all' | null>(null);
    const [copied, setCopied] = useState<number | null>(null);

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
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text.trim(),
                    sourceLang,
                    targetLang,
                    delimiter: delimiter.trim() || '$$'
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

    const handlePlayAudio = async (index: number) => {
        if (!result) return;

        setAudioLoading(index);
        try {
            const pair = result.phrasePairs[index];
            const mode = LEARNING_MODES[learningMode];

            const res = await fetch('/api/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: pair.original,
                    sourceLang: result.sourceLang,
                    targetLang: result.targetLang,
                    delimiter: '|||UNIQUE|||',
                    pauseDuration: showAdvanced ? customPause : mode.pauseDuration,
                    repeatCount: showAdvanced ? customRepeat : mode.repeatCount,
                    sourceSpeed: showAdvanced ? sourceSpeed : mode.sourceSpeed,
                    targetSpeed: showAdvanced ? targetSpeed : mode.targetSpeed,
                    mode: learningMode,
                }),
            });

            if (!res.ok) throw new Error('Audio generation failed');

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

    const handlePlayAllAudio = async () => {
        if (!result) return;

        setAudioLoading('all');
        try {
            const allText = result.phrasePairs.map(p => p.original).join(delimiter.trim() || '$$');
            const mode = LEARNING_MODES[learningMode];

            const res = await fetch('/api/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: allText,
                    sourceLang: result.sourceLang,
                    targetLang: result.targetLang,
                    delimiter: delimiter.trim() || '$$',
                    pauseDuration: showAdvanced ? customPause : mode.pauseDuration,
                    repeatCount: showAdvanced ? customRepeat : mode.repeatCount,
                    sourceSpeed: showAdvanced ? sourceSpeed : mode.sourceSpeed,
                    targetSpeed: showAdvanced ? targetSpeed : mode.targetSpeed,
                    mode: learningMode,
                }),
            });

            if (!res.ok) throw new Error('Audio generation failed');

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

    const handleCopyText = (index: number) => {
        if (!result) return;
        const pair = result.phrasePairs[index];
        const textToCopy = `${pair.original}\n${pair.translated}`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(index);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDownloadAudio = async () => {
        if (!result) return;

        try {
            const allText = result.phrasePairs.map(p => p.original).join(delimiter.trim() || '$$');
            const mode = LEARNING_MODES[learningMode];

            const res = await fetch('/api/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: allText,
                    sourceLang: result.sourceLang,
                    targetLang: result.targetLang,
                    delimiter: delimiter.trim() || '$$',
                    pauseDuration: showAdvanced ? customPause : mode.pauseDuration,
                    repeatCount: showAdvanced ? customRepeat : mode.repeatCount,
                    sourceSpeed: showAdvanced ? sourceSpeed : mode.sourceSpeed,
                    targetSpeed: showAdvanced ? targetSpeed : mode.targetSpeed,
                    mode: learningMode,
                }),
            });

            if (!res.ok) throw new Error('Audio download failed');

            const audioBlob = await res.blob();
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `french-podcast-${learningMode}-${Date.now()}.mp3`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to download audio');
        }
    };

    const handleDownloadCSV = () => {
        if (!result) return;

        const rows = [
            ['English', 'French'],
            ...result.phrasePairs.map(pair => [pair.original, pair.translated])
        ];

        const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulary-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const [podcastCopied, setPodcastCopied] = useState(false);

    const handleCopyPodcastFormat = () => {
        if (!result) return;

        // Get episode title if it's the first phrase
        const firstPair = result.phrasePairs[0];
        const isEpisodeTitle = firstPair.original.toLowerCase().includes('episode');

        // Build the formatted text
        let podcastText = '';

        // Add episode header if first phrase is an episode title
        if (isEpisodeTitle) {
            podcastText = `**${firstPair.original} — ${firstPair.translated}**\n\n`;
        }

        // Add all phrases as numbered list with em dash separator
        const numberedList = result.phrasePairs.map((pair, index) =>
            `${index + 1}. ${pair.original} — ${pair.translated}`
        );

        podcastText += numberedList.join('\n');

        navigator.clipboard.writeText(podcastText);
        setPodcastCopied(true);
        setTimeout(() => setPodcastCopied(false), 2000);
    };

    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900 transition-colors duration-200">
                <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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

                        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-3">
                            10,000 French Words
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                            Podcast Audio Generator for Language Learning
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            Optimized for native voice pronunciation with intelligent pauses
                        </p>
                    </div>

                    {/* Main Container */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 transition-colors duration-200">

                        {/* Learning Mode Selection */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Learning Mode
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.entries(LEARNING_MODES).map(([key, mode]) => {
                                    const Icon = mode.icon;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setLearningMode(key as keyof typeof LEARNING_MODES)}
                                            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${learningMode === key
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Icon className={`w-5 h-5 ${learningMode === key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                                                <span className={`font-semibold ${learningMode === key ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {mode.name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {mode.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Language Selection */}
                        <div className="mb-6">
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

                        {/* Delimiter Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phrase Delimiter
                            </label>
                            <input
                                type="text"
                                value={delimiter}
                                onChange={(e) => setDelimiter(e.target.value)}
                                placeholder="e.g., $$ or / or |"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Recommended: "$$" for podcast episodes (paste directly from episode scripts)
                            </p>
                        </div>

                        {/* Advanced Settings Toggle */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="mb-4 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                        >
                            {showAdvanced ? '▼' : '▶'} Advanced Settings (custom timing & speed)
                        </button>

                        {showAdvanced && (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Pause Duration (ms)
                                        </label>
                                        <input
                                            type="number"
                                            value={customPause}
                                            onChange={(e) => setCustomPause(Number(e.target.value))}
                                            min="200"
                                            max="3000"
                                            step="100"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Repeat Count
                                        </label>
                                        <input
                                            type="number"
                                            value={customRepeat}
                                            onChange={(e) => setCustomRepeat(Number(e.target.value))}
                                            min="1"
                                            max="5"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            English Speed ({sourceSpeed}x)
                                        </label>
                                        <input
                                            type="range"
                                            value={sourceSpeed}
                                            onChange={(e) => setSourceSpeed(Number(e.target.value))}
                                            min="0.5"
                                            max="1.5"
                                            step="0.05"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            French Speed ({targetSpeed}x)
                                        </label>
                                        <input
                                            type="range"
                                            value={targetSpeed}
                                            onChange={(e) => setTargetSpeed(Number(e.target.value))}
                                            min="0.5"
                                            max="1.5"
                                            step="0.05"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Input Text Area */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Paste Episode Script or Vocabulary
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={`Paste your vocabulary here...\n\nExample:\nto arrive $$ arriver $$ I just arrived $$ Je viens d'arriver`}
                                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none font-mono text-sm"
                                rows={6}
                            />
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {text.length} characters
                                {delimiter.trim() && text.includes(delimiter.trim()) &&
                                    ` • ${text.split(delimiter.trim()).filter(p => p.trim()).length} phrases`}
                            </p>
                        </div>

                        {/* Translate Button */}
                        <button
                            onClick={handleTranslate}
                            disabled={loading || !text.trim()}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Translating & Preparing Audio...
                                </>
                            ) : (
                                'Generate Podcast Audio'
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
                        {result && result.phrasePairs.length > 0 && (
                            <div className="mt-8 space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">

                                {/* Quick Actions */}
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handlePlayAllAudio}
                                        disabled={audioLoading !== null}
                                        className="flex-1 min-w-[200px] bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        {audioLoading === 'all' ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Playing...
                                            </>
                                        ) : (
                                            <>
                                                <Volume2 className="w-5 h-5" />
                                                Play Full Episode ({learningMode})
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleDownloadAudio}
                                        className="flex-1 min-w-[200px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download MP3 ({learningMode})
                                    </button>
                                </div>

                                {/* Phrase Pairs */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Vocabulary ({result.phrasePairs.length} phrases)
                                    </h3>
                                    {result.phrasePairs.map((pair, index) => (
                                        <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                                                            #{index + 1}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {LANGUAGES[result.sourceLang as keyof typeof LANGUAGES].flag} → {LANGUAGES[result.targetLang as keyof typeof LANGUAGES].flag}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{pair.original}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-semibold">{pair.translated}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handlePlayAudio(index)}
                                                        disabled={audioLoading !== null}
                                                        className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                                                        title="Play this phrase"
                                                    >
                                                        {audioLoading === index ? (
                                                            <Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                                                        ) : (
                                                            <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCopyText(index)}
                                                        className="p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition"
                                                        title="Copy both texts"
                                                    >
                                                        {copied === index ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Export Options */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={handleDownloadCSV}
                                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-5 h-5" />
                                        Export as CSV
                                    </button>

                                    <button
                                        onClick={handleCopyPodcastFormat}
                                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                                    >
                                        {podcastCopied ? (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-5 h-5" />
                                                Copy Numbered List
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Welcome Message */}
                        {!result && !loading && (
                            <div className="mt-12 text-center space-y-4">
                                <div className="inline-block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                    <Headphones className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Ready to Create Your French Podcast Episode
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                    Paste your episode script above, choose a learning mode, and generate professional audio with native French pronunciation.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Native voices</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Adjustable speed</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Smart pauses</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}