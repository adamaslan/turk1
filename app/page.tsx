'use client';
import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [src, setSrc] = useState('en');
  const [tgt, setTgt] = useState('tr');
  const [loading, setLoading] = useState(false);

  const swapLangs = () => { setSrc(tgt); setTgt(src); };

  const handleDownload = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ text, sourceLang: src, targetLang: tgt }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-track-${src}-${tgt}.mp3`;
      a.click();
    } catch (e) { alert("Generation failed."); }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-8 text-slate-900">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Polyglot MP3 Generator</h1>
        
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
          <select value={src} onChange={(e) => setSrc(e.target.value)} className="p-2 outline-none">
            <option value="en">English</option><option value="tr">Turkish</option><option value="es">Spanish</option>
          </select>
          <button onClick={swapLangs} className="p-2 hover:bg-slate-100 rounded-full">⇄</button>
          <select value={tgt} onChange={(e) => setTgt(e.target.value)} className="p-2 outline-none">
            <option value="en">English</option><option value="tr">Turkish</option><option value="es">Spanish</option>
          </select>
        </div>

        <textarea 
          className="w-full p-4 border rounded-xl shadow-inner h-40 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Enter text to translate and vocalize..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button 
          onClick={handleDownload}
          disabled={loading || !text}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {loading ? 'Processing Cloud Audio...' : 'Download Learning Track'}
        </button>
      </div>
    </main>
  );
}