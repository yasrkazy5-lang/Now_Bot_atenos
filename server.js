/**
 * server.js — The Bridge
 * Express + Socket.io server that connects the dashboard UI
 * to live Mineflayer bot instances via botManager.js
 */

import express    from 'express';
import http       from 'http';
import { Server } from 'socket.io';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { v4 as uuidv4 }   from 'uuid';

import { createBot, removeBot } from './botManager.js';

// ── Setup ──────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT       = process.env.PORT || 3000;
const BOTS_FILE  = join(__dirname, 'bots.json');
const PUBLIC_DIR = join(__dirname, 'public');

// ── Serve static dashboard ─────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

// Fallback: serve dashboard.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(join(PUBLIC_DIR, 'dashboard.html'));
});

// ── bots.json persistence helpers ─────────────────────────────────────────
function loadBotsFromDisk() {
  if (!existsSync(BOTS_FILE)) return [];
  try {
    const raw = readFileSync(BOTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBotsToDisk(bots) {
  try {
    writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to write bots.json:', err.message);
  }
}

// ── Restore persisted bots on startup ─────────────────────────────────────
const persistedBots = loadBotsFromDisk();
if (persistedBots.length) {
  console.log(`[Server] Restoring ${persistedBots.length} bot(s) from bots.json…`);
  persistedBots.forEach(botData => {
    createBot({ ...botData, io });
  });
}

// ── Socket.io events ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Server] Client connected: ${socket.id}`);

  // Send current persisted bot list so the UI can rebuild on reconnect
  socket.emit('bot-list', loadBotsFromDisk());

  // ── ADD BOT ──────────────────────────────────────────────────────────────
  socket.on('add-bot', (data) => {
    const { username, host, port, version } = data;

    if (!username || !host) {
      socket.emit('error-msg', { message: 'username and host are required.' });
      return;
    }

    const id = uuidv4();
    const botData = {
      id,
      username: username.trim(),
      host:     host.trim(),
      port:     parseInt(port) || 25565,
      version:  version?.trim() || '1.20.1',
    };

    console.log(`[Server] add-bot → ${JSON.stringify(botData)}`);

    // Save to disk so bots survive a server restart
    const existing = loadBotsFromDisk();
    existing.push(botData);
    saveBotsToDisk(existing);

    // Create the live bot instance (will emit 'bot-update' events itself)
    createBot({ ...botData, io });

    // Acknowledge creation to all clients
    io.emit('bot-added', botData);
  });

  // ── REMOVE BOT ───────────────────────────────────────────────────────────
  socket.on('remove-bot', ({ id }) => {
    if (!id) return;
    console.log(`[Server] remove-bot → ${id}`);

    removeBot(id, io);

    // Remove from bots.json
    const existing = loadBotsFromDisk().filter(b => b.id !== id);
    saveBotsToDisk(existing);
  });

  // ── DISCONNECT ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Server] Client disconnected: ${socket.id}`);
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🟢  Minecraft Bot Manager running at http://localhost:${PORT}\n`);
});
