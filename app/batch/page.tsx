'use client';
import { useEffect, useState } from 'react';

interface Episode {
  filename: string;
  title: string;
  text: string;
}

type EpisodeStatus = 'pending' | 'translating' | 'generating' | 'done' | 'error';
type Mode = 'standard' | 'drill' | 'immersion';

interface EpisodeState {
  episode: Episode;
  status: EpisodeStatus;
  error?: string;
  audioUrl?: string;
}

const LANGUAGES = { en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French' };

const MODES: { value: Mode; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Source → pause → target' },
  { value: 'drill',    label: 'Drill',    description: 'Source → target × 3 rapid' },
  { value: 'immersion',label: 'Immersion',description: 'Target only, repeated' },
];

function Slider({ label, value, min, max, step, onChange, disabled, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; disabled: boolean; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span><span className="text-white font-medium">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} disabled={disabled}
        className="w-full accent-purple-500 disabled:opacity-50" />
    </div>
  );
}

export default function BatchPage() {
  const [episodes, setEpisodes] = useState<EpisodeState[]>([]);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('tr');
  const [mode, setMode] = useState<Mode>('standard');
  const [sourceSpeed, setSourceSpeed] = useState(0.9);
  const [targetSpeed, setTargetSpeed] = useState(0.85);
  const [repeatCount, setRepeatCount] = useState(1);
  const [pauseDuration, setPauseDuration] = useState(1200);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/episodes')
      .then(r => r.json())
      .then(({ episodes: eps }: { episodes: Episode[] }) =>
        setEpisodes(eps.map(ep => ({ episode: ep, status: 'pending' })))
      );
  }, []);

  const updateStatus = (index: number, patch: Partial<EpisodeState>) =>
    setEpisodes(prev => prev.map((e, i) => i === index ? { ...e, ...patch } : e));

  async function runBatch() {
    setRunning(true);
    for (let i = 0; i < episodes.length; i++) {
      if (episodes[i].status === 'done') continue;
      setCurrentIndex(i);
      const { episode } = episodes[i];

      updateStatus(i, { status: 'translating', error: undefined });

      const transRes = await fetch('/api/v3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: episode.text, sourceLang, targetLang, delimiter: '$$' }),
      });

      if (!transRes.ok) {
        const err = await transRes.json().catch(() => ({ error: 'Translation failed' }));
        updateStatus(i, { status: 'error', error: err.error ?? 'Translation failed' });
        continue;
      }

      updateStatus(i, { status: 'generating' });

      const audioRes = await fetch('/api/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: episode.text, sourceLang, targetLang, delimiter: '$$',
          mode, sourceSpeed, targetSpeed, repeatCount, pauseDuration,
        }),
      });

      if (!audioRes.ok) {
        const err = await audioRes.json().catch(() => ({ error: 'Audio generation failed' }));
        updateStatus(i, { status: 'error', error: err.error ?? 'Audio generation failed' });
        continue;
      }

      const blob = await audioRes.blob();
      updateStatus(i, { status: 'done', audioUrl: URL.createObjectURL(blob) });
    }
    setRunning(false);
    setCurrentIndex(null);
  }

  function reset() {
    setEpisodes(prev => prev.map(e => ({ ...e, status: 'pending', audioUrl: undefined, error: undefined })));
  }

  const done = episodes.filter(e => e.status === 'done').length;
  const errors = episodes.filter(e => e.status === 'error').length;

  const statusIcon: Record<EpisodeStatus, string> = {
    pending: '○', translating: '⟳', generating: '⟳', done: '✓', error: '✗',
  };
  const statusColor: Record<EpisodeStatus, string> = {
    pending: 'text-gray-500',
    translating: 'text-yellow-400',
    generating: 'text-blue-400',
    done: 'text-green-400',
    error: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Batch Episode Generator</h1>
          <p className="text-gray-400 text-sm">{episodes.length} episodes · {done} done{errors > 0 ? ` · ${errors} errors` : ''}</p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-xl p-5 mb-4 space-y-5">

          {/* Languages */}
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} disabled={running}
                className="px-3 py-2 bg-gray-700 rounded-lg text-sm text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500">
                {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)} disabled={running}
                className="px-3 py-2 bg-gray-700 rounded-lg text-sm text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500">
                {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Mode</label>
            <div className="flex gap-2 flex-wrap">
              {MODES.map(m => (
                <button key={m.value} onClick={() => !running && setMode(m.value)} disabled={running}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${mode === m.value ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'} disabled:opacity-50`}>
                  {m.label}
                  <span className="ml-1.5 text-xs opacity-60">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Slider label="Source speed" value={sourceSpeed} min={0.5} max={1.5} step={0.05}
              onChange={setSourceSpeed} disabled={running} format={v => `${v.toFixed(2)}×`} />
            <Slider label="Target speed" value={targetSpeed} min={0.5} max={1.5} step={0.05}
              onChange={setTargetSpeed} disabled={running} format={v => `${v.toFixed(2)}×`} />
            <Slider label="Repeat count" value={repeatCount} min={1} max={5} step={1}
              onChange={setRepeatCount} disabled={running} format={v => `${v}×`} />
            <Slider label="Pause duration" value={pauseDuration} min={200} max={3000} step={100}
              onChange={setPauseDuration} disabled={running} format={v => `${v}ms`} />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-1">
            {done > 0 && !running && (
              <button onClick={reset}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition">
                Reset
              </button>
            )}
            <button onClick={running ? undefined : runBatch} disabled={running || episodes.length === 0}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition">
              {running ? `Generating… (${done}/${episodes.length})` : done > 0 ? 'Resume' : 'Generate All'}
            </button>
          </div>
        </div>

        {/* Episode list */}
        <div className="space-y-2">
          {episodes.map((es, i) => (
            <div key={es.episode.filename}
              className={`bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 transition ${i === currentIndex ? 'ring-2 ring-purple-500' : ''}`}>
              <span className={`text-base font-mono w-5 text-center shrink-0 ${statusColor[es.status]}`}>
                {statusIcon[es.status]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{es.episode.title}</p>
                {es.status === 'translating' && <p className="text-xs text-yellow-400">Translating…</p>}
                {es.status === 'generating' && <p className="text-xs text-blue-400">Generating audio…</p>}
                {es.error && <p className="text-xs text-red-400">{es.error}</p>}
              </div>
              {es.audioUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <audio controls src={es.audioUrl} className="h-7 w-40" />
                  <a href={es.audioUrl} download={es.episode.filename.replace('.md', '.mp3')}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition">
                    Save
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
