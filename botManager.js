/**
 * botManager.js — The Brain
 * Manages all Mineflayer bot instances and emits real-time data via Socket.io
 */

import mineflayer from 'mineflayer';

// Store all active bot instances keyed by botId
const activeBots = {};

/**
 * MinecraftBot class wraps a mineflayer bot instance
 * and wires up all real event listeners.
 */
class MinecraftBot {
  constructor({ id, username, host, port, version, io }) {
    this.id = id;
    this.username = username;
    this.host = host;
    this.port = parseInt(port) || 25565;
    this.version = version || '1.20.1';
    this.io = io;
    this.bot = null;
    this.moveInterval = null;
    this.status = 'connecting';
    this.health = 0;
    this.food = 0;
    this.position = { x: 0, y: 0, z: 0 };
    this.reconnectTimer = null;
    this.destroyed = false;

    this._connect();
  }

  _connect() {
    if (this.destroyed) return;

    console.log(`[BotManager] Connecting bot "${this.username}" → ${this.host}:${this.port}`);

    try {
      this.bot = mineflayer.createBot({
        host: this.host,
        port: this.port,
        username: this.username,
        version: this.version,
        auth: 'offline',
        hideErrors: false,
      });
    } catch (err) {
      console.error(`[BotManager] Failed to create bot "${this.username}":`, err.message);
      this._emitUpdate({ status: 'error', errorMsg: err.message });
      return;
    }

    // ── SPAWN: Bot is fully online ─────────────────────────────────────────
    this.bot.on('spawn', () => {
      console.log(`[BotManager] Bot "${this.username}" spawned on ${this.host}:${this.port}`);
      this.status = 'online';
      this.health = this.bot.health ?? 20;
      this.food   = this.bot.food   ?? 20;
      this.position = this.bot.entity?.position ?? { x: 0, y: 0, z: 0 };

      this._emitUpdate({ status: 'online' });
      this._startMovementLoop();
    });

    // ── HEALTH: Real health & food updates ────────────────────────────────
    this.bot.on('health', () => {
      this.health = this.bot.health ?? 0;
      this.food   = this.bot.food   ?? 0;
      this.position = this.bot.entity?.position ?? this.position;

      console.log(`[BotManager] "${this.username}" health=${this.health.toFixed(1)} food=${this.food}`);
      this._emitUpdate({ status: this.status });
    });

    // ── DEATH ──────────────────────────────────────────────────────────────
    this.bot.on('death', () => {
      console.log(`[BotManager] Bot "${this.username}" died — respawning…`);
      this.status = 'dead';
      this.health = 0;
      this._stopMovementLoop();
      this._emitUpdate({ status: 'dead' });

      // Mineflayer auto-respawns; movement loop restarts on next spawn
    });

    // ── KICKED ────────────────────────────────────────────────────────────
    this.bot.on('kicked', (reason) => {
      console.warn(`[BotManager] Bot "${this.username}" was kicked:`, reason);
      this.status = 'kicked';
      this._stopMovementLoop();
      this._emitUpdate({ status: 'kicked', errorMsg: reason });
      this._scheduleReconnect();
    });

    // ── ERROR ─────────────────────────────────────────────────────────────
    this.bot.on('error', (err) => {
      console.error(`[BotManager] Bot "${this.username}" error:`, err.message);
      this.status = 'error';
      this._stopMovementLoop();
      this._emitUpdate({ status: 'error', errorMsg: err.message });
      this._scheduleReconnect();
    });

    // ── END (disconnected) ────────────────────────────────────────────────
    this.bot.on('end', (reason) => {
      console.log(`[BotManager] Bot "${this.username}" disconnected. Reason: ${reason}`);
      if (this.status !== 'kicked' && this.status !== 'removed') {
        this.status = 'offline';
        this._stopMovementLoop();
        this._emitUpdate({ status: 'offline' });
        this._scheduleReconnect();
      }
    });

    // ── CHAT: relay server messages ───────────────────────────────────────
    this.bot.on('message', (jsonMsg) => {
      const text = jsonMsg.toString();
      this._emitUpdate({ status: this.status, chatMessage: text });
    });
  }

  // ── UNSTOPPABLE MOVEMENT LOOP ──────────────────────────────────────────────
  _startMovementLoop() {
    this._stopMovementLoop(); // clear any existing

    const move = () => {
      if (!this.bot || this.status !== 'online') return;

      try {
        // Random yaw (0–2π) and pitch (-π/4 to π/4)
        const yaw   = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * (Math.PI / 2);
        this.bot.look(yaw, pitch, false);

        // Randomly enable forward/back
        const goForward = Math.random() > 0.2;
        this.bot.setControlState('forward', goForward);
        this.bot.setControlState('back',    !goForward && Math.random() > 0.7);

        // Randomly strafe
        this.bot.setControlState('left',  Math.random() > 0.7);
        this.bot.setControlState('right', Math.random() > 0.7);

        // Random jump (30% chance)
        if (Math.random() > 0.7) {
          this.bot.setControlState('jump', true);
          setTimeout(() => {
            if (this.bot) this.bot.setControlState('jump', false);
          }, 400);
        }

        // Emit position update
        if (this.bot.entity) {
          this.position = this.bot.entity.position;
          this._emitUpdate({ status: this.status });
        }
      } catch (e) {
        // Silently swallow movement errors (bot may be mid-reconnect)
      }
    };

    // Run movement every 2 seconds
    this.moveInterval = setInterval(move, 2000);
  }

  _stopMovementLoop() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
    try {
      if (this.bot) {
        ['forward', 'back', 'left', 'right', 'jump', 'sprint'].forEach(ctrl => {
          this.bot.setControlState(ctrl, false);
        });
      }
    } catch (_) {}
  }

  // ── AUTO-RECONNECT ────────────────────────────────────────────────────────
  _scheduleReconnect() {
    if (this.destroyed) return;
    const delay = 10000; // 10 seconds
    console.log(`[BotManager] Scheduling reconnect for "${this.username}" in ${delay / 1000}s…`);
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        this.status = 'connecting';
        this._emitUpdate({ status: 'connecting' });
        this._connect();
      }
    }, delay);
  }

  // ── EMIT ──────────────────────────────────────────────────────────────────
  _emitUpdate(extra = {}) {
    const payload = {
      id:       this.id,
      username: this.username,
      host:     this.host,
      port:     this.port,
      health:   this.health,
      food:     this.food,
      position: {
        x: this.position?.x?.toFixed(1) ?? 0,
        y: this.position?.y?.toFixed(1) ?? 0,
        z: this.position?.z?.toFixed(1) ?? 0,
      },
      ...extra,
    };
    this.io.emit('bot-update', payload);
  }

  // ── DESTROY ───────────────────────────────────────────────────────────────
  destroy() {
    this.destroyed = true;
    this.status = 'removed';
    this._stopMovementLoop();
    clearTimeout(this.reconnectTimer);
    try { this.bot?.quit('Bot removed by manager'); } catch (_) {}
    this.bot = null;
  }
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

export function createBot({ id, username, host, port, version, io }) {
  if (activeBots[id]) {
    console.warn(`[BotManager] Bot "${id}" already exists — skipping.`);
    return;
  }
  const instance = new MinecraftBot({ id, username, host, port, version, io });
  activeBots[id] = instance;
}

export function removeBot(id, io) {
  const instance = activeBots[id];
  if (!instance) return;
  instance.destroy();
  delete activeBots[id];
  io.emit('bot-removed', { id });
}

export function getBotIds() {
  return Object.keys(activeBots);
}
