// Simple WebSocket multiplayer server for vetcongweb
// Run: node server.js
// Requires: npm install ws

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const players = new Map();

wss.on('connection', (ws) => {
  let id = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'join') {
        id = msg.id;
        players.set(id, { id, pos: [0, 1.6, 0], rot: 0 });
        broadcastPlayers();
      } else if (msg.type === 'update' && id) {
        const p = players.get(id);
        if (p) {
          p.pos = msg.pos;
          p.rot = msg.rot || 0;
        }
        broadcastPlayers();
      } else if (msg.type === 'shoot') {
        // optional: broadcast muzzle or hit events
        broadcast({ type: 'shoot', id, pos: msg.pos });
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    if (id) {
      players.delete(id);
      broadcast({ type: 'leave', id });
    }
  });
});

function broadcastPlayers() {
  const list = Array.from(players.values());
  broadcast({ type: 'players', players: list });
}

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

console.log('vetcongweb multiplayer server on ws://localhost:8080');
