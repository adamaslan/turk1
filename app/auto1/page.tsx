'use client';
import { useState } from 'react';
import { Download, Volume2, Copy, AlertCircle, CheckCircle, Loader, Moon, Sun, FileText, Headphones, Zap } from 'lucide-react';

interface PhrasePair {
    original: string;
    translated: string;
}

interface TranslationResult {
    phrasePairs: PhrasePair[];
    sourceLang: string;
    targetLang: string;
}

interface EpisodeMetadata {
    episodeNumber: number;
    title: string;
    wordCount: number;
    duration: string;
}

const LANGUAGES = {
    en: { name: 'English', flag: '🇺🇸' },
    es: { name: 'Spanish', flag: '🇪🇸' },
    fr: { name: 'French', flag: '🇫🇷' },
    de: { name: 'German', flag: '🇩🇪' },
    it: { name: 'Italian', flag: '🇮🇹' },
    pt: { name: 'Portuguese', flag: '🇵🇹' },
    ru: { name: 'Russian', flag: '🇷🇺' },
    ja: { name: 'Japanese', flag: '🇯🇵' },
    ko: { name: 'Korean', flag: '🇰🇷' },
    zh: { name: 'Chinese', flag: '🇨🇳' },
    ar: { name: 'Arabic', flag: '🇸🇦' },
    hi: { name: 'Hindi', flag: '🇮🇳' },
    tr: { name: 'Turkish', flag: '🇹🇷' },
    nl: { name: 'Dutch', flag: '🇳🇱' },
    pl: { name: 'Polish', flag: '🇵🇱' },
    sv: { name: 'Swedish', flag: '🇸🇪' },
    no: { name: 'Norwegian', flag: '🇳🇴' },
    da: { name: 'Danish', flag: '🇩🇰' },
    fi: { name: 'Finnish', flag: '🇫🇮' },
    el: { name: 'Greek', flag: '🇬🇷' },
};

const LEARNING_MODES = {
    standard: {
        name: 'Standard',
        icon: Headphones,
        description: 'English → pause → French',
        pauseDuration: 1200,
        sourceSpeed: 1,
        targetSpeed: 0.8,
    },
    drill: {
        name: 'Drill',
        icon: Zap,
        description: 'English → French × 3',
        pauseDuration: 800,
        sourceSpeed: 0.95,
        targetSpeed: .85,
    },
    immersion: {
        name: 'Immersion',
        icon: Volume2,
        description: 'French only × 2',
        pauseDuration: 1000,
        sourceSpeed: 1.0,
        targetSpeed: 0.9,
    }
};

const EPISODE_METADATA: Record<number, any> = {
    1: { title: 'The Arrival', theme: 'Travel, Airport, First Interactions' },
    2: { title: 'The Street', theme: 'Urban Life, Sensory Descriptions, Observation' },
    3: { title: 'The Cafe', theme: 'Food, Drinks, Ordering, Culture' },
    4: { title: 'The Market', theme: 'Shopping, Food, Numbers, Colors' },
    5: { title: 'The Body in Motion', theme: 'Movement, Dance, Body Parts, Exercise' },
    6: { title: 'Daily Routine', theme: 'Morning, Evening, Daily Activities' },
    7: { title: 'The Weather', theme: 'Seasons, Climate, Forecasts' },
    8: { title: 'Family & Friends', theme: 'Relationships, Introductions' },
    9: { title: 'Work & Study', theme: 'Office, School, Professional Life' },
    10: { title: 'Health & Wellness', theme: 'Doctor, Pharmacy, Fitness' },
};

