import { useEffect, useState } from 'react';

/**
 * This React app is the Vite build entry.
 * The REAL dashboard (dashboard.html) is served by server.js on port 3000.
 * This page explains how to run the full stack and shows the architecture.
 */
export default function App() {
  const [copied, setCopied] = useState('');

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  useEffect(() => {
    document.title = '⛏️ Minecraft Bot Manager — Setup';
  }, []);

  const CodeBlock = ({ code, label }: { code: string; label: string }) => (
    <div className="relative group">
      <pre className="bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm font-mono text-sky-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copy(code, label)}
        className="absolute top-2 right-2 bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/30 text-sky-300 text-xs px-3 py-1 rounded-lg transition-all"
      >
        {copied === label ? '✅ Copied!' : '📋 Copy'}
      </button>
    </div>
  );

  const files = [
    { name: 'botManager.js', icon: '🧠', desc: 'Mineflayer bot class with health, spawn, movement loop & Socket.io emit' },
    { name: 'server.js',     icon: '🌉', desc: 'Express + Socket.io bridge. Handles add-bot, saves to bots.json' },
    { name: 'public/dashboard.html', icon: '🖥️', desc: 'Real-time UI — zero hardcoded data, pure socket.on("bot-update") driven' },
    { name: 'public/style.css',      icon: '🎨', desc: 'Sky Blue Glassmorphism — blurred cards, animated blobs, status badges' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white p-6 md:p-10">
      {/* Ambient blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">⛏️</div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-white to-sky-400 bg-clip-text text-transparent mb-2">
            Minecraft Bot Manager
          </h1>
          <p className="text-sky-300/70 text-lg">Real Mineflayer · Express · Socket.io</p>
        </div>

        {/* Alert banner */}
        <div className="bg-amber-500/15 border border-amber-400/30 rounded-2xl p-5 mb-8 flex gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <div className="font-bold text-amber-300 mb-1">This Vite build is just the setup guide</div>
            <div className="text-amber-200/80 text-sm">
              The <strong>real dashboard</strong> runs via <code className="bg-black/30 px-1 rounded">node server.js</code> on port 3000.
              All 5 files have been created in this project. Follow the steps below to launch.
            </div>
          </div>
        </div>

        {/* Live Dashboard Link */}
        <div className="bg-sky-500/15 border border-sky-400/30 rounded-2xl p-5 mb-8 text-center">
          <div className="text-3xl mb-2">🌐</div>
          <div className="font-bold text-sky-300 mb-1 text-lg">Real Dashboard URL</div>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold px-6 py-2 rounded-xl hover:opacity-90 transition mt-1"
          >
            http://localhost:3000 →
          </a>
          <div className="text-sky-300/60 text-xs mt-2">Only available after running <code>node server.js</code></div>
        </div>

        {/* Steps */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-sky-300 mb-5 uppercase tracking-wider text-sm">🚀 How to Launch</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Install dependencies', code: 'npm install' },
              { step: '2', title: 'Start the bot manager server', code: 'node server.js' },
              { step: '3', title: 'Open the real dashboard', code: 'open http://localhost:3000' },
            ].map(({ step, title, code }) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-sky-500/20 border border-sky-400/30 rounded-full flex items-center justify-center text-sky-300 font-bold text-sm flex-shrink-0 mt-1">
                  {step}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white/80 mb-1">{title}</div>
                  <CodeBlock code={code} label={step} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File list */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-bold text-sky-300 uppercase tracking-wider mb-5">📁 Created Files</h2>
          <div className="space-y-3">
            {files.map(f => (
              <div key={f.name} className="flex items-start gap-3 bg-white/5 border border-white/8 rounded-xl p-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="font-mono text-sky-300 font-semibold text-sm">{f.name}</div>
                  <div className="text-white/60 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture diagram */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6">
          <h2 className="text-sm font-bold text-sky-300 uppercase tracking-wider mb-4">🏗️ Architecture</h2>
          <div className="font-mono text-xs text-sky-300/80 leading-7">
            <div>Browser (dashboard.html)</div>
            <div className="pl-4 text-white/40">↕  socket.io  (add-bot / bot-update / bot-removed)</div>
            <div>server.js  [Express + Socket.io — port 3000]</div>
            <div className="pl-4 text-white/40">↕  createBot() / removeBot()</div>
            <div>botManager.js  [MinecraftBot class]</div>
            <div className="pl-4 text-white/40">↕  mineflayer (TCP)</div>
            <div>Minecraft Server  [your host:port]</div>
          </div>
        </div>

      </div>
    </div>
  );
}