export default function Home() {
    const [text, setText] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('fr');
    const [delimiter, setDelimiter] = useState('$$');
    const [darkMode, setDarkMode] = useState(true);
    const [learningMode, setLearningMode] = useState<keyof typeof LEARNING_MODES>('standard');

    const [result, setResult] = useState<TranslationResult | null>(null);
    const [episodeMetadata, setEpisodeMetadata] = useState<EpisodeMetadata | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [audioLoading, setAudioLoading] = useState<number | 'all' | null>(null);
    const [copied, setCopied] = useState<number | null>(null);

    // Auto-detect episode metadata
    const detectEpisodeMetadata = (text: string): EpisodeMetadata | null => {
        const match = text.match(/Episode (\d+)/i);
        if (!match) return null;

        const episodeNumber = parseInt(match[1]);
        const phrases = text.split(delimiter.trim()).filter(p => p.trim());
        const wordCount = phrases.length;
        const duration = `${Math.ceil(wordCount * 0.06)}-${Math.ceil(wordCount * 0.08)} min`;

        return { episodeNumber, title: '', wordCount, duration };
    };

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
            setError('Please paste your episode text');
            return;
        }

        if (sourceLang === targetLang) {
            setError('Source and target languages must be different');
            return;
        }

        // Detect episode metadata
        const metadata = detectEpisodeMetadata(text);
        setEpisodeMetadata(metadata);

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

    const handleGenerateAudio = async (mode: keyof typeof LEARNING_MODES) => {
        if (!result) return;

        setAudioLoading('all');
        try {
            const allText = result.phrasePairs.map(p => p.original).join(delimiter.trim() || '$$');
            const modeConfig = LEARNING_MODES[mode];

            const res = await fetch('/api/v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: allText,
                    sourceLang: result.sourceLang,
                    targetLang: result.targetLang,
                    delimiter: delimiter.trim() || '$$',
                    pauseDuration: modeConfig.pauseDuration,
                    repeatCount: 1,
                    sourceSpeed: modeConfig.sourceSpeed,
                    targetSpeed: modeConfig.targetSpeed,
                    mode: mode
                }),
            });

            if (!res.ok) throw new Error('Audio generation failed');

            const audioBlob = await res.blob();
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;

            // Smart filename with episode number and languages
            const episodeNum = episodeMetadata?.episodeNumber || 1;
            a.download = `Episode-${episodeNum}-${result.sourceLang}-${result.targetLang}-${mode}.mp3`;
            a.click();
            URL.revokeObjectURL(url);

            // Show success message
            setError('');
        } catch (err) {
            setError('Failed to generate audio');
        } finally {
            setAudioLoading(null);
        }
    };

    const handleDownloadDescription = () => {
        if (!result || !episodeMetadata) return;

        const episodeNum = episodeMetadata.episodeNumber;
        const meta = EPISODE_METADATA[episodeNum];

        const sourceLangName = LANGUAGES[result.sourceLang as keyof typeof LANGUAGES]?.name || 'Source';
        const targetLangName = LANGUAGES[result.targetLang as keyof typeof LANGUAGES]?.name || 'Target';

        const description = meta
            ? `**Episode ${episodeNum}: ${meta.title}**

${meta.theme}

**Language Pair:** ${sourceLangName} → ${targetLangName}
**Vocabulary:** ${episodeMetadata.wordCount} essential words and phrases
**Duration:** ${episodeMetadata.duration}
**Level:** Beginner (A1-A2)

🎧 Listen and repeat after native pronunciation
📚 High-frequency vocabulary
✨ Perfect for daily practice`
            : `**Episode ${episodeNum}**

${sourceLangName} → ${targetLangName}

${episodeMetadata.wordCount} words and phrases

Duration: ${episodeMetadata.duration}
Level: Beginner (A1-A2)`;

        const blob = new Blob([description], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Episode-${episodeNum}-${result.sourceLang}-${result.targetLang}-description.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadScript = () => {
        if (!result || !episodeMetadata) return;

        const episodeNum = episodeMetadata.episodeNumber;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Episode-${episodeNum}-${result.sourceLang}-${result.targetLang}-script.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyNumberedList = () => {
        if (!result) return;

        const firstPair = result.phrasePairs[0];
        const isEpisodeTitle = firstPair.original.toLowerCase().includes('episode');

        let output = '';

        if (isEpisodeTitle) {
            output = `**${firstPair.original} — ${firstPair.translated}**\n\n`;
        }

        const numberedList = result.phrasePairs.map((pair, index) =>
            `${index + 1}. ${pair.original} — ${pair.translated}`
        );

        output += numberedList.join('\n');

        navigator.clipboard.writeText(output);
        setCopied(-1);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleGenerateAllModes = async () => {
        const modes: Array<keyof typeof LEARNING_MODES> = ['standard', 'drill', 'immersion'];

        for (const mode of modes) {
            await handleGenerateAudio(mode);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        }
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
                            🌍 Polyglot Podcast Studio
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                            Create language learning podcasts in any language
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            Transform vocabulary into native-voice audio • English • French • Spanish • Turkish • More
                        </p>
                        {episodeMetadata && (
                            <div className="mt-4 inline-block bg-white dark:bg-gray-800 px-6 py-3 rounded-full shadow-md">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    📊 Episode {episodeMetadata.episodeNumber} • {episodeMetadata.wordCount} words • {episodeMetadata.duration}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Main Container */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 transition-colors duration-200">

                        {/* Quick Setup Info */}
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">🚀 Quick Start:</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-400">
                                1. Select your language pair (English → French, Spanish → English, etc.)<br />
                                2. Paste your episode text below (format: "Episode 1: Title $$ word $$ example $$ ...")<br />
                                3. Click "Generate Episode Files" → Download MP3s, descriptions, and scripts!
                            </p>
                        </div>

                        {/* Language Selection - Simplified for French */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From</label>
                                    <select
                                        value={sourceLang}
                                        onChange={(e) => setSourceLang(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                                            <option key={code} value={code}>{flag} {name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={swapLanguages}
                                    className="mt-8 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                >
                                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                    </svg>
                                </button>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To</label>
                                    <select
                                        value={targetLang}
                                        onChange={(e) => setTargetLang(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                                            <option key={code} value={code}>{flag} {name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Delimiter - Pre-filled */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Delimiter (for separating phrases)
                            </label>
                            <input
                                type="text"
                                value={delimiter}
                                onChange={(e) => setDelimiter(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Default: $$ (recommended for podcast episodes)
                            </p>
                        </div>

                        {/* Episode Text Input */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Episode Text (source language, target auto-generated)
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste your episode text here...

Example (English → French):
Episode 1: The Arrival $$ to arrive $$ I just arrived in Paris $$ to leave $$ The plane leaves at 6 PM $$ ...

Example (Spanish → English):
Episodio 1: La Llegada $$ llegar $$ Acabo de llegar a París $$ salir $$ El avión sale a las 6 PM $$ ..."
                                className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                                rows={8}
                            />
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {text.length} characters
                                {delimiter.trim() && text.includes(delimiter.trim()) &&
                                    ` • ${text.split(delimiter.trim()).filter(p => p.trim()).length} phrases`}
                            </p>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleTranslate}
                            disabled={loading || !text.trim()}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Processing Episode...
                                </>
                            ) : (
                                '🚀 Generate Episode Files'
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

                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-green-900 dark:text-green-300">Episode Ready!</p>
                                            <p className="text-sm text-green-800 dark:text-green-400">
                                                {result.phrasePairs.length} phrases processed. Download files below.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Download All Files Section */}
                                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        📦 Download Episode Files
                                    </h3>

                                    {/* Audio Files */}
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">🎧 Audio Files (MP3)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {Object.entries(LEARNING_MODES).map(([key, mode]) => {
                                                const Icon = mode.icon;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => handleGenerateAudio(key as keyof typeof LEARNING_MODES)}
                                                        disabled={audioLoading !== null}
                                                        className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg p-3 transition flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                        <div className="text-left flex-1">
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mode.name}</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">{mode.description}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button
                                            onClick={handleGenerateAllModes}
                                            disabled={audioLoading !== null}
                                            className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 text-sm"
                                        >
                                            {audioLoading ? 'Generating...' : '📥 Download All 3 Modes'}
                                        </button>
                                    </div>

                                    {/* Text Files */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📄 Text Files</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                onClick={handleDownloadDescription}
                                                className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg p-3 transition text-left"
                                            >
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">📝 Description</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">For podcast platforms</p>
                                            </button>
                                            <button
                                                onClick={handleDownloadScript}
                                                className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg p-3 transition text-left"
                                            >
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">📜 Script</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Original episode text</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Copy Numbered List */}
                                <button
                                    onClick={handleCopyNumberedList}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                                >
                                    {copied === -1 ? (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Copied to Clipboard!
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-5 h-5" />
                                            Copy Numbered List (for notes/docs)
                                        </>
                                    )}
                                </button>

                                {/* Preview Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        👀 Episode Preview ({result.phrasePairs.length} phrases)
                                    </h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {result.phrasePairs.slice(0, 10).map((pair, index) => (
                                            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 text-sm">
                                                <span className="font-mono text-gray-500 dark:text-gray-400 mr-3">{index + 1}.</span>
                                                <span className="text-gray-900 dark:text-gray-100">{pair.original}</span>
                                                <span className="mx-2 text-gray-400">—</span>
                                                <span className="text-indigo-600 dark:text-indigo-400">{pair.translated}</span>
                                            </div>
                                        ))}
                                        {result.phrasePairs.length > 10 && (
                                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                                ... and {result.phrasePairs.length - 10} more phrases
                                            </p>
                                        )}
                                    </div>
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
                                    Ready to Create Your Language Podcast
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                    Choose your language pair, paste your episode text, and generate professional audio with native pronunciation.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">🇺🇸 → 🇫🇷 French</span>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">🇺🇸 → 🇪🇸 Spanish</span>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">🇺🇸 → 🇹🇷 Turkish</span>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">+ More</span>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}